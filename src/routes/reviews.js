import { Router } from 'express';
import { createReview, getConsultantReviews } from '../controllers/reviewController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.post('/', protect, createReview);
router.get('/consultant/:id', getConsultantReviews);

export default router;
