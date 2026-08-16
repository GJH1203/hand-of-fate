-- leaderboards.lua
-- Script to create and initialize leaderboards

local nk = require("nakama")

-- Helper function to create leaderboards safely
local function create_or_reuse_leaderboard(id, authoritative, sort_order, operator, reset_schedule, metadata)
  -- Use pcall to avoid errors when leaderboard already exists
  local success, err = pcall(nk.leaderboard_create,
          id,                -- ID
          authoritative,     -- Authoritative flag
          sort_order,        -- Sort order
          operator,          -- Operator
          reset_schedule,    -- Reset schedule
          metadata           -- Metadata
  )

  if (not success and not string.find(tostring(err), "in use")) then
    nk.logger_error(("Leaderboard create failed: %q"):format(tostring(err)))
    return false
  end

  nk.logger_info(("Leaderboard %q initialized successfully"):format(id))
  return true
end

-- Create leaderboards directly - no startup function needed
create_or_reuse_leaderboard(
        "weekly_score",    -- ID (must match your Java code)
        false,             -- Authoritative (false allows clients to submit)
        "desc",            -- Sort order (higher scores are better)
        "best",            -- Operator (best = keep highest score)
        "0 0 * * 1",       -- Reset schedule (every Monday at midnight)
        {}                 -- Metadata (optional)
)

create_or_reuse_leaderboard(
        "all_time_score",  -- ID (must match your Java code)
        false,             -- Authoritative
        "desc",            -- Sort order
        "best",             -- Operator
        nil,               -- No reset schedule
        {}                 -- Metadata
)
