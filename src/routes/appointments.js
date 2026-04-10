import { Router } from 'express';
import {
  createAppointment,
  getMyAppointments,
  getAppointmentById,
  updateAppointmentStatus,
} from '../controllers/appointmentController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.post('/', protect, createAppointment);
router.get('/mine', protect, getMyAppointments);
router.get('/:id', protect, getAppointmentById);
router.patch('/:id/status', protect, updateAppointmentStatus);

export default router;
