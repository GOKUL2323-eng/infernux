import mongoose from 'mongoose';
import { PrivateNote, IPrivateNoteDocument } from '../models/PrivateNote';
import { SocialNote, ISocialNoteDocument } from '../models/SocialNote';
import { Like } from '../models/Like';
import { Follow } from '../models/Follow';
import { User } from '../models/User';
import {
  CreatePrivateNoteInput,
  UpdatePrivateNoteInput,
  CreateSocialNoteInput,
  PrivateNote as PrivateNoteDTO,
  SocialNote as SocialNoteDTO,
} from '@infernux/shared';

export class NoteService {
  // --- PRIVATE NOTES ---
  async createPrivateNote(userId: string, input: CreatePrivateNoteInput): Promise<PrivateNoteDTO> {
    const note = new PrivateNote({
      userId,
      title: input.title,
      content: input.content || '',
      tags: input.tags || [],
      folder: input.folder,
      isPinned: input.isPinned || false,
      reminderAt: input.reminderAt ? new Date(input.reminderAt) : undefined,
      attachments: input.attachments || [],
    });
    await note.save();

    return {
      id: note._id.toString(),
      userId,
      title: note.title,
      content: note.content,
      tags: note.tags,
      folder: note.folder,
      isPinned: note.isPinned,
      isArchived: note.isArchived,
      reminderAt: note.reminderAt?.toISOString(),
      attachments: note.attachments,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    };
  }

  async getPrivateNotes(userId: string, folder?: string, tag?: string): Promise<PrivateNoteDTO[]> {
    const query: any = { userId, isArchived: false };
    if (folder) query.folder = folder;
    if (tag) query.tags = tag.toLowerCase();

    const notes = await PrivateNote.find(query).sort({ isPinned: -1, updatedAt: -1 });

    return notes.map((n) => ({
      id: n._id.toString(),
      userId,
      title: n.title,
      content: n.content,
      tags: n.tags,
      folder: n.folder,
      isPinned: n.isPinned,
      isArchived: n.isArchived,
      reminderAt: n.reminderAt?.toISOString(),
      attachments: n.attachments,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    }));
  }

  async updatePrivateNote(noteId: string, userId: string, input: UpdatePrivateNoteInput): Promise<PrivateNoteDTO> {
    const note = await PrivateNote.findOne({ _id: noteId, userId });
    if (!note) throw new Error('Note not found or access denied');

    if (input.title !== undefined) note.title = input.title;
    if (input.content !== undefined) note.content = input.content;
    if (input.tags !== undefined) note.tags = input.tags;
    if (input.folder !== undefined) note.folder = input.folder;
    if (input.isPinned !== undefined) note.isPinned = input.isPinned;
    if (input.reminderAt !== undefined) {
      note.reminderAt = input.reminderAt ? new Date(input.reminderAt) : undefined;
    }
    if (input.attachments !== undefined) note.attachments = input.attachments;

    await note.save();

    return {
      id: note._id.toString(),
      userId,
      title: note.title,
      content: note.content,
      tags: note.tags,
      folder: note.folder,
      isPinned: note.isPinned,
      isArchived: note.isArchived,
      reminderAt: note.reminderAt?.toISOString(),
      attachments: note.attachments,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    };
  }

  async deletePrivateNote(noteId: string, userId: string): Promise<void> {
    const note = await PrivateNote.findOneAndDelete({ _id: noteId, userId });
    if (!note) throw new Error('Note not found or access denied');
  }

  // --- SOCIAL NOTES ---
  async createSocialNote(authorId: string, input: CreateSocialNoteInput): Promise<SocialNoteDTO> {
    // Delete any active social note for this user first (one active status note at a time)
    await SocialNote.deleteMany({ authorId, isExpired: false });

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const note = new SocialNote({
      authorId,
      text: input.text,
      emoji: input.emoji,
      musicTrackId: input.musicTrackId,
      audience: input.audience || 'followers',
      expiresAt,
    });
    await note.save();

    const populated = await SocialNote.findById(note._id)
      .populate('authorId', 'username displayName avatarUrl isVerified')
      .populate('musicTrackId');

    const author = populated?.authorId as any;
    const track = populated?.musicTrackId as any;

    return {
      id: note._id.toString(),
      authorId,
      author: {
        id: authorId,
        username: author?.username || '',
        displayName: author?.displayName || '',
        avatarUrl: author?.avatarUrl,
        isVerified: author?.isVerified,
      },
      text: note.text,
      emoji: note.emoji,
      musicTrack: track
        ? {
            id: track._id.toString(),
            title: track.title,
            artist: track.artist,
            duration: track.duration,
            audioUrl: track.audioUrl,
            coverUrl: track.coverUrl,
          }
        : undefined,
      audience: note.audience,
      likesCount: 0,
      isLiked: false,
      expiresAt: note.expiresAt.toISOString(),
      createdAt: note.createdAt.toISOString(),
    };
  }

  async getSocialNotesFeed(userId: string): Promise<SocialNoteDTO[]> {
    const follows = await Follow.find({
      followerId: userId,
      status: 'accepted',
    });
    const followingIds = follows.map((f) => f.followingId);

    const eligibleAuthorIds = [new mongoose.Types.ObjectId(userId), ...followingIds];

    const notes = await SocialNote.find({
      authorId: { $in: eligibleAuthorIds },
      isExpired: false,
      expiresAt: { $gt: new Date() },
    })
      .populate('authorId', 'username displayName avatarUrl isVerified')
      .populate('musicTrackId')
      .sort({ createdAt: -1 });

    const noteIds = notes.map((n) => n._id);
    const userLikes = await Like.find({
      userId,
      targetType: 'social_note',
      targetId: { $in: noteIds },
    });
    const likedSet = new Set(userLikes.map((l) => l.targetId.toString()));

    return notes.map((n) => {
      const author = n.authorId as any;
      const track = n.musicTrackId as any;
      const nid = n._id.toString();

      return {
        id: nid,
        authorId: author ? author._id.toString() : '',
        author: {
          id: author ? author._id.toString() : '',
          username: author?.username || '',
          displayName: author?.displayName || '',
          avatarUrl: author?.avatarUrl,
          isVerified: author?.isVerified,
        },
        text: n.text,
        emoji: n.emoji,
        musicTrack: track
          ? {
              id: track._id.toString(),
              title: track.title,
              artist: track.artist,
              duration: track.duration,
              audioUrl: track.audioUrl,
              coverUrl: track.coverUrl,
            }
          : undefined,
        audience: n.audience,
        likesCount: n.likesCount,
        isLiked: likedSet.has(nid),
        expiresAt: n.expiresAt.toISOString(),
        createdAt: n.createdAt.toISOString(),
      };
    });
  }

  async likeSocialNote(userId: string, noteId: string): Promise<void> {
    const note = await SocialNote.findById(noteId);
    if (!note) throw new Error('Social note not found');

    const existingLike = await Like.findOne({
      userId,
      targetType: 'social_note',
      targetId: noteId,
    });

    if (existingLike) {
      await Like.findByIdAndDelete(existingLike._id);
      await SocialNote.findByIdAndUpdate(noteId, { $inc: { likesCount: -1 } });
    } else {
      await Like.create({
        userId,
        targetType: 'social_note',
        targetId: noteId,
      });
      await SocialNote.findByIdAndUpdate(noteId, { $inc: { likesCount: 1 } });
    }
  }
}

export const noteService = new NoteService();
