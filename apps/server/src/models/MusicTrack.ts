import mongoose, { Schema, Document } from 'mongoose';

export interface IMusicTrackDocument extends Document {
  title: string;
  artist: string;
  album?: string;
  duration: number;
  audioUrl: string;
  coverUrl: string;
  genre?: string;
  isExplicit: boolean;
  playCount: number;
  createdAt: Date;
}

const MusicTrackSchema = new Schema<IMusicTrackDocument>(
  {
    title: { type: String, required: true, trim: true, index: true },
    artist: { type: String, required: true, trim: true, index: true },
    album: { type: String, trim: true },
    duration: { type: Number, required: true },
    audioUrl: { type: String, required: true },
    coverUrl: { type: String, required: true },
    genre: { type: String, index: true },
    isExplicit: { type: Boolean, default: false },
    playCount: { type: Number, default: 0 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

MusicTrackSchema.index({ title: 'text', artist: 'text', album: 'text' });

export const MusicTrack = mongoose.model<IMusicTrackDocument>('MusicTrack', MusicTrackSchema);

