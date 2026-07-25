const fs = require('fs');
let file = fs.readFileSync('src/app/api/v1/orders/route.ts', 'utf8');

const validation = `
    const { items, merchantId, deliveryAddress, couponCode } = body;

    // Validate request payload
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty or invalid" }, { status: 400 });
    }
    if (!merchantId) {
      return NextResponse.json({ error: "Merchant ID is required" }, { status: 400 });
    }
    if (!deliveryAddress || !deliveryAddress.flat || !deliveryAddress.street || !deliveryAddress.city || !deliveryAddress.pincode) {
      return NextResponse.json({ error: "Complete delivery address is required" }, { status: 400 });
    }

    // Validate items for duplicates, valid quantities, etc.
    const itemIds = new Set();
    for (const item of items) {
      if (!item.itemId || typeof item.itemId !== "string") {
        return NextResponse.json({ error: "Invalid item ID in payload" }, { status: 400 });
      }
      if (itemIds.has(item.itemId)) {
        return NextResponse.json({ error: "Duplicate items in payload" }, { status: 400 });
      }
      itemIds.add(item.itemId);

      const qty = item.qty || 1;
      if (typeof qty !== "number" || !Number.isInteger(qty) || qty <= 0 || qty > 99) {
        return NextResponse.json({ error: \`Invalid quantity for item \${item.itemId}\` }, { status: 400 });
      }
    }

    // Generate secure 4-digit PIN
`;

// It might already have the code from fix-orders-api-items.js, so we replace that.
file = file.replace(/const \{ items, merchantId, deliveryAddress, couponCode \} = body;[\s\S]*?\/\/ Generate secure 4-digit PIN/, validation);

fs.writeFileSync('src/app/api/v1/orders/route.ts', file);
