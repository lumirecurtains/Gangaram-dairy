const fs = require('fs');

let page = fs.readFileSync('src/app/admin/page.tsx', 'utf8');
page = page.replace(/import     \{\n    href: "\/admin\/audit-logs",/m, `  {
    href: "/admin/audit-logs",`);
fs.writeFileSync('src/app/admin/page.tsx', page);

let audit = fs.readFileSync('src/app/admin/audit-logs/page.tsx', 'utf8');
audit = audit.replace(/url \+= \\\`&cursor=\\\$\{currentCursor\}\\\`;/g, 'url += `&cursor=${currentCursor}`;');
audit = audit.replace(/"Authorization": \\\`Bearer \\\$\{token}\\\`/g, '"Authorization": `Bearer ${token}`');
fs.writeFileSync('src/app/admin/audit-logs/page.tsx', audit);

let coupons = fs.readFileSync('src/app/admin/coupons/page.tsx', 'utf8');
coupons = coupons.replace(/"Authorization": \\\`Bearer \\\$\{token}\\\`/g, '"Authorization": `Bearer ${token}`');
fs.writeFileSync('src/app/admin/coupons/page.tsx', coupons);

