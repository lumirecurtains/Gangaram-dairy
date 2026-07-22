const fs = require('fs');

let file = fs.readFileSync('scripts/promote-super-admin.ts', 'utf8');
file = file.replace(/const newClaims = \{/, 'const newClaims: Record<string, any> = {');
fs.writeFileSync('scripts/promote-super-admin.ts', file);
