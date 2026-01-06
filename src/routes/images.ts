import { Router, Request, Response, NextFunction } from 'express';
import minioClient from '../services/minio';
import dotenv from 'dotenv';

dotenv.config();

const router: Router = Router();
const bucketName = process.env.MINIO_BUCKET_NAME || 'images';

/**
 * @swagger
 * /api/images/{filename}:
 *   get:
 *     summary: Get an image by filename
 *     tags: [Images]
 *     parameters:
 *       - in: path
 *         name: filename
 *         schema:
 *           type: string
 *         required: true
 *         description: Image filename (e.g., 1767687756522-H037.jpeg)
 *     responses:
 *       200:
 *         description: Image file
 *         content:
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *           image/gif:
 *             schema:
 *               type: string
 *               format: binary
 *           image/webp:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Image not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Image not found
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 */
router.get('/:filename', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filename } = req.params;

    // Get the image from MinIO
    const dataStream = await minioClient.getObject(bucketName, filename);

    // Get object metadata to set correct content type
    const stat = await minioClient.statObject(bucketName, filename);

    // Set appropriate headers
    res.setHeader('Content-Type', stat.metaData['content-type'] || 'image/jpeg');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

    // Pipe the stream to response
    dataStream.pipe(res);
  } catch (error: any) {
    // Handle specific MinIO errors
    if (error.code === 'NoSuchKey' || error.code === 'NotFound') {
      return res.status(404).json({
        success: false,
        message: 'Image not found',
      });
    }

    // Pass other errors to error handler
    next(error);
  }
});

export default router;
