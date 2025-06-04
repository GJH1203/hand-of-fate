import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useAuth } from '@/hooks/useAuth';
import { LeaderboardRecord } from '@/services/leaderboardService';

interface LeaderboardProps {
    className?: string;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ className }) => {
    const { 
        weeklyLeaderboard, 
        allTimeLeaderboard, 
        isLoading, 
        error, 
        fetchLeaderboardAroundPlayer,
        refreshLeaderboards 
    } = useLeaderboard();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'weekly' | 'all-time'>('weekly');

    const currentLeaderboard = activeTab === 'weekly' ? weeklyLeaderboard : allTimeLeaderboard;

    const handleShowAroundMe = async () => {
        if (user?.userId) {
            await fetchLeaderboardAroundPlayer(user.userId, activeTab);
        }
    };

    const getRankColor = (rank: number): string => {
        switch (rank) {
            case 1: return 'text-yellow-600 font-bold'; // Gold
            case 2: return 'text-gray-500 font-bold';   // Silver
            case 3: return 'text-orange-600 font-bold'; // Bronze
            default: return 'text-foreground';
        }
    };

    const getRankBadge = (rank: number): string => {
        switch (rank) {
            case 1: return '🥇';
            case 2: return '🥈';
            case 3: return '🥉';
            default: return `#${rank}`;
        }
    };

    return (
        <Card className={className}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle>Leaderboard</CardTitle>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={refreshLeaderboards}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Refreshing...' : 'Refresh'}
                    </Button>
                </div>
                
                {/* Tab Switcher */}
                <div className="flex space-x-2">
                    <Button
                        variant={activeTab === 'weekly' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActiveTab('weekly')}
                    >
                        Weekly
                    </Button>
                    <Button
                        variant={activeTab === 'all-time' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setActiveTab('all-time')}
                    >
                        All Time
                    </Button>
                </div>
            </CardHeader>
            
            <CardContent>
                {error && (
                    <div className="text-red-500 text-sm mb-4 p-2 bg-red-50 rounded">
                        {error}
                    </div>
                )}

                {isLoading && (
                    <div className="text-center py-4">
                        <div className="text-sm text-muted-foreground">Loading leaderboard...</div>
                    </div>
                )}

                {!isLoading && currentLeaderboard && (
                    <>
                        {currentLeaderboard.records.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <div className="text-lg mb-2">No scores yet!</div>
                                <div className="text-sm">Be the first to play and get on the leaderboard!</div>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-2 mb-4">
                                    {currentLeaderboard.records.map((record: LeaderboardRecord) => (
                                        <div 
                                            key={`${record.playerId}-${record.rank}`}
                                            className={`flex items-center justify-between p-3 rounded-lg border ${
                                                user?.playerId === record.playerId 
                                                    ? 'bg-primary/10 border-primary/20' 
                                                    : 'bg-muted/30'
                                            }`}
                                        >
                                            <div className="flex items-center space-x-3">
                                                <div className={`text-lg font-mono ${getRankColor(record.rank)}`}>
                                                    {getRankBadge(record.rank)}
                                                </div>
                                                <div>
                                                    <div className="font-medium">
                                                        {record.username}
                                                        {user?.playerId === record.playerId && (
                                                            <Badge variant="secondary" className="ml-2 text-xs">
                                                                You
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-lg">{record.score}</div>
                                                <div className="text-xs text-muted-foreground">points</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {user?.userId && (
                                    <div className="border-t pt-4">
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={handleShowAroundMe}
                                            disabled={isLoading}
                                            className="w-full"
                                        >
                                            Show My Ranking
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
};

export default Leaderboard;