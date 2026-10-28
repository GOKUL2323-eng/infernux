import { Router } from 'express';
import { musicController } from '../controllers/music.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { createPlaylistSchema, addTrackToPlaylistSchema } from '@infernux/shared';

const router = Router();

router.use(authenticate);

router.get('/catalog', (req, res, next) => musicController.getCatalog(req, res, next));
router.get('/search', (req, res, next) => musicController.search(req, res, next));
router.get('/track/:id', (req, res, next) => musicController.getTrackById(req, res, next));
router.get('/playlists', (req, res, next) => musicController.getPlaylists(req, res, next));
router.post('/playlists', validateBody(createPlaylistSchema), (req, res, next) =>
  musicController.createPlaylist(req, res, next)
);
router.post('/playlists/:id/tracks', validateBody(addTrackToPlaylistSchema), (req, res, next) =>
  musicController.addTrackToPlaylist(req, res, next)
);

export default router;

