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

    // Generate secure 4-digit PIN
`;

file = file.replace(/const \{ items, merchantId, deliveryAddress, couponCode \} = body;\n\n    \/\/ Generate secure 4-digit PIN/, validation);

fs.writeFileSync('src/app/api/v1/orders/route.ts', file);
