export type LobbyStatus = 'waiting' | 'playing' | 'finished';
export type RoundStatus = 'submitting' | 'judging' | 'finished';

export interface Lobby {
  id: string;
  code: string;
  status: LobbyStatus;
  max_players: number;
  max_score: number;
  created_at: string;
}

export interface Player {
  id: string;
  lobby_id: string;
  name: string;
  score: number;
  is_host: boolean;
  is_bot: boolean;
  joined_at: string;
}

export interface Round {
  id: string;
  lobby_id: string;
  president_id: string;
  prompt: string;
  status: RoundStatus;
  created_at: string;
}

export interface Submission {
  id: string;
  round_id: string;
  player_id: string;
  youtube_url: string;
  created_at: string;
}
