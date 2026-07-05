const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const requiredEntries = ['src/server.js', 'src/app.js'];

for (const entry of requiredEntries) {
  const target = path.join(root, entry);
  if (!fs.existsSync(target)) {
    throw new Error(`Missing required entry: ${entry}`);
  }
}

console.log('Build check passed.');
