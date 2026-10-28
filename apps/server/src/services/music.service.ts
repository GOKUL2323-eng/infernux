import { MusicTrack, IMusicTrackDocument } from '../models/MusicTrack';
import { Playlist } from '../models/Playlist';
import { User } from '../models/User';
import { CreatePlaylistInput, MusicTrack as MusicTrackDTO, PlaylistSummary } from '@infernux/shared';

export class MusicService {
  async seedInitialCatalogIfNeeded(): Promise<void> {
    const count = await MusicTrack.countDocuments();
    if (count > 0) return;

    // Curated high quality royalty-free tracks for Infernux
    const sampleTracks = [
      {
        title: 'Cyber Mirage',
        artist: 'Neon Pulse',
        album: 'Synthetica',
        duration: 184,
        audioUrl: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3',
        coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80',
        genre: 'Synthwave',
      },
      {
        title: 'Midnight Drive',
        artist: 'Aura Bloom',
        album: 'Nightscapes',
        duration: 215,
        audioUrl: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c8c8a73467.mp3?filename=chill-abstract-intention-12099.mp3',
        coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
        genre: 'Chillhop',
      },
      {
        title: 'Starlight Symphony',
        artist: 'Kroma Sound',
        album: 'Echoes of Andromeda',
        duration: 198,
        audioUrl: 'https://cdn.pixabay.com/download/audio/2021/09/06/audio_24e54e4bb2.mp3?filename=electronic-future-beats-117997.mp3',
        coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80',
        genre: 'Electronic',
      },
      {
        title: 'Velvet Horizon',
        artist: 'Luna Ray',
        album: 'Dusk till Dawn',
        duration: 165,
        audioUrl: 'https://cdn.pixabay.com/download/audio/2022/10/14/audio_9939f77cb7.mp3?filename=tuesday-glitch-lofi-123417.mp3',
        coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
        genre: 'Lo-Fi',
      },
    ];

    await MusicTrack.insertMany(sampleTracks);
  }

  async getCatalog(limit = 30): Promise<MusicTrackDTO[]> {
    await this.seedInitialCatalogIfNeeded();
    const tracks = await MusicTrack.find().sort({ playCount: -1 }).limit(limit);
    return tracks.map((t) => ({
      id: t._id.toString(),
      title: t.title,
      artist: t.artist,
      album: t.album,
      duration: t.duration,
      audioUrl: t.audioUrl,
      coverUrl: t.coverUrl,
      genre: t.genre,
      isExplicit: t.isExplicit,
    }));
  }

  async searchTracks(query: string, limit = 20): Promise<MusicTrackDTO[]> {
    await this.seedInitialCatalogIfNeeded();
    const regex = new RegExp(query.trim(), 'i');
    const tracks = await MusicTrack.find({
      $or: [{ title: regex }, { artist: regex }, { album: regex }, { genre: regex }],
    }).limit(limit);

    return tracks.map((t) => ({
      id: t._id.toString(),
      title: t.title,
      artist: t.artist,
      album: t.album,
      duration: t.duration,
      audioUrl: t.audioUrl,
      coverUrl: t.coverUrl,
      genre: t.genre,
      isExplicit: t.isExplicit,
    }));
  }

  async getTrackById(id: string): Promise<MusicTrackDTO> {
    const track = await MusicTrack.findById(id);
    if (!track) throw new Error('Music track not found');

    // Increment play count asynchronously
    MusicTrack.findByIdAndUpdate(id, { $inc: { playCount: 1 } }).exec();

    return {
      id: track._id.toString(),
      title: track.title,
      artist: track.artist,
      album: track.album,
      duration: track.duration,
      audioUrl: track.audioUrl,
      coverUrl: track.coverUrl,
      genre: track.genre,
      isExplicit: track.isExplicit,
    };
  }

  async createPlaylist(creatorId: string, input: CreatePlaylistInput): Promise<PlaylistSummary> {
    const user = await User.findById(creatorId);

    const playlist = new Playlist({
      title: input.title,
      description: input.description,
      coverUrl: input.coverUrl,
      creatorId,
      isPublic: input.isPublic,
      tracks: input.trackIds || [],
    });
    await playlist.save();

    return {
      id: playlist._id.toString(),
      title: playlist.title,
      description: playlist.description,
      coverUrl: playlist.coverUrl,
      creatorId,
      creatorName: user?.displayName || user?.username || 'User',
      tracksCount: playlist.tracks.length,
      isPublic: playlist.isPublic,
      createdAt: playlist.createdAt.toISOString(),
      updatedAt: playlist.updatedAt.toISOString(),
    };
  }

  async getPlaylists(userId: string): Promise<PlaylistSummary[]> {
    const playlists = await Playlist.find({
      $or: [{ creatorId: userId }, { isPublic: true }],
    })
      .populate('creatorId', 'displayName username')
      .sort({ updatedAt: -1 });

    return playlists.map((p) => {
      const creator = p.creatorId as any;
      return {
        id: p._id.toString(),
        title: p.title,
        description: p.description,
        coverUrl: p.coverUrl,
        creatorId: creator ? creator._id.toString() : '',
        creatorName: creator?.displayName || creator?.username || 'User',
        tracksCount: p.tracks.length,
        isPublic: p.isPublic,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      };
    });
  }

  async addTrackToPlaylist(playlistId: string, userId: string, trackId: string): Promise<void> {
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) throw new Error('Playlist not found');
    if (playlist.creatorId.toString() !== userId) {
      throw new Error('Permission denied: You can only edit your own playlists');
    }

    await Playlist.findByIdAndUpdate(playlistId, {
      $addToSet: { tracks: trackId },
    });
  }
}

export const musicService = new MusicService();

