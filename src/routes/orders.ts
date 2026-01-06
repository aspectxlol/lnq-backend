import { Router, Request, Response, NextFunction, Router as ExpressRouter } from 'express';
import { db } from '../db';
import { orders, orderItems, products } from '../db/schema';
import { eq } from 'drizzle-orm';
import { validateRequest, ValidationError } from '../middleware/validation';
import { createOrderSchema, updateOrderSchema, CreateOrderInput, UpdateOrderInput } from '../validators';

const router: ExpressRouter = Router();

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get all orders with their items
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: List of all orders
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
 *                       customerName:
 *                         type: string
 *                       pickupDate:
 *                         type: string
 *                         format: date
 *                         nullable: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       items:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                             orderId:
 *                               type: integer
 *                             productId:
 *                               type: integer
 *                             amount:
 *                               type: integer
 *                             product:
 *                               type: object
 *                               nullable: true
 *                               properties:
 *                                 id:
 *                                   type: integer
 *                                 name:
 *                                   type: string
 *                                 price:
 *                                   type: integer
 *             example:
 *               success: true
 *               data:
 *                 - id: 10
 *                   customerName: "Alice"
 *                   pickupDate: null
 *                   createdAt: "2026-01-04T00:00:00.000Z"
 *                   items:
 *                     - id: 100
 *                       orderId: 10
 *                       productId: 1
 *                       amount: 2
 *                       product:
 *                         id: 1
 *                         name: "Espresso"
 *                         price: 25000
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const allOrders = await db.query.orders.findMany({
      with: {
        items: {
          with: {
            product: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: allOrders,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get an order by ID
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order details
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
 *                     customerName:
 *                       type: string
 *                     pickupDate:
 *                       type: string
 *                       format: date
 *                       nullable: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           orderId:
 *                             type: integer
 *                           productId:
 *                             type: integer
 *                           amount:
 *                             type: integer
 *                           product:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               id:
 *                                 type: integer
 *                               name:
 *                                 type: string
 *                               price:
 *                                 type: integer
 *       404:
 *         description: Order not found
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
 *               message: "Order not found"
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      throw new ValidationError(400, { id: 'Invalid order ID' });
    }

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
      with: {
        items: {
          with: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create a new order with items
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [customerName, items]
 *             properties:
 *               customerName:
 *                 type: string
 *               pickupDate:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required: [productId, amount]
 *                   properties:
 *                     productId:
 *                       type: integer
 *                     amount:
 *                       type: integer
 *           example:
 *             customerName: "Alice"
 *             pickupDate: null
 *             items:
 *               - productId: 1
 *                 amount: 2
 *     responses:
 *       201:
 *         description: Order created successfully
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
 *       400:
 *         description: Validation error
 */
router.post(
  '/',
  validateRequest(createOrderSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data: CreateOrderInput = req.body;

      // Create order
      const createdOrder = await db
        .insert(orders)
        .values({
          customerName: data.customerName,
          pickupDate: data.pickupDate,
        })
        .returning();

      const orderId = createdOrder[0].id;

      // Create order items
      const items = await db
        .insert(orderItems)
        .values(
          data.items.map((item) => ({
            orderId,
            productId: item.productId,
            amount: item.amount,
          }))
        )
        .returning();

      const completeOrder = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
        with: {
          items: {
            with: {
              product: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        data: completeOrder,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/orders/{id}:
 *   put:
 *     summary: Update an order
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               customerName:
 *                 type: string
 *               pickupDate:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *           example:
 *             pickupDate: "2026-01-05"
 *     responses:
 *       200:
 *         description: Order updated successfully
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
 *       404:
 *         description: Order not found
 *       400:
 *         description: Validation error
 */
router.put(
  '/:id',
  validateRequest(updateOrderSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        throw new ValidationError(400, { id: 'Invalid order ID' });
      }

      const data: UpdateOrderInput = req.body;

      const result = await db
        .update(orders)
        .set(data)
        .where(eq(orders.id, id))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Order not found',
        });
      }

      const completeOrder = await db.query.orders.findFirst({
        where: eq(orders.id, id),
        with: {
          items: {
            with: {
              product: true,
            },
          },
        },
      });

      res.json({
        success: true,
        data: completeOrder,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/orders/{id}:
 *   delete:
 *     summary: Delete an order
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order deleted successfully
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
 *       404:
 *         description: Order not found
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isNaN(id)) {
      throw new ValidationError(400, { id: 'Invalid order ID' });
    }

    const result = await db
      .delete(orders)
      .where(eq(orders.id, id))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    res.json({
      success: true,
      message: 'Order deleted successfully',
      data: result[0],
    });
  } catch (error) {
    next(error);
  }
});

export default router;
