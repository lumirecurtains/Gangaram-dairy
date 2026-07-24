const fs = require('fs');
let file = fs.readFileSync('src/lib/components/layout/Navbar.tsx', 'utf8');

file = file.replace(/          \{\/\* Mobile Menu Toggle — hidden on desktop, visible only inside mobile block \*\/\}\n          <button onClick=\{\(\) => setMobileOpen\(!mobileOpen\)\} className="md:hidden p-2 rounded-lg hover:opacity-80">\n            \{mobileOpen \? <X className="w-5 h-5" \/> : <Menu className="w-5 h-5" \/>\}\n          <\/button>\n/, "");

fs.writeFileSync('src/lib/components/layout/Navbar.tsx', file);
