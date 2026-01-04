import multer, { StorageEngine } from 'multer';
import { Request } from 'express';
import { ValidationError } from './validation';

// Memory storage for handling file uploads
const storage: StorageEngine = multer.memoryStorage();

// Filter to accept only image files
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ValidationError(400, { image: 'Only image files are allowed' }));
  }
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Extend Express Request to include file
declare global {
  namespace Express {
    interface Request {
      file?: Express.Multer.File;
    }
  }
}
