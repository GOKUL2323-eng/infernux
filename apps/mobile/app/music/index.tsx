import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMusicStore } from '../../src/store/useMusicStore';
import { useThemeStore } from '../../src/store/useThemeStore';
import { api } from '../../src/api/client';
import { spacing, borderRadius, typography } from '../../src/theme/spacing';
import { MusicTrack, PlaylistSummary } from '@infernux/shared';

export default function MusicScreen() {
  const router = useRouter();
  const { colors } = useThemeStore();
  const { currentTrack, isPlaying, playTrack, togglePlayPause } = useMusicStore();

  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'tracks' | 'playlists'>('tracks');

  useEffect(() => {
    fetchCatalog();
    fetchPlaylists();
  }, []);

  const fetchCatalog = async () => {
    const res = await api.get<MusicTrack[]>('/music/catalog');
    if (res.success && res.data) setTracks(res.data);
  };

  const fetchPlaylists = async () => {
    const res = await api.get<PlaylistSummary[]>('/music/playlists');
    if (res.success && res.data) setPlaylists(res.data);
  };

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (text.trim().length === 0) {
      fetchCatalog();
      return;
    }
    const res = await api.get<MusicTrack[]>(`/music/search?q=${encodeURIComponent(text)}`);
    if (res.success && res.data) setTracks(res.data);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const renderTrackItem = ({ item }: { item: MusicTrack }) => {
    const isCurrent = currentTrack?.id === item.id;

    return (
      <TouchableOpacity
        onPress={() => (isCurrent ? togglePlayPause() : playTrack(item, tracks))}
        style={[
          styles.trackItem,
          { borderBottomColor: colors.border },
          isCurrent && { backgroundColor: colors.surfaceElevated },
        ]}
      >
        <Image source={{ uri: item.coverUrl }} style={styles.trackCover} />
        <View style={styles.trackInfo}>
          <Text
            numberOfLines={1}
            style={[
              typography.body1,
              { color: isCurrent ? colors.primary : colors.text, fontWeight: '600' },
            ]}
          >
            {item.title}
          </Text>
          <Text numberOfLines={1} style={[typography.caption, { color: colors.textSecondary }]}>
            {item.artist} {item.genre ? `• ${item.genre}` : ''}
          </Text>
        </View>

        <Text style={[typography.caption, { color: colors.textMuted, marginRight: spacing.sm }]}>
          {formatDuration(item.duration)}
        </Text>

        <Ionicons
          name={isCurrent && isPlaying ? 'pause-circle' : 'play-circle'}
          size={32}
          color={isCurrent ? colors.primary : colors.text}
        />
      </TouchableOpacity>
    );
  };

  const renderPlaylistItem = ({ item }: { item: PlaylistSummary }) => (
    <View style={[styles.playlistCard, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
      <Image
        source={{ uri: item.coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300' }}
        style={styles.playlistCover}
      />
      <View style={styles.playlistInfo}>
        <Text style={[typography.body1, { color: colors.text, fontWeight: '700' }]}>{item.title}</Text>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          By {item.creatorName} • {item.tracksCount} tracks
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[typography.h3, { color: colors.text }]}>Music & Playlists</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.surfaceElevated }]}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          placeholder="Search songs, artists, genres..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={handleSearch}
          style={[styles.searchInput, { color: colors.text }]}
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          onPress={() => setActiveTab('tracks')}
          style={[
            styles.tabBtn,
            activeTab === 'tracks' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
          ]}
        >
          <Text
            style={[
              typography.button,
              { color: activeTab === 'tracks' ? colors.primary : colors.textSecondary },
            ]}
          >
            Tracks
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('playlists')}
          style={[
            styles.tabBtn,
            activeTab === 'playlists' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
          ]}
        >
          <Text
            style={[
              typography.button,
              { color: activeTab === 'playlists' ? colors.primary : colors.textSecondary },
            ]}
          >
            Playlists
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {activeTab === 'tracks' ? (
        <FlatList
          data={tracks}
          keyExtractor={(item) => item.id}
          renderItem={renderTrackItem}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      ) : (
        <FlatList
          data={playlists}
          keyExtractor={(item) => item.id}
          renderItem={renderPlaylistItem}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 0.5,
  },
  backBtn: {
    padding: spacing.xs,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.md,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: borderRadius.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    height: '100%',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  trackCover: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.sm,
  },
  trackInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  playlistCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  playlistCover: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.sm,
  },
  playlistInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
});

