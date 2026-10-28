import { create } from 'zustand';
import { Audio } from 'expo-av';
import { MusicTrack } from '@infernux/shared';

interface MusicState {
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  isMiniPlayerVisible: boolean;
  playlist: MusicTrack[];
  currentIndex: number;
  sound: Audio.Sound | null;

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
  sound: null,

  playTrack: async (track: MusicTrack, playlist = []) => {
    const { sound: existingSound } = get();
    if (existingSound) {
      await existingSound.unloadAsync();
    }

    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: track.audioUrl },
        { shouldPlay: true }
      );

      const activePlaylist = playlist.length > 0 ? playlist : [track];
      const index = activePlaylist.findIndex((t) => t.id === track.id);

      set({
        currentTrack: track,
        sound: newSound,
        isPlaying: true,
        isMiniPlayerVisible: true,
        playlist: activePlaylist,
        currentIndex: Math.max(0, index),
      });

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          get().nextTrack();
        }
      });
    } catch (err) {
      console.warn('Error playing audio track:', err);
    }
  },

  togglePlayPause: async () => {
    const { sound, isPlaying } = get();
    if (!sound) return;

    if (isPlaying) {
      await sound.pauseAsync();
      set({ isPlaying: false });
    } else {
      await sound.playAsync();
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
    const { sound } = get();
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
    }
    set({ sound: null, isPlaying: false, isMiniPlayerVisible: false, currentTrack: null });
  },
}));

