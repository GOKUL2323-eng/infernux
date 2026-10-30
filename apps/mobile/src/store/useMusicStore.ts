import { create } from 'zustand';
import { createAudioPlayer, AudioPlayer, AudioModule } from 'expo-audio';
import { MusicTrack } from '@infernux/shared';

interface MusicState {
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  isMiniPlayerVisible: boolean;
  playlist: MusicTrack[];
  currentIndex: number;
  player: AudioPlayer | null;

  playTrack: (track: MusicTrack, playlist?: MusicTrack[]) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
  closeMiniPlayer: () => Promise<void>;
}

export const useMusicStore = create<MusicState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  isMiniPlayerVisible: false,
  playlist: [],
  currentIndex: 0,
  player: null,

  playTrack: async (track: MusicTrack, playlist = []) => {
    const { player: existingPlayer } = get();
    if (existingPlayer) {
      try {
        existingPlayer.remove();
      } catch {
        // ignore
      }
    }

    try {
      try {
        await AudioModule.setAudioModeAsync({
          playsInSilentMode: true,
          interruptionMode: 'duckOthers',
        });
      } catch {
        // ignore
      }

      const newPlayer = createAudioPlayer(track.audioUrl);
      newPlayer.play();

      const activePlaylist = playlist.length > 0 ? playlist : [track];
      const index = activePlaylist.findIndex((t) => t.id === track.id);

      set({
        currentTrack: track,
        player: newPlayer,
        isPlaying: true,
        isMiniPlayerVisible: true,
        playlist: activePlaylist,
        currentIndex: Math.max(0, index),
      });

      newPlayer.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) {
          get().nextTrack();
        }
      });
    } catch (err) {
      console.warn('Error playing audio track:', err);
    }
  },

  togglePlayPause: async () => {
    const { player, isPlaying } = get();
    if (!player) return;

    if (isPlaying) {
      player.pause();
      set({ isPlaying: false });
    } else {
      player.play();
      set({ isPlaying: true });
    }
  },

  nextTrack: async () => {
    const { playlist, currentIndex } = get();
    if (playlist.length === 0) return;

    const nextIndex = (currentIndex + 1) % playlist.length;
    await get().playTrack(playlist[nextIndex], playlist);
  },

  previousTrack: async () => {
    const { playlist, currentIndex } = get();
    if (playlist.length === 0) return;

    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    await get().playTrack(playlist[prevIndex], playlist);
  },

  closeMiniPlayer: async () => {
    const { player } = get();
    if (player) {
      try {
        player.pause();
        player.remove();
      } catch {
        // ignore
      }
    }
    set({ player: null, isPlaying: false, isMiniPlayerVisible: false, currentTrack: null });
  },
}));
