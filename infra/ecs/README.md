# Deploying to ECS on EC2

One `t4g.small` (arm64 / Graviton) in `us-west-2` runs the whole backend as a
single ECS task of four containers:

| Container | Hard cap | Role |
|---|---|---|
| `backend` | 768 MiB | Spring Boot, port 8080 |
| `nakama` | 384 MiB | sessions, leaderboards, chat |
| `postgres` | 320 MiB | Nakama's store only |
| `cloudflared` | 96 MiB | the only path in from the internet |

MongoDB is external (Atlas M0, same region). The frontend is on Vercel.

## Why it looks like this

**No load balancer.** An ALB is $16.43/month, more than the instance. Traffic
arrives through a Cloudflare Tunnel instead, which also terminates TLS.

**No inbound ports — not even 22.** `cloudflared` dials *out* to Cloudflare, so
the security group has zero ingress rules and the instance is never addressed
directly. Shell access is through SSM Session Manager:

```bash
aws ssm start-session --target <instance-id> --profile personal
```

**`host` networking, not `awsvpc`.** In `awsvpc` the task gets its own ENI with
no public IP, so outbound to Atlas and Cloudflare would need a NAT gateway
(~$32/month — more than everything else combined). On `host`, containers share
the instance's network and reach each other on `localhost`.

**No private subnet**, for the same reason.

**An Elastic IP.** Atlas M0 has no PrivateLink, so access is controlled by an IP
allow list. An auto-assigned public IP changes when the ASG replaces the
instance, silently breaking the database. A public IPv4 is billed either way, so
pinning one is free in practice. The instance associates it to itself at boot.

**Everything is arm64.** Nakama only publishes arm64 images from **3.26.0**
onward; older tags are amd64-only and will not run here. Build the backend on
Apple Silicon (native arm64) or with `docker buildx --platform linux/arm64` on
an x86 CI runner.

## One-time setup

```bash
export AWS_PROFILE=personal AWS_REGION=us-west-2

# Registry
aws ecr create-repository --repository-name hand-of-fate/backend \
  --image-scanning-configuration scanOnPush=true

# Secrets. Generate them; do not paste real values into a shell that records
# history. Each is read at task start by the execution role, never baked in.
aws ssm put-parameter --name /hand-of-fate/mongodb-uri        --type SecureString --value '...'
aws ssm put-parameter --name /hand-of-fate/postgres-password  --type SecureString --value '...'
aws ssm put-parameter --name /hand-of-fate/nakama-server-key  --type SecureString --value '...'
aws ssm put-parameter --name /hand-of-fate/cloudflared-token  --type SecureString --value '...'
```

The tunnel token comes from Cloudflare → Zero Trust → Networks → Tunnels. Point
the tunnel's public hostname at `http://localhost:8080`.

## Build and push

```bash
cd backend
docker build --platform linux/arm64 -t hand-of-fate-backend .
aws ecr get-login-password | docker login --username AWS --password-stdin \
  "$(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-west-2.amazonaws.com"
docker tag hand-of-fate-backend:latest <account>.dkr.ecr.us-west-2.amazonaws.com/hand-of-fate/backend:latest
docker push <account>.dkr.ecr.us-west-2.amazonaws.com/hand-of-fate/backend:latest
```

## Deploy

```bash
aws cloudformation deploy \
  --template-file infra/ecs/cloudformation.yml \
  --stack-name hand-of-fate \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
      VpcId=vpc-xxxxxxxx \
      SubnetId=subnet-xxxxxxxx \
      BackendImage=<account>.dkr.ecr.us-west-2.amazonaws.com/hand-of-fate/backend:latest
```

Then add the stack's `EgressIp` output to the Atlas IP access list:

```bash
atlas accessLists create "$(aws cloudformation describe-stacks --stack-name hand-of-fate \
  --query 'Stacks[0].Outputs[?OutputKey==`EgressIp`].OutputValue' --output text)" \
  --type ipAddress --comment "ecs instance"
```

## Redeploying the app

Push a new image, then force a new deployment:

```bash
aws ecs update-service --cluster hand-of-fate --service hand-of-fate --force-new-deployment
```

There is one instance and the task uses host networking, so two copies cannot
run at once. The service is set to `MinimumHealthyPercent: 0` — a deploy takes
the site down for roughly the container start time rather than deadlocking.

## Watching it

```bash
aws logs tail /ecs/hand-of-fate --follow
aws ecs describe-services --cluster hand-of-fate --services hand-of-fate \
  --query 'services[0].{running:runningCount,desired:desiredCount,status:status}'
```

Log retention is 7 days, which keeps CloudWatch inside the free tier. The task
also sets `LOGGING_LEVEL_ORG_SPRINGFRAMEWORK_WEB=INFO`, overriding the `DEBUG`
baked into `application.properties` — at DEBUG this app can push several GB a
month.

## Running cost

Roughly **$19/month** once the t4g free trial lapses on 2026-12-31; about
**$6–7** until then.

| | |
|---|---|
| t4g.small on demand | $12.26 |
| 30 GiB gp3 | $2.40 |
| public IPv4 | $3.65 |
| ECR, CloudWatch | ~$0.10–2 |
| ECS control plane, Atlas M0, Vercel, Cloudflare | $0 |
