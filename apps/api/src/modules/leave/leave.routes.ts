/**
 * `/api/v1/leaves` router. Mounted by `routes/index.ts` (S03's TODO comment marks
 * where). Auth + RBAC middleware wired per endpoint per docs/API.md §4.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import * as leaveController from './leave.controller.js';

// ponytail: local disk storage, not an object store — fine for the hackathon MVP.
// Upgrade path: swap `destination`/`filename` for an S3-style upload if that's ever needed.
const uploadDir = path.join(process.cwd(), 'uploads', 'leave-attachments');
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, cb) =>
      cb(null, `${crypto.randomUUID()}${path.extname(file.originalname)}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});

export const leaveRouter = Router();

// Multer only parses `multipart/form-data` bodies; a plain JSON apply-leave
// request (with an optional pre-uploaded `attachmentUrl`) passes through untouched.
leaveRouter.post('/', requireAuth, upload.single('file'), leaveController.apply);
leaveRouter.get('/me', requireAuth, leaveController.getMine);
leaveRouter.get('/balance/me', requireAuth, leaveController.getMyBalance);
leaveRouter.post('/allocations', requireAuth, requireRole('ADMIN', 'HR'), leaveController.allocate);
leaveRouter.get('/', requireAuth, requireRole('ADMIN', 'HR'), leaveController.listAll);
leaveRouter.patch('/:id/approve', requireAuth, requireRole('ADMIN', 'HR'), leaveController.approve);
leaveRouter.patch('/:id/reject', requireAuth, requireRole('ADMIN', 'HR'), leaveController.reject);
