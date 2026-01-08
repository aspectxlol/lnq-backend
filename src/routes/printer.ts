import { Router, Request, Response, NextFunction, Router as ExpressRouter } from 'express';
import { db } from '../db';
import { orders } from '../db/schema';
import { eq } from 'drizzle-orm';
import { ValidationError } from '../middleware/validation';
import { buildPrinterOutput, writeToPrinterDevice, PrinterOrder } from '../services/printer';

const router: ExpressRouter = Router();

/**
 * @swagger
 * /api/printer/orders/{id}/print:
 *   post:
 *     summary: Print an order to ESC/POS printer
 *     tags: [Printer]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Print job sent
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
 *                   required: [printed, devicePath, orderId]
 *                   properties:
 *                     printed:
 *                       type: boolean
 *                     devicePath:
 *                       type: string
 *                     orderId:
 *                       type: integer
 *             example:
 *               success: true
 *               data:
 *                 printed: true
 *                 devicePath: "/dev/usb/lp0"
 *                 orderId: 10
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
 *       400:
 *         description: Validation error
 */
router.post('/orders/:id/print', async (req: Request, res: Response, next: NextFunction) => {
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

    const printable: PrinterOrder = {
      id: order.id,
      customer: order.customerName,
      date: order.createdAt ?? new Date(),
      pickupDate: order.pickupDate ?? null,
      notes: order.notes ?? null,
      items: order.items.map((item) => {
        if (item.itemType === 'custom') {
          return {
            name: item.customName ?? 'Custom Item',
            quantity: 1,
            price: item.priceAtSale ?? item.customPrice ?? 0,
            notes: item.notes ? [item.notes] : undefined,
          };
        } else {
          return {
            name: item.product?.name ?? `Product ${item.productId}`,
            quantity: item.amount ?? 1,
            price: item.priceAtSale ?? item.product?.price ?? 0,
            notes: item.notes ? [item.notes] : undefined,
          };
        }
      }),
    };

    const devicePath = process.env.PRINTER_DEVICE_PATH || '/dev/usb/lp0';

    const output = buildPrinterOutput(printable);
    await writeToPrinterDevice(devicePath, output);

    res.json({
      success: true,
      data: {
        printed: true,
        devicePath,
        orderId: order.id,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
