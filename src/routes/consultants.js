import { Router } from 'express';
import { getMyProfile, updateMyProfile, uploadProfilePhoto as uploadProfilePhotoHandler, uploadDocuments as uploadDocumentsHandler, deleteDocument, getMyAvailability, addAvailability, deleteAvailability } from '../controllers/consultantController.js';
import { protect } from '../middleware/auth.js';
import { uploadProfilePhoto, uploadDocuments } from '../config/upload.js';

const router = Router();
router.use(protect);

router.get('/me', getMyProfile);
router.patch('/me', updateMyProfile);
router.post('/me/profile-photo', (req, res, next) => { uploadProfilePhoto(req, res, (err) => { if (err) return res.status(400).json({ message: err.message }); next(); }); }, uploadProfilePhotoHandler);
router.post('/me/documents', (req, res, next) => { uploadDocuments(req, res, (err) => { if (err) return res.status(400).json({ message: err.message }); next(); }); }, uploadDocumentsHandler);
router.delete('/me/documents/:docId', deleteDocument);
router.get('/me/availability', getMyAvailability);
router.post('/me/availability', addAvailability);
router.delete('/me/availability/:slotId', deleteAvailability);

export default router;
