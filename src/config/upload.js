import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = 'uploads';
const profileDir = path.join(uploadDir, 'profiles');
const docsDir = path.join(uploadDir, 'documents');

[uploadDir, profileDir, docsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const profileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, profileDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `profile-${req.user._id}-${Date.now()}${ext}`);
  },
});

const documentStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, docsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `doc-${req.user._id}-${Date.now()}-${safeName}`);
  },
});

const imageFilter = (_req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowed.test(file.mimetype.split('/')[1]);
  cb(extOk && mimeOk ? null : new Error('Only image files allowed'), extOk && mimeOk);
};

const documentFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  const allowed = /jpeg|jpg|png|gif|webp|pdf/;
  const mimeOk = file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/');
  cb(allowed.test(ext) && mimeOk ? null : new Error('Only image and PDF files allowed'), allowed.test(ext) && mimeOk);
};

export const uploadProfilePhoto = multer({
  storage: profileStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single('profilePhoto');

export const uploadDocuments = multer({
  storage: documentStorage,
  fileFilter: documentFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
}).array('documents', 5);
