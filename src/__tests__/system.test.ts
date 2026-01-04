import request from 'supertest';
import app from '../index';

// Integration tests for system-level endpoints (health, CORS, docs, 404)

describe('System (non-CRUD) Routes', () => {
  describe('CORS', () => {
    it('should set Access-Control-Allow-Origin to *', async () => {
      const res = await request(app)
        .get('/health')
        .set('Origin', 'https://example.com')
        .expect(200);

      expect(res.headers['access-control-allow-origin']).toBe('*');
    });

    it('should respond to preflight OPTIONS with 204 and CORS headers', async () => {
      const res = await request(app)
        .options('/health')
        .set('Origin', 'https://example.com')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'content-type,authorization')
        .expect(204);

      expect(res.headers['access-control-allow-origin']).toBe('*');
      expect(res.headers['access-control-allow-methods']).toMatch(/GET/i);
      expect(res.headers['access-control-allow-headers']).toMatch(/content-type/i);
    });
  });

  describe('GET /health', () => {
    it('should return 200 and status ok', async () => {
      const res = await request(app).get('/health').expect(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.db).toBe('ok');
      expect(res.body.minio).toBe('ok');
    });
  });

  describe('Swagger documentation endpoints', () => {
    it('GET /api-docs should serve Swagger UI HTML', async () => {
      const res = await request(app).get('/api-docs').redirects(1).expect(200);
      expect(res.headers['content-type']).toMatch(/text\/html/);
      expect(res.text).toMatch(/swagger/i);
    });

    it('GET /api-docs.json should return OpenAPI JSON object with paths', async () => {
      const res = await request(app).get('/api-docs.json').expect(200);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.body).toBeTruthy();
      expect(res.body.openapi).toBe('3.0.0');
      expect(res.body.paths).toBeTruthy();
      expect(Object.keys(res.body.paths).length).toBeGreaterThan(0);

      // Non-CRUD routes should be documented
      expect(res.body.paths['/health']).toBeTruthy();
      expect(res.body.paths['/api-docs.json']).toBeTruthy();
      expect(res.body.paths['/swagger.json']).toBeTruthy();
    });

    it('GET /swagger.json should return valid OpenAPI JSON (even if served as string)', async () => {
      const res = await request(app).get('/swagger.json').expect(200);
      expect(res.headers['content-type']).toMatch(/application\/json/);

      // Supertest may or may not parse JSON depending on how it was sent.
      const parsed = res.body && Object.keys(res.body).length ? res.body : JSON.parse(res.text);
      expect(parsed.openapi).toBe('3.0.0');
      expect(parsed.paths).toBeTruthy();
      expect(parsed.paths['/health']).toBeTruthy();
    });
  });

  describe('404 handler', () => {
    it('should return 404 and a standard JSON shape', async () => {
      const res = await request(app).get('/__definitely_not_a_route__').expect(404);
      expect(res.body).toEqual({
        success: false,
        message: 'Route not found',
      });
    });
  });
});
