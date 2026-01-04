// Jest setup file for test configuration
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://user:password@localhost:5432/ecommerce';

// Add custom test timeout
jest.setTimeout(30000);
