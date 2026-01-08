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
 *                       notes:
 *                         type: string
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
 *                             notes:
 *                               type: string
 *                               nullable: true
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
 *                   notes: null
 *                   createdAt: "2026-01-04T00:00:00.000Z"
 *                   items:
 *                     - id: 100
 *                       orderId: 10
 *                       productId: 1
 *                       amount: 2
 *                       notes: null
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
 *               notes:
 *                 type: string
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
 *                     notes:
 *                       type: string
 *                     priceAtSale:
 *                       type: integer
 *                       description: Price at sale (optional, overrides current product price)
 *           example:
 *             notes: "Please call when ready"
 *             customerName: "Alice"
 *             pickupDate: null
 *             items:
 *               - productId: 1
 *                 amount: 2
 *                 notes: "Extra hot"
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
          await Promise.all(
            data.items.map(async (item) => {
              let priceAtSale;
              if ('priceAtSale' in item && typeof item.priceAtSale === 'number') {
                priceAtSale = item.priceAtSale;
              } else {
                const product = await db.query.products.findFirst({
                  where: eq(products.id, item.productId),
                });
                priceAtSale = product?.price ?? null;
              }
              return {
                orderId,
                productId: item.productId,
                amount: item.amount,
                notes: item.notes,
                priceAtSale,
              };
            })
          )
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
 *               notes:
 *                 type: string
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
 *                     notes:
 *                       type: string
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

      // Build update object with only provided fields
      const updateData: Partial<typeof orders.$inferInsert> = {};
      if (data.customerName !== undefined) updateData.customerName = data.customerName;
      if (data.pickupDate !== undefined) updateData.pickupDate = data.pickupDate;
      if (data.notes !== undefined) updateData.notes = data.notes;

      // Update order details only if there are fields to update
      if (Object.keys(updateData).length > 0) {
        const result = await db
          .update(orders)
          .set(updateData)
          .where(eq(orders.id, id))
          .returning();

        if (result.length === 0) {
          return res.status(404).json({
            success: false,
            message: 'Order not found',
          });
        }
      } else {
        // If no order fields to update, just verify order exists
        const exists = await db.query.orders.findFirst({
          where: eq(orders.id, id),
        });

        if (!exists) {
          return res.status(404).json({
            success: false,
            message: 'Order not found',
          });
        }
      }

      // If items are provided, replace all items
      if (data.items) {
        // Delete existing items
        await db.delete(orderItems).where(eq(orderItems.orderId, id));

        // Insert new items, allow priceAtSale override
        await db
          .insert(orderItems)
          .values(
            await Promise.all(
              data.items.map(async (item) => {
                let priceAtSale;
                if ('priceAtSale' in item && typeof item.priceAtSale === 'number') {
                  priceAtSale = item.priceAtSale;
                } else {
                  const product = await db.query.products.findFirst({
                    where: eq(products.id, item.productId),
                  });
                  priceAtSale = product?.price ?? null;
                }
                return {
                  orderId: id,
                  productId: item.productId,
                  amount: item.amount,
                  notes: item.notes,
                  priceAtSale,
                };
              })
            )
          );
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
