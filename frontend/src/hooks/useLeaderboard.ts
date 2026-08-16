import { useState, useEffect, useCallback } from 'react';
import { leaderboardService, LeaderboardResponse } from '@/services/leaderboardService';

export const useLeaderboard = () => {
    const [weeklyLeaderboard, setWeeklyLeaderboard] = useState<LeaderboardResponse | null>(null);
    const [allTimeLeaderboard, setAllTimeLeaderboard] = useState<LeaderboardResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchWeeklyLeaderboard = useCallback(async (limit: number = 10) => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await leaderboardService.getWeeklyLeaderboard(limit);
            setWeeklyLeaderboard(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch weekly leaderboard');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchAllTimeLeaderboard = useCallback(async (limit: number = 10) => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await leaderboardService.getAllTimeLeaderboard(limit);
            setAllTimeLeaderboard(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch all-time leaderboard');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchLeaderboardAroundPlayer = useCallback(async (
        nakamaUserId: string, 
        leaderboardType: 'weekly' | 'all-time' = 'weekly',
        limit: number = 10
    ) => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await leaderboardService.getLeaderboardAroundPlayer(nakamaUserId, leaderboardType, limit);
            
            if (leaderboardType === 'weekly') {
                setWeeklyLeaderboard(data);
            } else {
                setAllTimeLeaderboard(data);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard around player');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const refreshLeaderboards = useCallback(async () => {
        await Promise.all([
            fetchWeeklyLeaderboard(),
            fetchAllTimeLeaderboard()
        ]);
    }, [fetchWeeklyLeaderboard, fetchAllTimeLeaderboard]);

    useEffect(() => {
        // Auto-fetch leaderboards on mount
        refreshLeaderboards();
    }, [refreshLeaderboards]);

    return {
        weeklyLeaderboard,
        allTimeLeaderboard,
        isLoading,
        error,
        fetchWeeklyLeaderboard,
        fetchAllTimeLeaderboard,
        fetchLeaderboardAroundPlayer,
        refreshLeaderboards
    };
};