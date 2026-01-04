// Runtime-friendly Drizzle Kit config.
// Prefers compiled schema in ./dist (production), falls back to ./src (development).

const fs = require('fs');

const schemaDist = './dist/db/schema.js';
const schemaSrc = './src/db/schema.ts';

module.exports = {
  schema: fs.existsSync(schemaDist) ? schemaDist : schemaSrc,
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
};
