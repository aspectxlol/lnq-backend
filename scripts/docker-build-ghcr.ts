#!/usr/bin/env node

import { execSync } from 'child_process';
import * as path from 'path';

try {
  const owner = 'aspectxlol';
  let imageName = 'lnq-backend';

  const imageTag = process.env.IMAGE_TAG || 'latest';
  const fullImageName = `ghcr.io/${owner}/${imageName}:${imageTag}`;

  console.log(`Building Docker image: ${fullImageName}`);
  console.log('');

  const command = `docker build -t ${fullImageName} .`;
  console.log(`Running: ${command}`);
  console.log('');

  // Change to project root directory before running docker build
  const projectRoot = path.resolve(__dirname, '..');
  execSync(command, {
    cwd: projectRoot,
    stdio: 'inherit',
  });

  console.log('');
  console.log(`✓ Docker image built successfully: ${fullImageName}`);
  console.log(`Push with: docker push ${fullImageName}`);
} catch (error) {
  console.error('✗ Failed to build Docker image');
  process.exit(1);
}
