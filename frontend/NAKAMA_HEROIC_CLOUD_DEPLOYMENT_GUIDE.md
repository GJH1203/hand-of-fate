# Comprehensive Guide: Deploying Nakama on Heroic Cloud for Your Card Game

## Table of Contents
1. [Introduction](#introduction)
2. [Account Setup Process](#account-setup-process)
3. [Creating a New Nakama Project](#creating-a-new-nakama-project)
4. [Configuration Options and Recommendations](#configuration-options-and-recommendations)
5. [Getting Connection Details](#getting-connection-details)
6. [Custom Match Handlers Deployment](#custom-match-handlers-deployment)
7. [Cost Considerations](#cost-considerations)
8. [Testing the Deployment](#testing-the-deployment)

## Introduction

Heroic Cloud is the managed cloud offering from Heroic Labs that provides production-ready Nakama game servers with enterprise features, automatic scaling, monitoring, and simplified deployment. This guide will walk you through deploying your card game's Nakama server on Heroic Cloud.

### Key Benefits of Heroic Cloud
- **Managed Infrastructure**: Automated setup of Nakama instances, databases, load balancers, and DNS
- **Enterprise Features**: Includes Nakama Enterprise licenses
- **Global Availability**: Deploy to AWS or GCP in North America, Europe, and Asia
- **Automatic Scaling**: Scale from a few servers to dozens within minutes
- **Built-in Security**: SSL-enabled load balancers by default
- **Automated Backups**: Scheduled database backups for easy rollback

## Account Setup Process

### Step 1: Create a Heroic Labs Account

1. Visit [https://heroiclabs.com/heroic-cloud/](https://heroiclabs.com/heroic-cloud/)
2. Click on "Get Started" or "Sign Up"
3. Fill in your organization details:
   - Company name
   - Email address
   - Password
   - Team size
   - Expected player base

### Step 2: Choose Your Cloud Provider

Heroic Cloud is available on:
- **AWS Marketplace**: [AWS Marketplace Listing](https://aws.amazon.com/marketplace/pp/prodview-zfxkalyjehlh2)
- **GCP Marketplace**: Available as of June 2024

Select your preferred cloud provider based on:
- Your existing cloud infrastructure
- Regional availability requirements
- Billing preferences

### Step 3: Organization Setup

1. **Create Your Organization**
   - Organization name (e.g., "YourGameStudio")
   - Billing information
   - Team member invitations

2. **Set Up Access Control**
   - Define team roles (Admin, Developer, Observer)
   - Configure two-factor authentication (recommended)
   - Set up API keys for CI/CD integration

## Creating a New Nakama Project

### Step 1: Project Initialization

1. **Navigate to Projects Dashboard**
   - Log in to Heroic Cloud console
   - Click "Create New Project"

2. **Project Configuration**
   ```yaml
   Project Name: your-card-game-prod
   Environment: Production
   Region: us-east-1 (or your preferred region)
   Nakama Version: Latest stable (e.g., 3.x.x)
   ```

### Step 2: Select Hardware Resources

Choose your initial deployment size based on expected load:

#### Development Tier
- **CPU**: Burstable 2 vCPUs
- **Memory**: 4GB RAM
- **Database**: Micro CockroachDB instance
- **Cost**: Starting at ~$150/month
- **Suitable for**: Development, testing, small beta

#### Production Starter
- **CPU**: 4 dedicated vCPUs
- **Memory**: 8GB RAM
- **Database**: Small CockroachDB cluster
- **Cost**: Starting at ~$600/month
- **Suitable for**: Soft launch, up to 10k CCU

#### Production Standard
- **CPU**: 8 dedicated vCPUs
- **Memory**: 16GB RAM
- **Database**: Standard CockroachDB cluster
- **Cost**: ~$1,200/month
- **Suitable for**: 10k-50k CCU

### Step 3: Configure Deployment Zone

Select deployment zone based on your primary player base:
- **North America**: us-east-1, us-west-2
- **Europe**: eu-west-1, eu-central-1
- **Asia**: ap-southeast-1, ap-northeast-1

## Configuration Options and Recommendations

### Essential Configuration

1. **Authentication Settings**
   ```yaml
   session:
     token_expiry_sec: 604800  # 7 days for card games
     refresh_token_expiry_sec: 2592000  # 30 days
   
   socket:
     server_key: "your-generated-server-key"
     max_message_size_bytes: 4096  # Adequate for card game messages
     max_request_size_bytes: 16384
   ```

2. **Match Configuration**
   ```yaml
   match:
     max_size: 4  # For 4-player card games
     label_update_interval_ms: 1000
     
   matchmaker:
     max_tickets: 100
     interval_sec: 1
     max_intervals: 30
   ```

3. **Storage Settings**
   ```yaml
   storage:
     enable_compression: true
     read_max_size_bytes: 1048576  # 1MB
     write_max_size_bytes: 1048576  # 1MB
   ```

### Recommended Features to Enable

1. **Leaderboards**
   ```yaml
   leaderboard:
     blacklist_rank_cache:
       size: 10000
       ttl_sec: 300
   ```

2. **Notifications**
   ```yaml
   notification:
     batch_send_size: 100
     batch_send_interval_ms: 1000
   ```

3. **Security**
   ```yaml
   runtime:
     http_key: "your-http-key"
     
   console:
     username: "admin"
     password: "secure-password-here"
   ```

## Getting Connection Details

### Step 1: Access Project Dashboard

1. Navigate to your project in Heroic Cloud console
2. Click on "Connection Details" tab

### Step 2: Retrieve Connection Information

You'll find the following details:

```javascript
// Example connection details
const connectionConfig = {
  host: "your-project-id.heroic-cloud.com",
  port: 7350,  // Default HTTP port
  useSSL: true,
  serverKey: "defaultkey",  // Replace with your actual server key
  
  // WebSocket connection
  wsHost: "wss://your-project-id.heroic-cloud.com",
  wsPort: 7350,
  
  // gRPC connection (if needed)
  grpcHost: "your-project-id.heroic-cloud.com",
  grpcPort: 7349
};
```

### Step 3: Client Configuration

Update your Unity/JavaScript client:

```csharp
// Unity C# Example
var client = new Client("https", "your-project-id.heroic-cloud.com", 7350, "your-server-key");
client.Timeout = 30;

// JavaScript Example
const client = new Client("your-server-key", "your-project-id.heroic-cloud.com", "7350", true);
```

## Custom Match Handlers Deployment

### Step 1: Set Up Development Environment

1. **Clone Nakama Project Template**
   ```bash
   git clone https://github.com/heroiclabs/nakama-project-template.git
   cd nakama-project-template
   ```

2. **Install Dependencies**
   ```bash
   npm install
   npm install -D typescript @types/node
   npm install -D nakama-runtime
   ```

### Step 2: Create Card Game Match Handler

Create `src/match_handler.ts`:

```typescript
const matchInit: nkruntime.MatchInitFunction = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, params: {[key: string]: string}) {
    const state: GameState = {
        players: {},
        deck: shuffleDeck(createDeck()),
        currentTurn: 0,
        gamePhase: "waiting",
        turnOrder: []
    };
    
    return {
        state,
        tickRate: 5, // 5 ticks per second for card games
        label: JSON.stringify({
            open: true,
            maxPlayers: 4
        })
    };
};

const matchJoinAttempt: nkruntime.MatchJoinAttemptFunction = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: nkruntime.MatchState, presence: nkruntime.Presence, metadata: {[key: string]: any}) {
    const gameState = state as GameState;
    
    // Check if game is full
    if (Object.keys(gameState.players).length >= 4) {
        return false;
    }
    
    // Check if game already started
    if (gameState.gamePhase !== "waiting") {
        return false;
    }
    
    return true;
};

const matchJoin: nkruntime.MatchJoinFunction = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: nkruntime.MatchState, presences: nkruntime.Presence[]) {
    const gameState = state as GameState;
    
    presences.forEach(presence => {
        gameState.players[presence.userId] = {
            userId: presence.userId,
            username: presence.username,
            hand: [],
            score: 0,
            connected: true
        };
        
        // Deal initial cards
        for (let i = 0; i < 7; i++) {
            const card = gameState.deck.pop();
            if (card) {
                gameState.players[presence.userId].hand.push(card);
            }
        }
    });
    
    // Start game if we have enough players
    if (Object.keys(gameState.players).length >= 2) {
        gameState.gamePhase = "playing";
        gameState.turnOrder = Object.keys(gameState.players);
        
        // Notify all players game started
        dispatcher.broadcastMessage(1, JSON.stringify({
            type: "game_started",
            players: Object.values(gameState.players).map(p => ({
                userId: p.userId,
                username: p.username
            })),
            currentTurn: gameState.turnOrder[0]
        }));
    }
    
    return { state: gameState };
};

const matchLoop: nkruntime.MatchLoopFunction = function (ctx: nkruntime.Context, logger: nkruntime.Logger, nk: nkruntime.Nakama, dispatcher: nkruntime.MatchDispatcher, tick: number, state: nkruntime.MatchState, messages: nkruntime.MatchMessage[]) {
    const gameState = state as GameState;
    
    // Process player messages
    messages.forEach(message => {
        const data = JSON.parse(nk.binaryToString(message.data));
        
        switch (data.type) {
            case "play_card":
                handlePlayCard(gameState, message.userId, data.cardId, dispatcher);
                break;
            case "draw_card":
                handleDrawCard(gameState, message.userId, dispatcher);
                break;
        }
    });
    
    return { state: gameState };
};

// Register the match handler
initializer.registerMatch("card_game", {
    matchInit,
    matchJoinAttempt,
    matchJoin,
    matchLeave,
    matchLoop,
    matchSignal,
    matchTerminate
});
```

### Step 3: Build and Deploy

1. **Configure Builder in Heroic Cloud**
   - Go to "Builders" section
   - Click "Create New Builder"
   - Connect your GitHub/GitLab repository
   - Select branch (e.g., `main`)

2. **Build Configuration**
   ```yaml
   build:
     type: typescript
     entry: src/index.ts
     output: build/index.js
   ```

3. **Trigger Build**
   - Select commit SHA
   - Click "Build"
   - Wait for Docker image creation

4. **Deploy to Project**
   - Go to your project
   - Select "Deployments"
   - Choose your build
   - Click "Deploy"

## Cost Considerations

### Heroic Cloud Pricing Structure

1. **Development Environment**
   - **Cost**: ~$150-300/month
   - **Includes**: Burstable CPU, small database, basic monitoring
   - **Best for**: Development, testing, small beta

2. **Production Starter**
   - **Cost**: ~$600/month minimum
   - **Includes**: Dedicated resources, enterprise features, SSL
   - **Best for**: Soft launch, up to 10k CCU

3. **Production Scale**
   - **Cost**: $1,200-5,000+/month
   - **Includes**: Multi-node cluster, advanced monitoring, priority support
   - **Best for**: 10k+ CCU, live games

### Cost Optimization Tips

1. **Start Small**: Begin with development tier and scale up
2. **Regional Deployment**: Choose regions close to players to reduce latency costs
3. **Efficient Match Handlers**: Optimize code to reduce CPU usage
4. **Database Optimization**: Use proper indexes and query optimization
5. **Monitoring**: Use built-in monitoring to identify resource waste

### Alternative for Budget-Conscious Development

For development or small indie games, consider self-hosting:
- **Digital Ocean Droplet**: ~$10-40/month
- **AWS EC2 t3.small**: ~$15-30/month
- **Google Cloud e2-micro**: ~$10-25/month

Note: Self-hosting requires more technical expertise and maintenance.

## Testing the Deployment

### Step 1: Health Check

```bash
# Test HTTP API endpoint
curl https://your-project-id.heroic-cloud.com/v2/healthcheck

# Expected response
{"success": true}
```

### Step 2: Authentication Test

```bash
# Test device authentication
curl -X POST "https://your-project-id.heroic-cloud.com/v2/account/authenticate/device?create=true" \
  -H "Authorization: Basic base64(serverkey:)" \
  -H "Content-Type: application/json" \
  -d '{"id": "test-device-id"}'
```

### Step 3: WebSocket Connection Test

```javascript
// JavaScript test client
const client = new Client("your-server-key", "your-project-id.heroic-cloud.com", "7350", true);

async function testConnection() {
    try {
        // Authenticate
        const session = await client.authenticateDevice("test-device-" + Date.now());
        console.log("Authenticated:", session.user_id);
        
        // Create socket
        const socket = client.createSocket();
        
        socket.onmatchdata = (matchData) => {
            console.log("Match data received:", matchData);
        };
        
        await socket.connect(session);
        console.log("Socket connected");
        
        // Join or create match
        const match = await socket.createMatch("card_game");
        console.log("Match created:", match.match_id);
        
    } catch (error) {
        console.error("Test failed:", error);
    }
}

testConnection();
```

### Step 4: Load Testing

1. **Use Nakama Load Testing Tools**
   ```bash
   # Install k6
   brew install k6
   
   # Run load test
   k6 run --vus 100 --duration 30s load-test.js
   ```

2. **Monitor in Heroic Cloud Dashboard**
   - CPU usage
   - Memory usage
   - Request latency
   - Error rates

### Step 5: Production Checklist

- [ ] SSL certificates properly configured
- [ ] Server keys changed from defaults
- [ ] Console access secured
- [ ] Monitoring alerts configured
- [ ] Backup schedule verified
- [ ] Match handler error handling tested
- [ ] Client reconnection logic implemented
- [ ] Rate limiting configured
- [ ] Database indexes optimized

## Troubleshooting Common Issues

### Connection Issues
- Verify firewall rules allow ports 7349-7350
- Check SSL certificate validity
- Ensure correct server key in client

### Performance Issues
- Review match handler efficiency
- Check database query performance
- Monitor CPU/memory usage
- Consider scaling up resources

### Deployment Failures
- Check build logs for compilation errors
- Verify TypeScript configuration
- Ensure all dependencies are included
- Check Docker image size limits

## Support Resources

- **Documentation**: https://heroiclabs.com/docs/
- **Forums**: https://forum.heroiclabs.com/
- **Support Email**: support@heroiclabs.com
- **Discord Community**: Join for real-time help

## Next Steps

1. **Implement Game Logic**: Complete your match handlers
2. **Add Social Features**: Friends, clans, chat
3. **Implement Monetization**: In-app purchases, battle passes
4. **Set Up Analytics**: Track player behavior
5. **Plan for Scale**: Monitor usage and scale accordingly

Remember to thoroughly test your deployment in a development environment before moving to production!