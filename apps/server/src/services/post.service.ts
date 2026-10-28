import mongoose from 'mongoose';
import { Post, IPostDocument } from '../models/Post';
import { Comment } from '../models/Comment';
import { Like } from '../models/Like';
import { SavedItem } from '../models/SavedItem';
import { Follow } from '../models/Follow';
import { Block } from '../models/Block';
import { User } from '../models/User';
import {
  CreatePostInput,
  AddCommentInput,
  PostSummary,
  CommentSummary,
  FeedType,
  PaginatedResponse,
} from '@infernux/shared';

export class PostService {
  async createPost(authorId: string, input: CreatePostInput): Promise<PostSummary> {
    // Extract hashtags from caption if not explicitly provided
    let hashtags = input.hashtags || [];
    if (input.caption && hashtags.length === 0) {
      const matched = input.caption.match(/#[a-zA-Z0-9_]+/g);
      if (matched) {
        hashtags = matched.map((tag) => tag.slice(1).toLowerCase());
      }
    }

    const post = new Post({
      authorId,
      caption: input.caption || '',
      media: input.media,
      hashtags,
      mentions: input.mentions || [],
      isPrivate: input.isPrivate || false,
    });
    await post.save();

    await User.findByIdAndUpdate(authorId, { $inc: { postsCount: 1 } });

    const author = await User.findById(authorId).select('username displayName avatarUrl isVerified');

    return {
      id: post._id.toString(),
      authorId,
      author: {
        id: authorId,
        username: author?.username || '',
        displayName: author?.displayName || '',
        avatarUrl: author?.avatarUrl,
        isVerified: author?.isVerified,
      },
      caption: post.caption,
      media: post.media,
      hashtags: post.hashtags,
      mentions: post.mentions,
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      isLiked: false,
      isSaved: false,
      isPrivate: post.isPrivate,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  }

  async getFeed(
    userId: string,
    feedType: FeedType = 'chronological',
    limit = 20,
    beforeCursor?: string
  ): Promise<PaginatedResponse<PostSummary>> {
    // Determine blocked users
    const blocks = await Block.find({
      $or: [{ blockerId: userId }, { blockedId: userId }],
    });
    const blockedUserIds = blocks.map((b) =>
      b.blockerId.toString() === userId ? b.blockedId : b.blockerId
    );

    // Get followed users
    const follows = await Follow.find({
      followerId: userId,
      status: 'accepted',
    });
    const followingIds = follows.map((f) => f.followingId);

    // Feed includes self, followed users, and permitted public posts
    const query: any = {
      authorId: {
        $nin: blockedUserIds,
        $in: [new mongoose.Types.ObjectId(userId), ...followingIds],
      },
    };

    if (beforeCursor) {
      const cursorPost = await Post.findById(beforeCursor);
      if (cursorPost) {
        query.createdAt = { $lt: cursorPost.createdAt };
      }
    }

    const posts = await Post.find(query)
      .populate('authorId', 'username displayName avatarUrl isVerified')
      .sort(feedType === 'personalized' ? { likesCount: -1, createdAt: -1 } : { createdAt: -1 })
      .limit(limit + 1);

    const hasMore = posts.length > limit;
    const items = hasMore ? posts.slice(0, limit) : posts;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1]._id.toString() : null;

    // Check likes and saves for the current user
    const postIds = items.map((p) => p._id);
    const userLikes = await Like.find({
      userId,
      targetType: 'post',
      targetId: { $in: postIds },
    });
    const likedSet = new Set(userLikes.map((l) => l.targetId.toString()));

    const userSaves = await SavedItem.find({
      userId,
      itemType: 'post',
      itemId: { $in: postIds },
    });
    const savedSet = new Set(userSaves.map((s) => s.itemId.toString()));

    const formatted: PostSummary[] = items.map((p) => {
      const author = p.authorId as any;
      const pid = p._id.toString();
      return {
        id: pid,
        authorId: author ? author._id.toString() : '',
        author: {
          id: author ? author._id.toString() : '',
          username: author?.username || '',
          displayName: author?.displayName || '',
          avatarUrl: author?.avatarUrl,
          isVerified: author?.isVerified,
        },
        caption: p.caption,
        media: p.media,
        hashtags: p.hashtags,
        mentions: p.mentions,
        likesCount: p.likesCount,
        commentsCount: p.commentsCount,
        sharesCount: p.sharesCount,
        isLiked: likedSet.has(pid),
        isSaved: savedSet.has(pid),
        isPrivate: p.isPrivate,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      };
    });

    return {
      items: formatted,
      pagination: {
        page: 1,
        limit,
        total: formatted.length,
        totalPages: 1,
        hasMore,
        nextCursor,
      },
    };
  }

  async likePost(userId: string, postId: string): Promise<{ liked: boolean; likesCount: number }> {
    const post = await Post.findById(postId);
    if (!post) throw new Error('Post not found');

    const existingLike = await Like.findOne({
      userId,
      targetType: 'post',
      targetId: postId,
    });

    if (existingLike) {
      await Like.findByIdAndDelete(existingLike._id);
      post.likesCount = Math.max(0, post.likesCount - 1);
      await post.save();
      return { liked: false, likesCount: post.likesCount };
    } else {
      const like = new Like({
        userId,
        targetType: 'post',
        targetId: postId,
      });
      await like.save();
      post.likesCount += 1;
      await post.save();
      return { liked: true, likesCount: post.likesCount };
    }
  }

  async addComment(userId: string, postId: string, input: AddCommentInput): Promise<CommentSummary> {
    const post = await Post.findById(postId);
    if (!post) throw new Error('Post not found');

    const comment = new Comment({
      postId,
      authorId: userId,
      content: input.content,
      replyToCommentId: input.replyToCommentId,
    });
    await comment.save();

    await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });

