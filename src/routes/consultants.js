import { Router } from 'express';
import {
  getMyProfile,
  updateMyProfile,
  getMyAvailability,
  addAvailability,
  deleteAvailability,
} from '../controllers/consultantController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(protect);

router.get('/me', getMyProfile);
router.patch('/me', updateMyProfile);
router.get('/me/availability', getMyAvailability);
router.post('/me/availability', addAvailability);
router.delete('/me/availability/:slotId', deleteAvailability);

export default router;
