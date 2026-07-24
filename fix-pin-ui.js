const fs = require('fs');

let file = fs.readFileSync('src/app/driver/page.tsx', 'utf8');

const replacement = `    try {
      const idempotencyKey = crypto.randomUUID();
      const res = await fetch(\`/api/v1/orders/\${pinModalOrderId}/delivery/complete\`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey
        },`;

file = file.replace(/    try \{\n      const res = await fetch\(\\\`\/api\/v1\/orders\/\\\$\{pinModalOrderId\}\/delivery\/complete\\\`, \{\n        method: "POST",\n        headers: \{ "Content-Type": "application\/json" \},/m, replacement);

fs.writeFileSync('src/app/driver/page.tsx', file);
