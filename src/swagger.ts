import swaggerJsdoc from 'swagger-jsdoc';
import * as path from 'path';

const toPosixGlob = (p: string) => p.split(path.sep).join('/');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'E-Commerce API',
      version: '1.0.0',
      description: 'A simple E-Commerce API with Products and Orders',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
  },
  // Important: resolve relative to this module so Swagger works in both:
  // - dev:   src/swagger.ts -> src/routes/*.ts
  // - prod:  dist/swagger.js -> dist/routes/*.js
  apis: [
    toPosixGlob(path.join(__dirname, 'routes', '*.ts')),
    toPosixGlob(path.join(__dirname, 'routes', '*.js')),
    // Include top-level routes declared in src/index.ts (and dist/index.js)
    toPosixGlob(path.join(__dirname, 'index.ts')),
    toPosixGlob(path.join(__dirname, 'index.js')),
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
