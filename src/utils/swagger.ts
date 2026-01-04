import { swaggerSpec } from '../swagger';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Export Swagger/OpenAPI spec to JSON file
 * @param outputPath - Path where to save the JSON file (default: ./swagger.json)
 */
export async function exportSwaggerToJSON(outputPath: string = './swagger.json'): Promise<void> {
  try {
    if (!swaggerSpec) {
      throw new Error('Swagger spec is not initialized');
    }

    const dir = path.dirname(outputPath);

    // Create directory if it doesn't exist
    if (!fs.existsSync(dir) && dir !== '.') {
      fs.mkdirSync(dir, { recursive: true });
    }

    const jsonContent = JSON.stringify(swaggerSpec, null, 2);
    fs.writeFileSync(outputPath, jsonContent);
    console.log(`Swagger spec exported to ${outputPath}`);
  } catch (error) {
    console.error('Error exporting Swagger spec:', error);
    throw error;
  }
}

/**
 * Get Swagger spec as JSON object
 */
export function getSwaggerSpecJSON() {
  if (!swaggerSpec) {
    throw new Error('Swagger spec is not initialized');
  }
  return swaggerSpec;
}

/**
 * Get Swagger spec as JSON string
 */
export function getSwaggerSpecJSONString(): string {
  if (!swaggerSpec) {
    throw new Error('Swagger spec is not initialized');
  }
  return JSON.stringify(swaggerSpec, null, 2);
}
