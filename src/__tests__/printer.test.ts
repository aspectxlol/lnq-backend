import request from 'supertest';
import app from '../index';
import { db, closeConnection } from '../db';
import { orders, orderItems, products } from '../db/schema';
import { writeToPrinterDevice } from '../services/printer';

// Mock the printer service to avoid actual hardware interactions during tests

jest.mock('../services/printer', () => {
  const actual = jest.requireActual('../services/printer');
  return {
    ...actual,
    writeToPrinterDevice: jest.fn().mockResolvedValue(undefined),
  };
});

describe('Printer Routes', () => {
  let testProductId: number;

  beforeAll(async () => {
    process.env.PRINTER_DEVICE_PATH = '/dev/usb/lp0';

    const productResult = await db
      .insert(products)
      .values({
        name: 'Test Product for Printer',
        price: 12000,
      })
      .returning();

    testProductId = productResult[0].id;
  });

  afterAll(async () => {
    await closeConnection();
  });

  it('POST /api/printer/orders/:id/print should send a print job', async () => {
    const orderResult = await db
      .insert(orders)
      .values({
        customerName: 'Print Customer',
      })
      .returning();

    const orderId = orderResult[0].id;

    await db.insert(orderItems).values({
      orderId,
      productId: testProductId,
      amount: 2,
    });

    const res = await request(app).post(`/api/printer/orders/${orderId}/print`).expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.orderId).toBe(orderId);
    expect(writeToPrinterDevice).toHaveBeenCalled();
  });
});
