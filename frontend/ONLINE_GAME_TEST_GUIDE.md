# Online Game Frontend Test Guide

This guide will walk you through manually testing the online game functionality in the frontend.

## Prerequisites
1. Backend server running on http://localhost:8080
2. Frontend dev server running on http://localhost:3001
3. Two browser windows/tabs

## Test Steps

### 1. Login Phase
**Browser 1 (Player 1):**
- Navigate to http://localhost:3001
- Enter username: `Jiahe3`
- Click "Start Game"
- You should be redirected to the game menu

**Browser 2 (Player 2):**
- Navigate to http://localhost:3001
- Enter username: `Jiahe4`
- Click "Start Game"
- You should be redirected to the game menu

### 2. Create and Join Match
**Browser 1 (Player 1):**
- Click "Create Online Game"
- You should see a lobby screen with a 6-character room code (e.g., "A1B2C3")
- Wait for the other player to join

**Browser 2 (Player 2):**
- Click "Join with Code"
- Enter the room code from Browser 1
- Click "Join"
- Both players should now see the game board

### 3. Game Play
The game should work as follows:
- Players take turns (indicated by "Your Turn" badge)
- Current player can:
  - Select a card from their hand
  - Click on a highlighted (green) cell to place it
  - Click "Pass Turn" if no valid moves
  - Click "Request Win" when out of cards

**Expected Game Flow:**
1. First player places cards on empty board (any position valid)
2. Subsequent cards must be placed adjacent to existing cards
3. Players alternate turns
4. When a player runs out of cards, they can request a win
5. Opponent can accept or reject the win request
6. Game ends when win is accepted or both agree to end

### 4. Things to Verify

✅ **Connection Status:**
- Green WiFi icon shows "Connected"
- Red WiFi icon shows "Disconnected"

✅ **Turn Management:**
- Only current player can make moves
- Turn switches after each action
- Other player's actions appear in real-time

✅ **Game State Sync:**
- Cards appear on both screens simultaneously
- Scores update for both players
- Hand size decreases as cards are played

✅ **End Game:**
- Winner/Tie message appears
- "Back to Menu" button works
- Players can start a new game

### 5. Common Issues and Solutions

**Issue: "Failed to join match"**
- Solution: Make sure you entered the correct room code
- Try refreshing and creating a new match

**Issue: Game doesn't update**
- Solution: Check WebSocket connection (WiFi icon)
- Refresh the page if disconnected

**Issue: Can't place cards**
- Solution: Make sure it's your turn
- Select a card first, then click a green cell
- First move can be anywhere, subsequent moves must be adjacent

## Automated Test Results

Based on the backend tests, the online game flow has been verified to work with:
- ✅ Match creation and room codes
- ✅ Player joining with proper game initialization
- ✅ Turn-based gameplay
- ✅ Card placement validation
- ✅ Pass functionality
- ✅ Win request/response flow
- ✅ Game completion with winner/tie detection

The frontend has been updated to match this exact flow, using the same REST endpoints and WebSocket messages as the backend tests.