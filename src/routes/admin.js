import { Router } from 'express';
import {
  getStats,
  getAllUsers,
  updateUserStatus,
  getAllConsultants,
  updateConsultantStatus,
  getAllSessions,
} from '../controllers/adminController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = Router();

router.use(protect, adminOnly);

router.get('/stats', getStats);
router.get('/users', getAllUsers);
router.patch('/users/:id/status', updateUserStatus);
router.get('/consultants', getAllConsultants);
router.patch('/consultants/:id/status', updateConsultantStatus);
router.get('/sessions', getAllSessions);

export default router;
