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
  reelFeedType: 'for_you' | 'following';
  reelSearchQuery: string;

  loadFeed: (refresh?: boolean) => Promise<void>;
  loadReels: (
    refresh?: boolean,
    feedType?: 'for_you' | 'following',
    query?: string,
    hashtag?: string
  ) => Promise<void>;
  loadStories: () => Promise<void>;
  likePost: (postId: string) => Promise<void>;
  savePost: (postId: string) => Promise<void>;
  likeReel: (reelId: string) => Promise<void>;
  saveReel: (reelId: string) => Promise<void>;
  recordReelShare: (reelId: string) => Promise<void>;
  recordReelView: (reelId: string) => Promise<void>;
  toggleFollowCreator: (creatorId: string) => Promise<boolean>;
  setReelFeedType: (feedType: 'for_you' | 'following') => void;
  setReelSearchQuery: (query: string) => void;
  setActiveReelIndex: (index: number) => void;
  reset: () => void;
}

export const useFeedStore = create<FeedState>((set, get) => ({
  posts: [],
  reels: [],
  stories: [],
  isLoadingPosts: false,
  isLoadingReels: false,
  isLoadingStories: false,
  activeReelIndex: 0,
  reelFeedType: 'for_you',
  reelSearchQuery: '',

  reset: () => {
    set({
      posts: [],
      reels: [],
      stories: [],
      isLoadingPosts: false,
      isLoadingReels: false,
      isLoadingStories: false,
      activeReelIndex: 0,
      reelFeedType: 'for_you',
      reelSearchQuery: '',
    });
  },

  setReelFeedType: (feedType: 'for_you' | 'following') => {
    set({ reelFeedType: feedType });
    get().loadReels(true, feedType);
  },

  setReelSearchQuery: (query: string) => {
    set({ reelSearchQuery: query });
    get().loadReels(true, undefined, query);
  },

  loadFeed: async (refresh = false) => {
    if (refresh) set({ isLoadingPosts: true });
    const res = await api.get<PaginatedResponse<PostSummary>>('/posts/feed?limit=20');
    if (res.success && res.data) {
      set({ posts: res.data.items, isLoadingPosts: false });
    } else {
      set({ isLoadingPosts: false });
    }
  },

  loadReels: async (refresh = false, feedType, query, hashtag) => {
    if (refresh) set({ isLoadingReels: true });
    const activeFeedType = feedType || get().reelFeedType;
    let url = `/reels/feed?limit=20&feedType=${activeFeedType}`;
    const activeQuery = query !== undefined ? query : get().reelSearchQuery;
    if (activeQuery && activeQuery.trim()) {
      url += `&query=${encodeURIComponent(activeQuery.trim())}`;
    }
    if (hashtag && hashtag.trim()) {
      url += `&hashtag=${encodeURIComponent(hashtag.trim())}`;
    }

    const res = await api.get<PaginatedResponse<ReelSummary>>(url);
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

  saveReel: async (reelId: string) => {
    set((state) => ({
      reels: state.reels.map((r) => {
        if (r.id === reelId) {
          return { ...r, isSaved: !r.isSaved };
        }
        return r;
      }),
    }));

    await api.post(`/reels/${reelId}/save`);
  },

  recordReelShare: async (reelId: string) => {
    set((state) => ({
      reels: state.reels.map((r) => {
        if (r.id === reelId) {
          return { ...r, sharesCount: r.sharesCount + 1 };
        }
        return r;
      }),
    }));
    await api.post(`/reels/${reelId}/share`);
  },

  recordReelView: async (reelId: string) => {
    set((state) => ({
      reels: state.reels.map((r) => {
        if (r.id === reelId) {
          return { ...r, viewsCount: r.viewsCount + 1 };
        }
        return r;
      }),
    }));
    await api.post(`/reels/${reelId}/view`);
  },

  toggleFollowCreator: async (creatorId: string) => {
    let isNowFollowing = false;
    set((state) => ({
      reels: state.reels.map((r) => {
        if (r.creatorId === creatorId) {
          isNowFollowing = !r.isFollowingCreator;
          return { ...r, isFollowingCreator: isNowFollowing };
        }
        return r;
      }),
    }));

    if (isNowFollowing) {
      await api.post(`/users/${creatorId}/follow`);
    } else {
      await api.delete(`/users/${creatorId}/unfollow`);
    }
    return isNowFollowing;
  },

  setActiveReelIndex: (index: number) => {
    set({ activeReelIndex: index });
  },
}));

