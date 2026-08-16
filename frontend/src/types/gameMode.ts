export enum GameMode {
  LOCAL = 'LOCAL',
  ONLINE = 'ONLINE'
}

export interface GameModeSelection {
  mode: GameMode;
  matchId?: string; // For joining existing online games
}

export interface OnlineMatchInfo {
  matchId: string;
  player1Id: string;
  player2Id?: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED';
  createdAt: string;
}