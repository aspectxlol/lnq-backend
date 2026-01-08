import request from 'supertest';
import app from '../index';
import { db, closeConnection } from '../db';
import { products } from '../db/schema';

// Integration tests for product management and file upload endpoints

describe('Products Routes', () => {
  beforeAll(async () => {
    // Create test product
    await db.insert(products).values({
      name: 'Test Product',
      price: 100000,
      description: 'A test product',
      imageId: 'test-image-1',
    });
  });

  afterAll(async () => {
    await closeConnection();
  });

  describe('GET /api/products', () => {
    it('should return all products', async () => {
      const res = await request(app)
        .get('/api/products')
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      for (const product of res.body.data) {
        expect(typeof product.id).toBe('number');
        expect(typeof product.name).toBe('string');
        expect(typeof product.price).toBe('number');
        expect(['string', 'object'].includes(typeof product.description)).toBe(true);
        if (product.imageId !== undefined) {
          expect(['string', 'object'].includes(typeof product.imageId)).toBe(true);
        }
      }
    });
  });

  describe('GET /api/products/:id', () => {
    it('should return a product by ID', async () => {
      const allProducts = await db.query.products.findMany();
      const testProduct = allProducts[0];

      if (testProduct) {
        const res = await request(app)
          .get(`/api/products/${testProduct.id}`)
          .expect(200);

        expect(res.body.success).toBe(true);
        expect(res.body.data.id).toBe(testProduct.id);
        expect(typeof res.body.data.name).toBe('string');
        expect(typeof res.body.data.price).toBe('number');
        expect(['string', 'object'].includes(typeof res.body.data.description)).toBe(true);
      }
    });

    it('should return 404 for non-existent product', async () => {
      const res = await request(app)
        .get('/api/products/999999')
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not found/i);
    });

    it('should return 400 for invalid product ID', async () => {
      const res = await request(app)
        .get('/api/products/invalid')
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message === 'Validation failed' || /invalid/i.test(res.body.message || '')).toBe(true);
    });
  });

  describe('POST /api/products', () => {
    it('should create a new product with JSON', async () => {
      const res = await request(app)
        .post('/api/products')
        .send({
          name: 'New Product',
          price: 50000,
          description: 'A new product',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.id).toBe('number');
      expect(res.body.data.name).toBe('New Product');
      expect(res.body.data.price).toBe(50000);
      expect(typeof res.body.data.description).toBe('string');
    });

    it('should create a new product with file upload', async () => {
      const res = await request(app)
        .post('/api/products')
        .field('name', 'Product with Image')
        .field('price', '75000')
        .field('description', 'Product with an image')
        .attach('image', Buffer.from('fake image content'), 'test-image.png')
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.id).toBe('number');
      expect(res.body.data.name).toBe('Product with Image');
      expect(res.body.data.price).toBe(75000);
      expect(typeof res.body.data.imageId).toBe('string');
    });

    it('should reject non-image files', async () => {
      const res = await request(app)
        .post('/api/products')
        .field('name', 'Invalid Product')
        .field('price', '50000')
        .attach('image', Buffer.from('invalid file'), 'test-file.txt')
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message === 'Validation failed' || /image|file|invalid/i.test(res.body.message || '')).toBe(true);
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/products')
        .send({
          description: 'Missing name and price',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message === 'Validation failed' || /required|missing/i.test(res.body.message || '')).toBe(true);
    });

    it('should validate price is positive', async () => {
      const res = await request(app)
        .post('/api/products')
        .send({
          name: 'Invalid Product',
          price: -1000,
        })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message === 'Validation failed' || /positive|price/i.test(res.body.message || '')).toBe(true);
    });
  });

  describe('PUT /api/products/:id', () => {
    let productId: number;

    beforeAll(async () => {
      const allProducts = await db.query.products.findMany();
      productId = allProducts[0].id;
    });

    it('should update a product', async () => {
      const res = await request(app)
        .put(`/api/products/${productId}`)
        .send({
          name: 'Updated Product',
          price: 75000,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.id).toBe('number');
      expect(res.body.data.name).toBe('Updated Product');
      expect(typeof res.body.data.price).toBe('number');
    });

    it('should return 404 for non-existent product', async () => {
      const res = await request(app)
        .put('/api/products/999999')
        .send({
          name: 'Non-existent',
        })
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not found/i);
    });
  });

  describe('DELETE /api/products/:id', () => {
    let productId: number;

    beforeAll(async () => {
      const result = await db.insert(products).values({
        name: 'To Delete',
        price: 10000,
      }).returning();
      productId = result[0].id;
    });

    it('should delete a product', async () => {
      const res = await request(app)
        .delete(`/api/products/${productId}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/deleted successfully/i);
    });

    it('should return 404 when deleting non-existent product', async () => {
      const res = await request(app)
        .delete('/api/products/999999')
        .expect(404);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not found/i);
    });
  });
});
