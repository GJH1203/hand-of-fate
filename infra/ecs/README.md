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
      BackendImage=<account>.dkr.ecr.us-west-2.amazonaws.com/hand-of-fate/backend:latest \
      SupabaseJwksUri=https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json \
      SupabaseJwtIssuer=https://<project-ref>.supabase.co/auth/v1 \
      DataVolumeAvailabilityZone=us-west-2a
```

`DataVolumeAvailabilityZone` has to be the zone `SubnetId` sits in — an EBS volume
only attaches within its own zone. Check it with:

```bash
aws ec2 describe-subnets --subnet-ids <subnet> --query 'Subnets[0].AvailabilityZone'
```

The two Supabase values are not secrets and so are stack parameters rather than
SSM entries: the project signs session tokens with an asymmetric key and
publishes the public half at that JWKS address. The backend fetches it and
verifies every request against it, and refuses to start without it — a service
that cannot check a token should not be answering.

`AdminSupabaseUserIds` is the comma-separated list of Supabase user ids allowed
to reach `/admin/**`. It defaults to empty, which means nobody is an admin and
those endpoints answer 403 to every caller. Add your own id when you need them:

```bash
aws cloudformation deploy ... --parameter-overrides AdminSupabaseUserIds=<your-supabase-user-id>
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

The `Deploy backend` GitHub Actions workflow does the same three steps — build
arm64, push to ECR, roll the service — but only when you run it by hand, and
only once an OIDC role ARN is in the `AWS_DEPLOY_ROLE_ARN` secret. It is manual
on purpose: see below.

### Backups

Atlas M0 has no backups and no setting to turn them on, so the player data had no
recovery path at all. A scheduled ECS task now runs `mongodump` every night and
streams the archive straight into S3 — nothing is written to the instance's disk on
the way through.

It runs on the existing instance on purpose: Atlas restricts access by IP and that
instance's elastic IP is already on the list, which a GitHub Actions runner's
address never would be.

Build and push the image, then point the stack at it:

```bash
cd infra/backup
docker build --platform linux/arm64 -t hand-of-fate-backup .
docker tag hand-of-fate-backup:latest <account>.dkr.ecr.us-west-2.amazonaws.com/hand-of-fate/backup:latest
docker push <account>.dkr.ecr.us-west-2.amazonaws.com/hand-of-fate/backup:latest

aws cloudformation deploy ... --parameter-overrides \
  BackupImage=<account>.dkr.ecr.us-west-2.amazonaws.com/hand-of-fate/backup:latest
```

`BackupImage` is empty by default and every backup resource is conditional on it,
so a stack without the image deploys as before. The ECR repository needs creating
once: `aws ecr create-repository --repository-name hand-of-fate/backup`.

Archives land at `s3://hand-of-fate-backups-<account>/mongodb/YYYY/MM/DD/`, expire
after `BackupRetentionDays` (30 by default), and the bucket is `Retain` so a stack
teardown does not take the backups with it.

Restoring, given an archive key:

```bash
aws s3 cp s3://hand-of-fate-backups-<account>/mongodb/2026/08/16/card_game-....archive.gz - \
  | mongorestore --uri="<atlas-uri-without-a-database>" --archive --gzip \
      --nsFrom='card_game.*' --nsTo='card_game_restored.*'
```

Restore beside the live database rather than over it, and swap once you have looked
at what came back. Note the URI must not name a database — mongorestore scopes
itself to it and the namespace remapping then silently restores nothing.

### The data volume

Nakama's Postgres lives on an EBS volume separate from the instance, mounted at
`/var/lib/hand-of-fate`. It used to sit on the root volume, which the auto scaling
group discards when it replaces the instance — so the mechanism that keeps the
service alive was also the one that destroyed its data.

The volume is `Retain` on both delete and replace: losing accounts and leaderboards
to a `cloudformation delete` would be worse than leaving a volume behind. If you
tear the stack down, delete it by hand once you are sure.

The instance claims the volume in user data, the same way it claims the elastic IP,
and refuses to start ECS if the mount is not there — an instance running tasks
without it would quietly start a fresh Postgres on the root disk and look healthy
while doing it.

**Deploying this does not move existing data.** Changing the launch template leaves
the running instance alone; the volume is only picked up by the next instance, and
whatever was on the old root disk goes with it. Terminate the instance when you are
ready to take that loss:

```bash
aws ec2 terminate-instances --instance-ids <id>   # the ASG brings back a replacement
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
