const fs = require('fs');

const files = [
  'src/app/page.tsx',
  'src/app/checkout/page.tsx',
  'src/app/cart/page.tsx',
  'src/app/profile/page.tsx',
  'src/app/orders/page.tsx',
  'src/app/h/[slug]/RestaurantPageClient.tsx',
  'src/app/login/page.tsx',
  'src/app/track/[id]/page.tsx',
  'src/app/order/[id]/page.tsx'
];

files.forEach(f => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    content = content.replace(/<main className="flex-1/, '<main id="main-content" className="flex-1');
    fs.writeFileSync(f, content);
  }
});
