#!/usr/bin/env node

import { execSync } from 'child_process';
import * as path from 'path';

try {
  const owner = 'aspectxlol';
  let imageName = 'lnq-backend';

  const imageTag = process.env.IMAGE_TAG || 'latest';
  const fullImageName = `ghcr.io/${owner}/${imageName}:${imageTag}`;

  console.log(`Pushing Docker image: ${fullImageName}`);
  console.log('');

  const command = `docker push ${fullImageName}`;
  console.log(`Running: ${command}`);
  console.log('');

  // Change to project root directory
  const projectRoot = path.resolve(__dirname, '..');
  execSync(command, {
    cwd: projectRoot,
    stdio: 'inherit',
  });

  console.log('');
  console.log(`✓ Docker image pushed successfully: ${fullImageName}`);
} catch (error) {
  console.error('✗ Failed to push Docker image');
  process.exit(1);
}
