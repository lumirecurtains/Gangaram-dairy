const fs = require('fs');
let file = fs.readFileSync('src/app/api/v1/search/menus/route.ts', 'utf8');

file = file.replace(/db\.collection\(\\\`merchants\/\\\$\{id\}\/menus\\\`\)\.where\("isAvailable", "==", true\)\.get\(\)/g, 
  'db.collection(`merchants/${id}/menus`).where("isAvailable", "==", true).get()');

fs.writeFileSync('src/app/api/v1/search/menus/route.ts', file);
