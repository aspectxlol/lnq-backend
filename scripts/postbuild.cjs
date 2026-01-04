const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distDir)) {
  process.exit(0);
}

// Ensure Node treats dist/*.js as CommonJS even if the repo/package is ESM.
const pkgPath = path.join(distDir, 'package.json');
fs.writeFileSync(pkgPath, JSON.stringify({ type: 'commonjs' }, null, 2) + '\n');
