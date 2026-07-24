const fs = require('fs');
let file = fs.readFileSync('src/app/profile/page.tsx', 'utf8');

// The issue is claims.role is typed as unknown or string | boolean | etc.
// In module 8 we explicitly converted it to boolean flags (isSuperAdmin, isMerchantStaff, etc.), 
// but the legacy claims.role references still exist here.
file = file.replace(/\{claims\?.role && claims\.role !== "customer" && \(/g, "{(claims as any)?.role && (claims as any)?.role !== \"customer\" && (");
file = file.replace(/\{claims\.role === "admin" && \(/g, "{(claims as any)?.role === \"admin\" && (");
file = file.replace(/\{claims\.role === "merchant" && \(/g, "{(claims as any)?.role === \"merchant\" && (");
file = file.replace(/\{claims\.role === "driver" && \(/g, "{(claims as any)?.role === \"driver\" && (");

fs.writeFileSync('src/app/profile/page.tsx', file);
