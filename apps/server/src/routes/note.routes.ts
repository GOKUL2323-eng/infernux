import { Router } from 'express';
import { noteController } from '../controllers/note.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import {
  createPrivateNoteSchema,
  updatePrivateNoteSchema,
  createSocialNoteSchema,
} from '@infernux/shared';

const router = Router();

router.use(authenticate);

// Private Notes
router.post('/private', validateBody(createPrivateNoteSchema), (req, res, next) =>
  noteController.createPrivateNote(req, res, next)
);
router.get('/private', (req, res, next) => noteController.getPrivateNotes(req, res, next));
router.patch('/private/:id', validateBody(updatePrivateNoteSchema), (req, res, next) =>
  noteController.updatePrivateNote(req, res, next)
);
router.delete('/private/:id', (req, res, next) =>
  noteController.deletePrivateNote(req, res, next)
);

// Social Notes
router.post('/social', validateBody(createSocialNoteSchema), (req, res, next) =>
  noteController.createSocialNote(req, res, next)
);
router.get('/social/feed', (req, res, next) =>
  noteController.getSocialNotesFeed(req, res, next)
);
router.post('/social/:id/like', (req, res, next) =>
  noteController.likeSocialNote(req, res, next)
);

export default router;

