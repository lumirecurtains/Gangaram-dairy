const fs = require('fs');

let navbar = fs.readFileSync('src/lib/components/layout/Navbar.tsx', 'utf8');

navbar = navbar.replace(/<Link href="\/notifications" className="relative p-2 rounded-lg hover:opacity-80 transition-opacity">/g, 
  `<NavLink href="/notifications" className="relative p-2 rounded-lg hover:opacity-80 transition-opacity" activeClassName="text-[var(--primary)]" inactiveClassName="text-[var(--text-secondary)]">`);
navbar = navbar.replace(/<\/Link>\n\n          \{\/\* Cart \*\/\}/g, `</NavLink>\n\n          {/* Cart */}`);

navbar = navbar.replace(/<Link href="\/profile" className="p-2 rounded-lg hover:opacity-80 transition-opacity">/g, 
  `<NavLink href="/profile" className="p-2 rounded-lg hover:opacity-80 transition-opacity" activeClassName="text-[var(--primary)]" inactiveClassName="text-[var(--text-secondary)]">`);
navbar = navbar.replace(/<User className="w-5 h-5" \/>\n              <\/Link>/g, `<User className="w-5 h-5" />\n              </NavLink>`);

// Fix mobile navlinks
navbar = navbar.replace(/<Link href="\/" className="block py-2 text-sm font-medium" onClick=\{\(\) => setMobileOpen\(false\)\}>Restaurants<\/Link>/g, 
  `<NavLink href="/" className="block py-2 text-sm font-medium" activeClassName="text-[var(--primary)]" inactiveClassName="text-[var(--text)]" onClick={() => setMobileOpen(false)}>Restaurants</NavLink>`);

navbar = navbar.replace(/<Link href="\/orders" className="block py-2 text-sm font-medium" onClick=\{\(\) => setMobileOpen\(false\)\}>Orders<\/Link>/g, 
  `<NavLink href="/orders" className="block py-2 text-sm font-medium" activeClassName="text-[var(--primary)]" inactiveClassName="text-[var(--text)]" onClick={() => setMobileOpen(false)}>Orders</NavLink>`);

navbar = navbar.replace(/<Link href="\/profile" className="block py-2 text-sm font-medium" onClick=\{\(\) => setMobileOpen\(false\)\}>Profile<\/Link>/g, 
  `<NavLink href="/profile" className="block py-2 text-sm font-medium" activeClassName="text-[var(--primary)]" inactiveClassName="text-[var(--text)]" onClick={() => setMobileOpen(false)}>Profile</NavLink>`);

fs.writeFileSync('src/lib/components/layout/Navbar.tsx', navbar);
