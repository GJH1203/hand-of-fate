export interface LeaderboardRecord {
    playerId: string;
    username: string;
    score: number;
    rank: number;
}

export interface LeaderboardResponse {
    records: LeaderboardRecord[];
    nextCursor: string;
    prevCursor: string;
}

const API_BASE_URL = 'http://localhost:8080/leaderboards';

class LeaderboardService {
    async getWeeklyLeaderboard(limit: number = 20): Promise<LeaderboardResponse> {
        try {
            const response = await fetch(`${API_BASE_URL}/weekly?limit=${limit}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch weekly leaderboard');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching weekly leaderboard:', error);
            throw error;
        }
    }

    async getAllTimeLeaderboard(limit: number = 20): Promise<LeaderboardResponse> {
        try {
            const response = await fetch(`${API_BASE_URL}/all-time?limit=${limit}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch all-time leaderboard');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching all-time leaderboard:', error);
            throw error;
        }
    }

    async getLeaderboardAroundPlayer(
        nakamaUserId: string, 
        leaderboardType: 'weekly' | 'all-time' = 'weekly',
        limit: number = 10
    ): Promise<LeaderboardResponse> {
        try {
            const leaderboardId = leaderboardType === 'weekly' ? 'weekly_score' : 'all_time_score';
            const response = await fetch(
                `${API_BASE_URL}/around-player/${encodeURIComponent(nakamaUserId)}?leaderboardId=${leaderboardId}&limit=${limit}`
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch leaderboard around player');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching leaderboard around player:', error);
            throw error;
        }
    }
}

export const leaderboardService = new LeaderboardService();