    const author = await User.findById(userId).select('username displayName avatarUrl isVerified');

    return {
      id: comment._id.toString(),
      postId,
      authorId: userId,
      author: {
        id: userId,
        username: author?.username || '',
        displayName: author?.displayName || '',
        avatarUrl: author?.avatarUrl,
        isVerified: author?.isVerified,
      },
      content: comment.content,
      replyToCommentId: comment.replyToCommentId?.toString(),
      likesCount: 0,
      isLiked: false,
      createdAt: comment.createdAt.toISOString(),
    };
  }

  async getComments(postId: string, limit = 50): Promise<CommentSummary[]> {
    const comments = await Comment.find({ postId })
      .populate('authorId', 'username displayName avatarUrl isVerified')
      .sort({ createdAt: 1 })
      .limit(limit);

    return comments.map((c) => {
      const author = c.authorId as any;
      return {
        id: c._id.toString(),
        postId,
        authorId: author ? author._id.toString() : '',
        author: {
          id: author ? author._id.toString() : '',
          username: author?.username || '',
          displayName: author?.displayName || '',
          avatarUrl: author?.avatarUrl,
          isVerified: author?.isVerified,
        },
        content: c.content,
        replyToCommentId: c.replyToCommentId?.toString(),
        likesCount: c.likesCount,
        createdAt: c.createdAt.toISOString(),
      };
    });
  }

  async toggleSavePost(userId: string, postId: string): Promise<boolean> {
    const existing = await SavedItem.findOne({ userId, itemType: 'post', itemId: postId });
    if (existing) {
      await SavedItem.findByIdAndDelete(existing._id);
      return false;
    } else {
      await SavedItem.create({ userId, itemType: 'post', itemId: postId });
      return true;
    }
  }

  async getUserPosts(targetUserId: string, currentUserId?: string, limit = 20): Promise<PostSummary[]> {
    const posts = await Post.find({ authorId: targetUserId })
      .populate('authorId', 'username displayName avatarUrl isVerified')
      .sort({ createdAt: -1 })
      .limit(limit);

    return posts.map((p) => {
      const author = p.authorId as any;
      return {
        id: p._id.toString(),
        authorId: targetUserId,
        author: {
          id: targetUserId,
          username: author?.username || '',
          displayName: author?.displayName || '',
          avatarUrl: author?.avatarUrl,
        },
        caption: p.caption,
        media: p.media,
        hashtags: p.hashtags,
        mentions: p.mentions,
        likesCount: p.likesCount,
        commentsCount: p.commentsCount,
        sharesCount: p.sharesCount,
        isLiked: false,
        isSaved: false,
        isPrivate: p.isPrivate,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      };
    });
  }
}

export const postService = new PostService();

