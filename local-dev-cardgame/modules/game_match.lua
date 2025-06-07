-- Card Game Match Handler for Nakama
local nk = require("nakama")

-- Match states
local MATCH_STATE = {
    WAITING = "WAITING",
    IN_PROGRESS = "IN_PROGRESS",
    COMPLETED = "COMPLETED"
}

-- Message opcodes
local OP_CODES = {
    JOIN_SUCCESS = 1,
    GAME_STATE_UPDATE = 2,
    PLAYER_ACTION = 3,
    PLAYER_DISCONNECTED = 4,
    PLAYER_RECONNECTED = 5,
    GAME_ERROR = 6,
    MATCH_START = 7,
    TURN_UPDATE = 8,
    GAME_END = 9
}

-- Initialize match
local function match_init(context, setupstate)
    local gamestate = {
        players = {},
        match_id = context.match_id,
        status = MATCH_STATE.WAITING,
        game_data = nil,
        created_at = os.time(),
        max_players = 2
    }
    
    local tickrate = 1 -- 1 tick per second
    local label = setupstate.label or ""
    
    return gamestate, tickrate, label
end

-- Handle join attempts
local function match_join_attempt(context, dispatcher, tick, state, presence, metadata)
    -- Check if match is full
    if #state.players >= state.max_players then
        return nil, false, "Match is full"
    end
    
    -- Check if match already started
    if state.status ~= MATCH_STATE.WAITING then
        return nil, false, "Match already in progress"
    end
    
    -- Accept the join
    return state, true
end

-- Handle player join
local function match_join(context, dispatcher, tick, state, presences)
    for _, presence in ipairs(presences) do
        -- Add player to match
        table.insert(state.players, {
            user_id = presence.user_id,
            username = presence.username,
            session_id = presence.session_id,
            node = presence.node
        })
        
        -- Notify all players
        local join_msg = {
            opcode = OP_CODES.JOIN_SUCCESS,
            player_count = #state.players,
            players = state.players
        }
        
        dispatcher.broadcast_message(OP_CODES.JOIN_SUCCESS, nk.json_encode(join_msg))
        
        -- If we have 2 players, start the match
        if #state.players == state.max_players then
            state.status = MATCH_STATE.IN_PROGRESS
            
            -- Notify backend to create game
            local start_msg = {
                opcode = OP_CODES.MATCH_START,
                player1_id = state.players[1].user_id,
                player2_id = state.players[2].user_id,
                match_id = context.match_id
            }
            
            dispatcher.broadcast_message(OP_CODES.MATCH_START, nk.json_encode(start_msg))
        end
    end
    
    return state
end

-- Handle player leave
local function match_leave(context, dispatcher, tick, state, presences)
    for _, presence in ipairs(presences) do
        -- Find and remove player
        for i, player in ipairs(state.players) do
            if player.user_id == presence.user_id then
                table.remove(state.players, i)
                
                -- Notify remaining players
                local leave_msg = {
                    opcode = OP_CODES.PLAYER_DISCONNECTED,
                    player_id = presence.user_id,
                    remaining_players = #state.players
                }
                
                dispatcher.broadcast_message(OP_CODES.PLAYER_DISCONNECTED, nk.json_encode(leave_msg))
                
                -- If match was in progress, pause it
                if state.status == MATCH_STATE.IN_PROGRESS then
                    -- Keep match alive for reconnection
                    -- Don't end the match immediately
                end
                
                break
            end
        end
    end
    
    -- End match if no players left
    if #state.players == 0 then
        return nil
    end
    
    return state
end

-- Handle match loop (tick)
local function match_loop(context, dispatcher, tick, state, messages)
    -- Process incoming messages
    for _, message in ipairs(messages) do
        local decoded = nk.json_decode(message.data)
        
        if decoded.opcode == OP_CODES.PLAYER_ACTION then
            -- Validate the action is from a player in the match
            local is_valid_player = false
            for _, player in ipairs(state.players) do
                if player.user_id == message.sender.user_id then
                    is_valid_player = true
                    break
                end
            end
            
            if is_valid_player then
                -- Broadcast the action to all players
                dispatcher.broadcast_message(OP_CODES.PLAYER_ACTION, message.data)
                
                -- Update game state if needed
                if decoded.action_type == "GAME_END" then
                    state.status = MATCH_STATE.COMPLETED
                    
                    -- Send game end notification
                    local end_msg = {
                        opcode = OP_CODES.GAME_END,
                        winner_id = decoded.winner_id,
                        final_scores = decoded.scores
                    }
                    dispatcher.broadcast_message(OP_CODES.GAME_END, nk.json_encode(end_msg))
                    
                    -- End match after a delay
                    return nil
                end
            else
                -- Send error to sender
                local error_msg = {
                    opcode = OP_CODES.GAME_ERROR,
                    error = "Unauthorized action"
                }
                dispatcher.send_message(message.sender, OP_CODES.GAME_ERROR, nk.json_encode(error_msg))
            end
            
        elseif decoded.opcode == OP_CODES.GAME_STATE_UPDATE then
            -- Handle game state updates from backend
            state.game_data = decoded.game_state
            
            -- Broadcast to all players
            dispatcher.broadcast_message(OP_CODES.GAME_STATE_UPDATE, message.data)
        end
    end
    
    return state
end

-- Handle match termination
local function match_terminate(context, dispatcher, tick, state, grace_seconds)
    -- Clean up match data
    local terminate_msg = {
        opcode = OP_CODES.GAME_END,
        reason = "Match terminated"
    }
    
    dispatcher.broadcast_message(OP_CODES.GAME_END, nk.json_encode(terminate_msg))
    
    return nil
end

-- Handle match signal
local function match_signal(context, dispatcher, tick, state, data)
    -- Handle administrative signals
    return state, data
end

-- Export match handlers
return {
    match_init = match_init,
    match_join_attempt = match_join_attempt,
    match_join = match_join,
    match_leave = match_leave,
    match_loop = match_loop,
    match_terminate = match_terminate,
    match_signal = match_signal
}