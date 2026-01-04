import { Router, Request, Response, NextFunction, Router as ExpressRouter } from 'express';
import { db } from '../db';
import { products } from '../db/schema';
import { eq } from 'drizzle-orm';
import { validateRequest, ValidationError } from '../middleware/validation';
import { createProductSchema, updateProductSchema, CreateProductInput, UpdateProductInput } from '../validators';
import { uploadMiddleware } from '../middleware/upload';
import { uploadImage, deleteImage } from '../services/minio';

const router: ExpressRouter = Router();

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: List of all products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [success, data]
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       description:
 *                         type: string
 *                         nullable: true
 *                       price:
 *                         type: integer
 *                       imageId:
 *                         type: string
 *                         nullable: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *             example:
 *               success: true
 *               data:
 *                 - id: 1
 *                   name: "Espresso"
 *                   description: "Single shot"
 *                   price: 25000
 *                   imageId: null
 *                   createdAt: "2026-01-04T00:00:00.000Z"
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const allProducts = await db.query.products.findMany();
    res.json({
      success: true,
      data: allProducts,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get a product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [success, data]
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                       nullable: true
 *                     price:
 *                       type: integer
 *                     imageId:
 *                       type: string
 *                       nullable: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *             example:
 *               success: true
 *               data:
 *                 id: 1
 *                 name: "Espresso"
 *                 description: "Single shot"
 *                 price: 25000
 *                 imageId: null
 *                 createdAt: "2026-01-04T00:00:00.000Z"
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [success, message]
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *             example:
 *               success: false
 *               message: "Product not found"
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      throw new ValidationError(400, { id: 'Invalid product ID' });
    }

    const product = await db.query.products.findFirst({
      where: eq(products.id, id),
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, price]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: integer
 *               imageId:
 *                 type: string
 *           example:
 *             name: "Espresso"
 *             description: "Single shot"
 *             price: 25000
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, price]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: integer
 *               imageId:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [success, data]
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                       nullable: true
 *                     price:
 *                       type: integer
 *                     imageId:
 *                       type: string
 *                       nullable: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *             example:
 *               success: true
 *               data:
 *                 id: 1
 *                 name: "Espresso"
 *                 description: "Single shot"
 *                 price: 25000
 *                 imageId: "minio-object-id"
 *                 createdAt: "2026-01-04T00:00:00.000Z"
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [success, message]
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 errors:
 *                   type: object
 *                   additionalProperties:
 *                     type: string
 *             example:
 *               success: false
 *               message: "Validation failed"
 *               errors:
 *                 name: "Product name is required"
 *                 price: "Price is required and must be a number"
 */
router.post(
  '/',
  uploadMiddleware.single('image'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      let imageId: string | undefined;

      // Handle file upload
      if (req.file) {
        imageId = await uploadImage(req.file.originalname, req.file.buffer, req.file.mimetype);
      }

      // Get data from form data or JSON
      const name = req.body.name;
      const price = req.body.price ? parseInt(req.body.price, 10) : undefined;
      const description = req.body.description || undefined;
      const providedImageId = req.body.imageId || undefined;

      // Validate required fields
      if (!name || price === undefined || isNaN(price)) {
        if (imageId) {
          await deleteImage(imageId);
        }
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: {
            name: !name ? 'Product name is required' : undefined,
            price: price === undefined || isNaN(price) ? 'Price is required and must be a number' : undefined,
          },
        });
      }

      if (price <= 0) {
        if (imageId) {
          await deleteImage(imageId);
        }
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: { price: 'Price must be positive' },
        });
      }

      const finalImageId = imageId || providedImageId;

      const result = await db
        .insert(products)
        .values({
          name,
          price,
          description,
          imageId: finalImageId,
        })
        .returning();

      res.status(201).json({
        success: true,
        data: result[0],
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Update a product
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: integer
 *               imageId:
 *                 type: string
 *           example:
 *             description: "Updated description"
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [success, data]
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                       nullable: true
 *                     price:
 *                       type: integer
 *                     imageId:
 *                       type: string
 *                       nullable: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Product not found
 *       400:
 *         description: Validation error
 */
router.put(
  '/:id',
  validateRequest(updateProductSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        throw new ValidationError(400, { id: 'Invalid product ID' });
      }

      const data: UpdateProductInput = req.body;

      const result = await db
        .update(products)
        .set(data)
        .where(eq(products.id, id))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Product not found',
        });
      }

      res.json({
        success: true,
        data: result[0],
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Delete a product
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [success, message]
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *             example:
 *               success: true
 *               message: "Product deleted successfully"
 *       404:
 *         description: Product not found
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      throw new ValidationError(400, { id: 'Invalid product ID' });
    }

    // Get product before deletion to get imageId
    const product = await db.query.products.findFirst({
      where: eq(products.id, id),
    });

    const result = await db
      .delete(products)
      .where(eq(products.id, id))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Delete image from MinIO if it exists
    if (product?.imageId) {
      try {
        await deleteImage(product.imageId);
      } catch (error) {
        console.error('Error deleting image from MinIO:', error);
        // Don't fail the API call if image deletion fails
      }
    }

    res.json({
      success: true,
      message: 'Product deleted successfully',
      data: result[0],
    });
  } catch (error) {
    next(error);
  }
});

export default router;
