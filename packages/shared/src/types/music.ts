export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number; // in seconds
  audioUrl: string; // authorized preview or stream URL
  coverUrl: string;
  genre?: string;
  isExplicit?: boolean;
}

export interface PlaylistSummary {
  id: string;
  title: string;
  description?: string;
  coverUrl?: string;
  creatorId: string;
  creatorName: string;
  tracksCount: number;
  isPublic: boolean;
  tracks?: MusicTrack[];
  createdAt: string;
  updatedAt: string;
}
