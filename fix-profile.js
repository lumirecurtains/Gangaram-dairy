const fs = require('fs');
let file = fs.readFileSync('src/app/profile/page.tsx', 'utf8');
file = file.replace(/href="\/"\n          className="flex items-center gap-3 p-4 rounded-xl mb-4 hover:opacity-80 transition-opacity"\n          style={{ background: "var\(--surface\)", border: "1px solid var\(--border\)" }}\n        >\n          <Package className="w-5 h-5" style={{ color: "var\(--primary\)" }} \/>\n          <div>\n            <p className="font-semibold text-sm">My Orders<\/p>\n            <p className="text-xs" style={{ color: "var\(--text-secondary\)" }}>View order history<\/p>\n          <\/div>\n        <\/Link>/m,
`href="/orders"
          className="flex items-center gap-3 p-4 rounded-xl mb-4 hover:opacity-80 transition-opacity"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <Package className="w-5 h-5" style={{ color: "var(--primary)" }} />
          <div>
            <p className="font-semibold text-sm">My Orders</p>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>View order history</p>
          </div>
        </Link>`);
fs.writeFileSync('src/app/profile/page.tsx', file);
