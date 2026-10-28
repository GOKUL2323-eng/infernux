import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import roomRoutes from './room.routes';
import chatRoutes from './chat.routes';
import callRoutes from './call.routes';
import postRoutes from './post.routes';
import reelRoutes from './reel.routes';
import storyRoutes from './story.routes';
import musicRoutes from './music.routes';
import noteRoutes from './note.routes';
import notificationRoutes from './notification.routes';
import mediaRoutes from './media.routes';
import moderationRoutes from './moderation.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/rooms', roomRoutes);
router.use('/chats', chatRoutes);
router.use('/calls', callRoutes);
router.use('/posts', postRoutes);
router.use('/reels', reelRoutes);
router.use('/stories', storyRoutes);
router.use('/music', musicRoutes);
router.use('/notes', noteRoutes);
router.use('/notifications', notificationRoutes);
router.use('/media', mediaRoutes);
router.use('/moderation', moderationRoutes);

export default router;

