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
      }
    });

    it('should return 404 for non-existent product', async () => {
      const res = await request(app)
        .get('/api/products/999999')
        .expect(404);

      expect(res.body.success).toBe(false);
    });

    it('should return 400 for invalid product ID', async () => {
      const res = await request(app)
        .get('/api/products/invalid')
        .expect(400);

      expect(res.body.success).toBe(false);
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
      expect(res.body.data.name).toBe('New Product');
      expect(res.body.data.price).toBe(50000);
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
      expect(res.body.data.name).toBe('Product with Image');
      expect(res.body.data.price).toBe(75000);
      expect(res.body.data.imageId).toBeDefined();
    });

    it('should reject non-image files', async () => {
      const res = await request(app)
        .post('/api/products')
        .field('name', 'Invalid Product')
        .field('price', '50000')
        .attach('image', Buffer.from('invalid file'), 'test-file.txt')
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/products')
        .send({
          description: 'Missing name and price',
        })
        .expect(400);

      expect(res.body.success).toBe(false);
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
      expect(res.body.data.name).toBe('Updated Product');
    });

    it('should return 404 for non-existent product', async () => {
      const res = await request(app)
        .put('/api/products/999999')
        .send({
          name: 'Non-existent',
        })
        .expect(404);

      expect(res.body.success).toBe(false);
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
      expect(res.body.message).toBe('Product deleted successfully');
    });

    it('should return 404 when deleting non-existent product', async () => {
      const res = await request(app)
        .delete('/api/products/999999')
        .expect(404);

      expect(res.body.success).toBe(false);
    });
  });
});
