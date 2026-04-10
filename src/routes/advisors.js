import { Router } from 'express';
import { getAdvisors, getAdvisorById, getAdvisorAvailability } from '../controllers/advisorController.js';

const router = Router();

router.get('/', getAdvisors);
router.get('/:id', getAdvisorById);
router.get('/:id/availability', getAdvisorAvailability);

export default router;
