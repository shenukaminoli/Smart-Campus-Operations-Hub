const fs = require('fs');
const path = require('path');

const targets = [
  'node_modules/jspdf/dist/jspdf.es.min.js',
  'node_modules/dompurify/dist/purify.es.mjs',
];

function stripSourceMapComment(content) {
  return content
    .replace(/\n\/\/# sourceMappingURL=.*\s*$/m, '')
    .replace(/\n\/\*# sourceMappingURL=.*\*\/\s*$/m, '');
}

for (const relPath of targets) {
  const fullPath = path.join(__dirname, '..', relPath);

  if (!fs.existsSync(fullPath)) {
    continue;
  }

  const original = fs.readFileSync(fullPath, 'utf8');
  const updated = stripSourceMapComment(original);

  if (updated !== original) {
    fs.writeFileSync(fullPath, updated, 'utf8');
    console.log(`Patched source map reference: ${relPath}`);
  }
}
