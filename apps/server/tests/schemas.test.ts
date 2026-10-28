import {
  registerSchema,
  loginSchema,
  createRoomSchema,
  joinRoomByKeySchema,
  sendMessageSchema,
  initiateCallSchema,
  createPostSchema,
  createReelSchema,
  createStorySchema,
  createPrivateNoteSchema,
  createSocialNoteSchema,
} from '@infernux/shared';

describe('Zod Validation Schemas', () => {
  describe('Authentication Schemas', () => {
    it('validates a correct registration payload', () => {
      const valid = {
        username: 'infernux_user',
        email: 'user@infernux.com',
        password: 'Password123',
        displayName: 'Infernux Hero',
      };
      const result = registerSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects passwords without required complexity', () => {
      const invalid = {
        username: 'user1',
        email: 'u@test.com',
        password: 'alllowercase',
        displayName: 'Test',
      };
      const result = registerSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('validates login credentials', () => {
      const valid = { loginIdentifier: 'infernux_user', password: 'Password123' };
      expect(loginSchema.safeParse(valid).success).toBe(true);
    });
  });

  describe('Room Schemas', () => {
    it('validates room creation', () => {
      const valid = {
        name: 'The Lounge',
        description: 'Private room for discussions',
        isPrivate: true,
      };
      expect(createRoomSchema.safeParse(valid).success).toBe(true);
    });

    it('validates joining room by key', () => {
      const valid = { secretKey: 'IFNX-4567-89AB-CDEF' };
      expect(joinRoomByKeySchema.safeParse(valid).success).toBe(true);
    });
  });

  describe('Chat & Calling Schemas', () => {
    it('validates sending a message with attachments', () => {
      const valid = {
        conversationId: 'conv_123',
        content: 'Check out this photo',
        contentType: 'image',
        attachments: [
          {
            url: 'https://images.example.com/photo.jpg',
            type: 'image',
          },
        ],
      };
      expect(sendMessageSchema.safeParse(valid).success).toBe(true);
    });

    it('validates initiating a voice or video call', () => {
      const voiceCall = { recipientId: 'user_456', callType: 'voice' };
      const videoCall = { recipientId: 'user_456', callType: 'video' };
      expect(initiateCallSchema.safeParse(voiceCall).success).toBe(true);
      expect(initiateCallSchema.safeParse(videoCall).success).toBe(true);
    });
  });

  describe('Media & Social Schemas', () => {
    it('validates creating a post with media', () => {
      const post = {
        caption: 'First post on Infernux! #welcome #social',
        media: [{ url: 'https://cdn.example.com/image.jpg', type: 'image' }],
      };
      expect(createPostSchema.safeParse(post).success).toBe(true);
    });

    it('validates creating a reel', () => {
      const reel = {
        videoUrl: 'https://cdn.example.com/short.mp4',
        thumbnailUrl: 'https://cdn.example.com/thumb.jpg',
        caption: 'Amazing sunset timelapse',
        duration: 25,
      };
      expect(createReelSchema.safeParse(reel).success).toBe(true);
    });

    it('validates creating a 24h story', () => {
      const story = {
        mediaType: 'image',
        mediaUrl: 'https://cdn.example.com/story.jpg',
        audience: 'followers',
        duration: 5,
      };
      expect(createStorySchema.safeParse(story).success).toBe(true);
    });
  });

  describe('Notes Schemas', () => {
    it('validates creating a private note', () => {
      const note = {
        title: 'Project Roadmap',
        content: 'Milestone 1 through 12 complete',
        tags: ['infernux', 'dev'],
        isPinned: true,
      };
      expect(createPrivateNoteSchema.safeParse(note).success).toBe(true);
    });

    it('validates creating a social note status with music', () => {
      const social = {
        text: 'Vibing to synthwave today',
        emoji: '🔥',
        musicTrackId: 'track_789',
        audience: 'followers',
      };
      expect(createSocialNoteSchema.safeParse(social).success).toBe(true);
    });
  });
});
