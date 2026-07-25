const fs = require('fs');
let file = fs.readFileSync('src/app/checkout/page.tsx', 'utf8');

const guards = `  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2 heading-tight">Login to checkout</h2>
            <Link href="/login" className="text-sm font-medium" style={{ color: "var(--primary)" }}>Go to login</Link>
          </div>
        </main>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <CartIcon className="w-20 h-20 mx-auto mb-4 opacity-20" style={{ color: "var(--text-secondary)" }} />
            <h2 className="text-xl font-bold mb-2 heading-tight">Your cart is empty</h2>
            <p className="mb-6" style={{ color: "var(--text-secondary)" }}>Add items from a restaurant to get started.</p>
            <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold transition-all hover:scale-105 active:scale-[0.98]" style={{ background: "var(--primary)" }}>
              Browse Restaurants
            </Link>
          </div>
        </main>
      </div>
    );
  }`;

file = file.replace(/  if \(!user\) \{[\s\S]*?    \);\n  \}/m, guards);

// Fix MIN-4: Coupon Apply/Remove button touch target
// Replace `px-4 py-2` with `min-h-[44px] px-4` for coupon button
file = file.replace(/className="px-4 py-2 rounded-lg font-bold text-sm transition-all text-white hover:opacity-90 disabled:opacity-50"/g, 
'className="min-h-[44px] px-4 rounded-lg font-bold text-sm transition-all text-white hover:opacity-90 disabled:opacity-50"');

fs.writeFileSync('src/app/checkout/page.tsx', file);
