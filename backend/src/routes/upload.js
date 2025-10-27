const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAdmin } = require('../utils/auth');

const router = express.Router();

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置multer存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名：时间戳 + 随机数 + 原始扩展名
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 1000);
    const ext = path.extname(file.originalname);
    const filename = `${timestamp}_${randomNum}${ext}`;
    cb(null, filename);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  // 只允许图片文件
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件'), false);
  }
};

// 配置multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB限制
    files: 1 // 一次只能上传一个文件
  }
});

/**
 * @swagger
 * /api/admin/upload/image:
 *   post:
 *     summary: Upload image file
 *     tags: [Admin - Upload]
 *     security:
 *       - AdminToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file to upload
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 url:
 *                   type: string
 *                   description: URL of uploaded image
 *                 filename:
 *                   type: string
 *                   description: Generated filename
 *                 originalName:
 *                   type: string
 *                   description: Original filename
 *                 size:
 *                   type: integer
 *                   description: File size in bytes
 *       400:
 *         description: Invalid file or upload error
 *       401:
 *         description: Unauthorized
 *       413:
 *         description: File too large
 */
router.post('/image', requireAdmin, (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          success: false,
          error: 'File too large',
          message: '文件大小不能超过10MB'
        });
      }
      return res.status(400).json({
        success: false,
        error: 'Upload error',
        message: err.message
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        error: 'Upload error',
        message: err.message
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        message: '请选择要上传的图片文件'
      });
    }

    // 构建文件URL
    const host = req.get('host');
    const protocol = req.protocol;
    const baseUrl = `${protocol}://${host}`;
    const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;

    console.log('Generated file URL:', fileUrl);

    res.json({
      success: true,
      url: fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  });
});

/**
 * @swagger
 * /api/admin/upload/delete:
 *   delete:
 *     summary: Delete uploaded file
 *     tags: [Admin - Upload]
 *     security:
 *       - AdminToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               filename:
 *                 type: string
 *                 description: Filename to delete
 *     responses:
 *       200:
 *         description: File deleted successfully
 *       400:
 *         description: Invalid filename
 *       404:
 *         description: File not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/delete', requireAdmin, (req, res) => {
  try {
    const { filename } = req.body;

    if (!filename) {
      return res.status(400).json({
        success: false,
        error: 'Missing filename',
        message: '请提供要删除的文件名'
      });
    }

    // 安全检查：确保文件名不包含路径遍历
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid filename',
        message: '无效的文件名'
      });
    }

    const filePath = path.join(uploadDir, filename);

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'File not found',
        message: '文件不存在'
      });
    }

    // 删除文件
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: '文件删除成功'
    });

  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      error: 'Delete failed',
      message: '删除文件失败'
    });
  }
});

module.exports = router;
