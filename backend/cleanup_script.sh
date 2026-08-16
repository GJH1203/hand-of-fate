#!/bin/bash

echo "🧹 Cleaning up all player data..."

# 1. Clean MongoDB
echo "📊 Cleaning MongoDB collections..."
mongosh cardgame --eval "
db.players.deleteMany({});
db.deck.deleteMany({});
db.games.deleteMany({});
db.gameResults.deleteMany({});
db.gameScores.deleteMany({});
print('✅ MongoDB cleanup complete');
print('Players remaining: ' + db.players.countDocuments());
print('Decks remaining: ' + db.deck.countDocuments());
"

# 2. Restart Nakama to clear in-memory data
echo "🔄 Restarting Nakama..."
docker-compose -f local-dev-cardgame/docker-compose.yml restart nakama

echo "✅ Cleanup complete!"
echo "💡 For Nakama console cleanup:"
echo "   1. Go to http://localhost:7351"
echo "   2. Login (admin/password)" 
echo "   3. Delete users manually in Users section"
echo ""
echo "🚀 Ready to create fresh test players!"