import { create } from 'zustand';
import { api } from '../api/client';
import {
  PostSummary,
  ReelSummary,
  UserStoriesGroup,
  PaginatedResponse,
} from '@infernux/shared';

interface FeedState {
  posts: PostSummary[];
  reels: ReelSummary[];
  stories: UserStoriesGroup[];
  isLoadingPosts: boolean;
  isLoadingReels: boolean;
  isLoadingStories: boolean;
  activeReelIndex: number;

  loadFeed: (refresh?: boolean) => Promise<void>;
  loadReels: (refresh?: boolean) => Promise<void>;
  loadStories: () => Promise<void>;
  likePost: (postId: string) => Promise<void>;
  savePost: (postId: string) => Promise<void>;
  likeReel: (reelId: string) => Promise<void>;
  setActiveReelIndex: (index: number) => void;
}

export const useFeedStore = create<FeedState>((set, get) => ({
  posts: [],
  reels: [],
  stories: [],
  isLoadingPosts: false,
  isLoadingReels: false,
  isLoadingStories: false,
  activeReelIndex: 0,

  loadFeed: async (refresh = false) => {
    if (refresh) set({ isLoadingPosts: true });
    const res = await api.get<PaginatedResponse<PostSummary>>('/posts/feed?limit=20');
    if (res.success && res.data) {
      set({ posts: res.data.items, isLoadingPosts: false });
    } else {
      set({ isLoadingPosts: false });
    }
  },

  loadReels: async (refresh = false) => {
    if (refresh) set({ isLoadingReels: true });
    const res = await api.get<PaginatedResponse<ReelSummary>>('/reels/feed?limit=15');
    if (res.success && res.data) {
      set({ reels: res.data.items, isLoadingReels: false });
    } else {
      set({ isLoadingReels: false });
    }
  },

  loadStories: async () => {
    set({ isLoadingStories: true });
    const res = await api.get<UserStoriesGroup[]>('/stories/feed');
    if (res.success && res.data) {
      set({ stories: res.data, isLoadingStories: false });
    } else {
      set({ isLoadingStories: false });
    }
  },

  likePost: async (postId: string) => {
    // Optimistic update
    set((state) => ({
      posts: state.posts.map((p) => {
        if (p.id === postId) {
          const isLiked = !p.isLiked;
          return {
            ...p,
            isLiked,
            likesCount: isLiked ? p.likesCount + 1 : Math.max(0, p.likesCount - 1),
          };
        }
        return p;
      }),
    }));

    await api.post(`/posts/${postId}/like`);
  },

  savePost: async (postId: string) => {
    set((state) => ({
      posts: state.posts.map((p) => {
        if (p.id === postId) {
          return { ...p, isSaved: !p.isSaved };
        }
        return p;
      }),
    }));

    await api.post(`/posts/${postId}/save`);
  },

  likeReel: async (reelId: string) => {
    set((state) => ({
      reels: state.reels.map((r) => {
        if (r.id === reelId) {
          const isLiked = !r.isLiked;
          return {
            ...r,
            isLiked,
            likesCount: isLiked ? r.likesCount + 1 : Math.max(0, r.likesCount - 1),
          };
        }
        return r;
      }),
    }));

    await api.post(`/reels/${reelId}/like`);
  },

  setActiveReelIndex: (index: number) => {
    set({ activeReelIndex: index });
  },
}));

