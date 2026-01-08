import request from 'supertest';
import app from '../index';
import { db, closeConnection } from '../db';
import { orders, orderItems, products } from '../db/schema';

// Integration tests for order management endpoints

describe('Orders Routes', () => {
  let testProductId: number;

  beforeAll(async () => {
    // Create test product
    const result = await db.insert(products).values({
      name: 'Test Product for Orders',
      price: 100000,
    }).returning();
    testProductId = result[0].id;
  });

  afterAll(async () => {
    await closeConnection();
  });

  describe('GET /api/orders', () => {
    it('should return all orders', async () => {
      const res = await request(app)
        .get('/api/orders')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      for (const order of res.body.data) {
        expect(typeof order.id).toBe('number');
        expect(typeof order.customerName).toBe('string');
        expect(Array.isArray(order.items)).toBe(true);
        for (const item of order.items) {
          expect(typeof item.id).toBe('number');
          expect(typeof item.productId).toBe('number');
          expect(typeof item.amount).toBe('number');
          expect(['number', 'object'].includes(typeof item.priceAtSale)).toBe(true);
        }
      }
    });
  });

  describe('GET /api/orders/:id', () => {
    let orderId: number;

    beforeAll(async () => {
      // Create test order
      const orderResult = await db.insert(orders).values({
        customerName: 'Test Customer',
      }).returning();
      orderId = orderResult[0].id;

      // Add order items
      await db.insert(orderItems).values({
        orderId: orderId,
        productId: testProductId,
        amount: 2,
      });
    });

    it('should return an order by ID', async () => {
      const res = await request(app)
        .get(`/api/orders/${orderId}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(orderId);
      expect(typeof res.body.data.customerName).toBe('string');
      expect(Array.isArray(res.body.data.items)).toBe(true);
      for (const item of res.body.data.items) {
        expect(typeof item.id).toBe('number');
        expect(typeof item.productId).toBe('number');
        expect(typeof item.amount).toBe('number');
        expect(['number', 'object'].includes(typeof item.priceAtSale)).toBe(true);
      }
    });

    it('should return 404 for non-existent order', async () => {
      const res = await request(app)
        .get('/api/orders/999999')
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not found/i);
    });

    it('should return 400 for invalid order ID', async () => {
      const res = await request(app)
        .get('/api/orders/invalid')
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message === 'Validation failed' || /invalid/i.test(res.body.message || '')).toBe(true);
    });
  });

  describe('POST /api/orders', () => {
    it('should create a new order with items', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({
          customerName: 'New Customer',
          items: [
            {
              productId: testProductId,
              amount: 3,
            },
          ],
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.id).toBe('number');
      expect(res.body.data.customerName).toBe('New Customer');
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.items[0].amount).toBe(3);
      expect(res.body.data.items[0].priceAtSale).toBe(100000);
    });

    it('should create a new order with pickupDate', async () => {
      const pickupDate = '2026-01-04';

      const res = await request(app)
        .post('/api/orders')
        .send({
          customerName: 'Pickup Customer',
          pickupDate,
          items: [
            {
              productId: testProductId,
              amount: 1,
            },
          ],
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.id).toBe('number');
      expect(res.body.data.customerName).toBe('Pickup Customer');
      expect(res.body.data.pickupDate).toBeTruthy();
    });

    it('should create order with multiple items', async () => {
      // Create another product
      const product2Result = await db.insert(products).values({
        name: 'Second Test Product',
        price: 50000,
      }).returning();
      const testProductId2 = product2Result[0].id;

      const res = await request(app)
        .post('/api/orders')
        .send({
          customerName: 'Multi Item Customer',
          items: [
            {
              productId: testProductId,
              amount: 2,
            },
            {
              productId: testProductId2,
              amount: 1,
            },
          ],
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.id).toBe('number');
      expect(res.body.data.items.length).toBe(2);
      expect(res.body.data.items[0].priceAtSale).toBe(100000);
      expect(res.body.data.items[1].priceAtSale).toBe(50000);
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({
          items: [
            {
              productId: testProductId,
              amount: 1,
            },
          ],
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message === 'Validation failed' || /invalid|required/i.test(res.body.message || '')).toBe(true);
    });

    it('should validate items array is not empty', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({
          customerName: 'Invalid Order',
          items: [],
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message === 'Validation failed' || /empty|required/i.test(res.body.message || '')).toBe(true);
    });

    it('should validate item amount is positive', async () => {
      const res = await request(app)
        .post('/api/orders')
        .send({
          customerName: 'Invalid Amount',
          items: [
            {
              productId: testProductId,
              amount: -1,
            },
          ],
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message === 'Validation failed' || /positive|amount/i.test(res.body.message || '')).toBe(true);
    });
  });

  describe('PUT /api/orders/:id', () => {
    let orderId: number;

    beforeAll(async () => {
      const result = await db.insert(orders).values({
        customerName: 'Customer to Update',
      }).returning();
      orderId = result[0].id;
    });

    it('should update an order', async () => {
      const res = await request(app)
        .put(`/api/orders/${orderId}`)
        .send({
          customerName: 'Updated Customer Name',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.id).toBe('number');
      expect(res.body.data.customerName).toBe('Updated Customer Name');
    });

    it('should update pickupDate', async () => {
      const pickupDate = '2026-01-05';

      const res = await request(app)
        .put(`/api/orders/${orderId}`)
        .send({
          pickupDate,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.id).toBe('number');
      expect(res.body.data.pickupDate).toBeTruthy();
    });

    it('should return 404 for non-existent order', async () => {
      const res = await request(app)
        .put('/api/orders/999999')
        .send({
          customerName: 'Non-existent',
        })
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not found/i);
    });

    it('should update order with new items (replace all items)', async () => {
      // First, create an order with items
      const createRes = await request(app)
        .post('/api/orders')
        .send({
          customerName: 'Order with Items',
          items: [
            {
              productId: testProductId,
              amount: 2,
            },
          ],
        });

      const orderIdWithItems = createRes.body.data.id;

      // Now update with different items
      const res = await request(app)
        .put(`/api/orders/${orderIdWithItems}`)
        .send({
          items: [
            {
              productId: testProductId,
              amount: 5,
              notes: 'Updated item',
            },
          ],
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.id).toBe('number');
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.items[0].amount).toBe(5);
      expect(res.body.data.items[0].notes).toBe('Updated item');
      expect(res.body.data.items[0].priceAtSale).toBe(100000);
    });

    it('should update order with multiple new items', async () => {
      // Create another product
      const product2Result = await db.insert(products).values({
        name: 'Second Product for Update',
        price: 40000,
      }).returning();
      const testProductId2 = product2Result[0].id;

      // Create order with one item
      const createRes = await request(app)
        .post('/api/orders')
        .send({
          customerName: 'Order to Expand',
          items: [
            {
              productId: testProductId,
              amount: 1,
            },
          ],
        });

      const orderIdToExpand = createRes.body.data.id;

      // Update with multiple items
      const res = await request(app)
        .put(`/api/orders/${orderIdToExpand}`)
        .send({
          customerName: 'Updated with More Items',
          items: [
            {
              productId: testProductId,
              amount: 3,
            },
            {
              productId: testProductId2,
              amount: 2,
              notes: 'Extra item',
            },
          ],
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.id).toBe('number');
      expect(res.body.data.customerName).toBe('Updated with More Items');
      expect(res.body.data.items.length).toBe(2);
      expect(res.body.data.items[0].priceAtSale).toBe(100000);
      expect(res.body.data.items[1].priceAtSale).toBe(40000);
    });

    it('should update order info without changing items', async () => {
      // Create order with items
      const createRes = await request(app)
        .post('/api/orders')
        .send({
          customerName: 'Original Customer',
          items: [
            {
              productId: testProductId,
              amount: 3,
              notes: 'Original note',
            },
          ],
        });

      const orderIdKeepItems = createRes.body.data.id;
      const originalItemId = createRes.body.data.items[0].id;

      // Update only customer name and notes, not items
      const res = await request(app)
        .put(`/api/orders/${orderIdKeepItems}`)
        .send({
          customerName: 'Updated Customer',
          notes: 'New order notes',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.id).toBe('number');
      expect(res.body.data.customerName).toBe('Updated Customer');
      expect(res.body.data.notes).toBe('New order notes');
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.items[0].id).toBe(originalItemId);
      expect(res.body.data.items[0].amount).toBe(3);
      expect(res.body.data.items[0].notes).toBe('Original note');
      expect(typeof res.body.data.items[0].priceAtSale).toBe('number');
    });

    it('should validate items when updating', async () => {
      const res = await request(app)
        .put(`/api/orders/${orderId}`)
        .send({
          items: [],
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message === 'Validation failed' || /empty|required/i.test(res.body.message || '')).toBe(true);
    });
  });

  describe('DELETE /api/orders/:id', () => {
    let orderId: number;

    beforeAll(async () => {
      const result = await db.insert(orders).values({
        customerName: 'To Delete',
      }).returning();
      orderId = result[0].id;
    });

    it('should delete an order', async () => {
      const res = await request(app)
        .delete(`/api/orders/${orderId}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/deleted successfully/i);
    });

    it('should return 404 when deleting non-existent order', async () => {
      const res = await request(app)
        .delete('/api/orders/999999')
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not found/i);
    });
  });
});
