import mongoose, { Schema, Document } from 'mongoose';

export interface IPlaylistDocument extends Document {
  title: string;
  description?: string;
  coverUrl?: string;
  creatorId: mongoose.Types.ObjectId;
  isPublic: boolean;
  tracks: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const PlaylistSchema = new Schema<IPlaylistDocument>(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, maxlength: 300, default: '' },
    coverUrl: { type: String, default: '' },
    creatorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    isPublic: { type: Boolean, default: true },
    tracks: [
      {
        type: Schema.Types.ObjectId,
        ref: 'MusicTrack',
      },
    ],
  },
  {
    timestamps: true,
  }
);

PlaylistSchema.index({ creatorId: 1, updatedAt: -1 });

export const Playlist = mongoose.model<IPlaylistDocument>('Playlist', PlaylistSchema);
