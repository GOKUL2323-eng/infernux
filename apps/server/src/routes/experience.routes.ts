import { Router } from 'express';
import { experienceController } from '../controllers/experience.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import {
  createMemoryCapsuleSchema,
  createMoodEntrySchema,
  createTogetherSessionSchema,
  signGuestbookSchema,
  syncTogetherStateSchema,
  updateInteractiveProfileSchema,
  updateSmartPresenceSchema,
} from '@infernux/shared';

const router = Router();
router.use(authenticate);

// Memory Capsules
router.get('/capsules', (req, res, next) => experienceController.listCapsules(req, res, next));
router.post('/capsules', validateBody(createMemoryCapsuleSchema), (req, res, next) =>
  experienceController.createCapsule(req, res, next)
);

// MoodSpace
router.get('/moods', (req, res, next) => experienceController.getMyMoods(req, res, next));
router.get('/moods/feed', (req, res, next) => experienceController.getMoodFeed(req, res, next));
router.post('/moods', validateBody(createMoodEntrySchema), (req, res, next) =>
  experienceController.logMood(req, res, next)
);

// Together Mode
router.get('/together', (req, res, next) => experienceController.listTogether(req, res, next));
router.post('/together', validateBody(createTogetherSessionSchema), (req, res, next) =>
  experienceController.createTogether(req, res, next)
);
router.post('/together/:id/join', (req, res, next) =>
  experienceController.joinTogether(req, res, next)
);
router.post('/together/:id/sync', validateBody(syncTogetherStateSchema), (req, res, next) =>
  experienceController.syncTogether(req, res, next)
);
router.post('/together/:id/end', (req, res, next) =>
  experienceController.endTogether(req, res, next)
);

// Smart Presence & Interactive Profile
router.put('/presence', validateBody(updateSmartPresenceSchema), (req, res, next) =>
  experienceController.updatePresence(req, res, next)
);
router.put('/profile/interactive', validateBody(updateInteractiveProfileSchema), (req, res, next) =>
  experienceController.updateInteractiveProfile(req, res, next)
);
router.post('/profile/:userId/guestbook', validateBody(signGuestbookSchema), (req, res, next) =>
  experienceController.signGuestbook(req, res, next)
);

export default router;

