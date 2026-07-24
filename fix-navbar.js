const fs = require('fs');

let file = fs.readFileSync('src/lib/components/layout/Navbar.tsx', 'utf8');

file = file.replace(/<Link href="\/cart"/, `<Link href="/orders" className="text-sm font-medium hover:opacity-80 transition-opacity" style={{ color: "var(--text-secondary)" }}>
            Orders
          </Link>
          <Link href="/cart"`);

file = file.replace(/<Link href="\/cart" className="block py-2 text-sm font-medium" onClick=\{\(\) => setMobileOpen\(false\)\}>\n            Cart \{itemCount > 0 && \\\`\\\(\\\$\{itemCount\}\\\)\\\`\}\n          <\/Link>/, `<Link href="/orders" className="block py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>Orders</Link>
          <Link href="/cart" className="block py-2 text-sm font-medium" onClick={() => setMobileOpen(false)}>
            Cart {itemCount > 0 && \`(\${itemCount})\`}
          </Link>`);

fs.writeFileSync('src/lib/components/layout/Navbar.tsx', file);
