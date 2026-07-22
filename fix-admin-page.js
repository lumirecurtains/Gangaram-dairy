const fs = require('fs');

let page = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

page = page.replace(/{[\s\S]*?href: "\/api\/v1\/promotions\/loyalty", \/\/ Temporarily an API link until Admin Coupons UI is built if requested[\s\S]*?\},/m, 
`  {
    href: "/admin/coupons",
    label: "Coupons & Loyalty",
    description: "Manage global platform coupons and loyalty points",
    icon: <Store className="w-5 h-5" />,
  },`);

page = page.replace(/{[\s\S]*?href: "\/api\/v1\/admin\/audit-logs",[\s\S]*?\},/m,
`  {
    href: "/admin/audit-logs",
    label: "Audit Logs",
    description: "View all secure admin actions and system events",
    icon: <ClipboardList className="w-5 h-5" />,
  },`);

fs.writeFileSync('src/app/admin/page.tsx', page);
