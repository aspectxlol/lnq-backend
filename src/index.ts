import express, { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import productRoutes from './routes/products';
import orderRoutes from './routes/orders';
import printerRoutes from './routes/printer';
import { errorHandler } from './middleware/errorHandler';
import { checkMinIOConnection, initializeMinIO } from './services/minio';
import { getSwaggerSpecJSON, getSwaggerSpecJSONString } from './utils/swagger';
import dotenv from 'dotenv';
import { checkDbConnection } from './db';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS (allow all origins)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');

  const requestedHeaders = req.header('Access-Control-Request-Headers');
  res.setHeader('Access-Control-Allow-Headers', requestedHeaders ?? 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Swagger JSON endpoints
/**
 * @swagger
 * /api-docs.json:
 *   get:
 *     summary: Get OpenAPI spec (object)
 *     tags: [System]
 *     responses:
 *       200:
 *         description: OpenAPI specification (JSON)
 */
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(getSwaggerSpecJSON());
});

/**
 * @swagger
 * /swagger.json:
 *   get:
 *     summary: Get OpenAPI spec (stringified)
 *     tags: [System]
 *     responses:
 *       200:
 *         description: OpenAPI specification (JSON)
 */
app.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(getSwaggerSpecJSONString());
});

// Routes
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/printer', printerRoutes);

// Health check
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 db:
 *                   type: string
 *                   example: ok
 *                 minio:
 *                   type: string
 *                   example: ok
 */
app.get('/health', async (req, res) => {
  let dbOk = true;
  let minioOk = true;

  try {
    await checkDbConnection();
  } catch {
    dbOk = false;
  }

  try {
    await checkMinIOConnection();
  } catch {
    minioOk = false;
  }

  const ok = dbOk && minioOk;
  res.status(ok ? 200 : 503).json({
    status: ok ? 'ok' : 'error',
    db: dbOk ? 'ok' : 'error',
    minio: minioOk ? 'ok' : 'error',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;

// Start server if this is the main module
if (require.main === module) {
  async function start() {
    try {
      await checkDbConnection(5000);
      await checkMinIOConnection(5000);
      await initializeMinIO();

      app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
        console.log(`Swagger UI available at http://localhost:${port}/api-docs`);
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }
  start();
}
