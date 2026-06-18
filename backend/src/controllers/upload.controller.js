const multer = require('multer');
const sharp  = require('sharp');
const path   = require('path');
const fs     = require('fs');
const { query } = require('../config/database');
const ApiError  = require('../utils/ApiError');

// Ensure upload directories exist
const uploadDir        = path.join(__dirname, '../../uploads/avatars');
const coverImageDir    = path.join(__dirname, '../../uploads/project-images');
if (!fs.existsSync(uploadDir))     fs.mkdirSync(uploadDir, { recursive: true });
if (!fs.existsSync(coverImageDir)) fs.mkdirSync(coverImageDir, { recursive: true });

// Multer config — memory storage so sharp can process before saving
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WebP and GIF images are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

// Middleware to handle single avatar upload
const uploadMiddleware = upload.single('avatar');

const uploadAvatar = async (req, res, next) => {
  uploadMiddleware(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(ApiError.badRequest('Image must be under 5MB.'));
      }
      return next(ApiError.badRequest(err.message));
    }
    if (err) return next(ApiError.badRequest(err.message));
    if (!req.file) return next(ApiError.badRequest('No image file provided.'));

    try {
      const userId   = req.user.userId;
      const filename = `${userId}_${Date.now()}.jpg`;
      const filepath = path.join(uploadDir, filename);

      // Resize and convert to JPEG using sharp
      await sharp(req.file.buffer)
        .resize(200, 200, { fit: 'cover', position: 'centre' })
        .jpeg({ quality: 85 })
        .toFile(filepath);

      // Delete old uploaded avatar if exists
      const oldResult = await query(
        'SELECT avatar_url FROM users WHERE id = $1',
        [userId]
      );
      const oldUrl = oldResult.rows[0]?.avatar_url;
      if (oldUrl && oldUrl.startsWith('/uploads/avatars/')) {
        const oldFile = path.join(__dirname, '../..', oldUrl);
        if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
      }

      const avatarUrl = `/uploads/avatars/${filename}`;

      await query(
        'UPDATE users SET avatar_url = $1 WHERE id = $2',
        [avatarUrl, userId]
      );

      res.json({ success: true, avatarUrl });
    } catch (error) {
      next(error);
    }
  });
};

// ── Cover image upload for projects ──────────────────────────────
const coverUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

const coverUploadMiddleware = coverUpload.single('image');

const uploadCoverImage = async (req, res, next) => {
  coverUploadMiddleware(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') return next(ApiError.badRequest('Image must be under 5MB.'));
      return next(ApiError.badRequest(err.message));
    }
    if (err) return next(ApiError.badRequest(err.message));
    if (!req.file) return next(ApiError.badRequest('No image file provided.'));

    try {
      const projectId = req.params.id;
      const userId    = req.user.userId;

      // Verify project ownership
      const projectResult = await query(
        'SELECT submitted_by, cover_image FROM projects WHERE id = $1 AND deleted_at IS NULL',
        [projectId]
      );
      if (!projectResult.rows.length) return next(ApiError.notFound('Project not found.'));
      if (projectResult.rows[0].submitted_by !== userId) return next(ApiError.forbidden('Not your project.'));

      const filename = `${projectId}_${Date.now()}.webp`;
      const filepath = path.join(coverImageDir, filename);

      // Resize to 1200x630 (OG ratio) and convert to WebP
      await sharp(req.file.buffer)
        .resize(1200, 630, { fit: 'cover', position: 'centre' })
        .webp({ quality: 85 })
        .toFile(filepath);

      // Delete old cover image if exists
      const oldUrl = projectResult.rows[0].cover_image;
      if (oldUrl && oldUrl.startsWith('/uploads/project-images/')) {
        const oldFile = path.join(__dirname, '../..', oldUrl);
        if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
      }

      const coverImage = `/uploads/project-images/${filename}`;
      await query('UPDATE projects SET cover_image = $1 WHERE id = $2', [coverImage, projectId]);

      res.json({ success: true, coverImage });
    } catch (error) {
      next(error);
    }
  });
};

module.exports = { uploadAvatar, uploadCoverImage };