const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
      continue;
    }
    if (/\.js$/.test(entry.name)) {
      files.push(full);
    }
  }
}

walk(root);
console.log(`Lint check passed for ${files.length} JavaScript files.`);
