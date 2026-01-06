#!/usr/bin/env node

import { exportSwaggerToJSON } from '../utils/swagger';

const output_paths = [
  './swagger.json',
  '../frontend/swagger.json',
  '../mobile/swagger.json',
]

for (const outputPath of output_paths) {
  exportSwaggerToJSON(outputPath)
    .then(() => {
      console.log(`✓ Swagger spec successfully exported to ${outputPath}`);
    })
    .catch((error) => {
      console.error(`✗ Failed to export swagger spec to ${outputPath}:`, error);
    });
}
