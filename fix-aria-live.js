const fs = require('fs');

let nav = fs.readFileSync('src/lib/components/layout/Navbar.tsx', 'utf8');
nav = nav.replace(/<span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center"/, 
  `<span aria-live="polite" aria-atomic="true" className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-white text-xs flex items-center justify-center"`);
fs.writeFileSync('src/lib/components/layout/Navbar.tsx', nav);

let bottomNav = fs.readFileSync('src/lib/components/layout/BottomNav.tsx', 'utf8');
bottomNav = bottomNav.replace(/<span className="absolute -top-1 right-0 w-4 h-4 rounded-full text-white text-\[10px\] flex items-center justify-center"/, 
  `<span aria-live="polite" aria-atomic="true" className="absolute -top-1 right-0 w-4 h-4 rounded-full text-white text-[10px] flex items-center justify-center"`);
fs.writeFileSync('src/lib/components/layout/BottomNav.tsx', bottomNav);

let timeline = fs.readFileSync('src/lib/components/order/OrderStatusTimeline.tsx', 'utf8');
timeline = timeline.replace(/<div className="space-y-6">/, `<div className="space-y-6" aria-live="polite">`);
fs.writeFileSync('src/lib/components/order/OrderStatusTimeline.tsx', timeline);

