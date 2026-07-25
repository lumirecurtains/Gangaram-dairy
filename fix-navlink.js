const fs = require('fs');

let navbar = fs.readFileSync('src/lib/components/layout/Navbar.tsx', 'utf8');

navbar = navbar.replace(/import Link from "next\/link";/, 'import Link from "next/link";\nimport { NavLink } from "./NavLink";');

navbar = navbar.replace(/<Link href="\/" className="text-sm font-medium transition-opacity" style=\{\{ color: pathname === "\/" \? "var\(--primary\)" : "var\(--text-secondary\)" \}\}>\n            Restaurants\n          <\/Link>/, 
`<NavLink href="/" className="text-sm font-medium transition-opacity" activeClassName="text-[var(--primary)]" inactiveClassName="text-[var(--text-secondary)]">\n            Restaurants\n          </NavLink>`);

navbar = navbar.replace(/<Link href="\/orders" className="text-sm font-medium hover:opacity-80 transition-opacity" style=\{\{ color: "var\(--text-secondary\)" \}\}>\n            Orders\n          <\/Link>/, 
`<NavLink href="/orders" className="text-sm font-medium hover:opacity-80 transition-opacity" activeClassName="text-[var(--primary)]" inactiveClassName="text-[var(--text-secondary)]">\n            Orders\n          </NavLink>`);

fs.writeFileSync('src/lib/components/layout/Navbar.tsx', navbar);

let bottomnav = fs.readFileSync('src/lib/components/layout/BottomNav.tsx', 'utf8');

bottomnav = bottomnav.replace(/import Link from "next\/link";/, 'import Link from "next/link";\nimport { NavLink } from "./NavLink";');

bottomnav = bottomnav.replace(/<Link href="\/" className="flex flex-col items-center gap-0\.5 text-xs font-medium transition-opacity" style=\{\{ color: pathname === "\/" \? "var\(--primary\)" : "" \}\}>/g,
`<NavLink href="/" className="flex flex-col items-center gap-0.5 text-xs font-medium transition-opacity" activeClassName="text-[var(--primary)] opacity-100" inactiveClassName="opacity-70 hover:opacity-100">`);
bottomnav = bottomnav.replace(/<\/Link>/, '</NavLink>'); // only the first one if we don't loop

fs.writeFileSync('src/lib/components/layout/BottomNav.tsx', bottomnav);
