const fs = require('fs');
let file = fs.readFileSync('src/app/api/v1/payments/create-order/route.ts', 'utf8');

const replacement = `    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret) {
      return NextResponse.json(
        { error: "Payment provider unavailable. Razorpay keys are not configured." },
        { status: 503 }
      );
    }

    let razorpayOrderId: string;

    // Real Razorpay API call
    const razorpayRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: \`Basic \${Buffer.from(\`\${razorpayKeyId}:\${razorpayKeySecret}\`).toString("base64")}\`,
      },
      body: JSON.stringify({
        amount: Math.round(orderData.grandTotal * 100), // paise
        currency: "INR",
        receipt: orderRef.id,
        notes: {
          merchantId: orderData.merchantId,
          userId: user.uid,
        },
        // Route transfers
        transfers: [
          {
            account: merchantData.razorpayAccountId,
            amount: Math.round(orderData.hotelShare * 100),
            currency: "INR",
            notes: { type: "hotel_share" },
          },
          {
            account: process.env.RAZORPAY_PLATFORM_ACCOUNT_ID || "",
            amount: Math.round(orderData.riderShare * 100),
            currency: "INR",
            notes: { type: "rider_share" },
          },
        ],
      }),
    });

    if (!razorpayRes.ok) {
      const errData = await razorpayRes.json();
      throw new Error(\`Razorpay error: \${errData.error?.description || "Unknown"}\`);
    }

    const razorpayData = await razorpayRes.json();
    razorpayOrderId = razorpayData.id;

    // Save razorpayOrderId to order`;

file = file.replace(/    const razorpayKeyId = process\.env\.RAZORPAY_KEY_ID;[\s\S]*?\/\/ Save razorpayOrderId to order/, replacement);

fs.writeFileSync('src/app/api/v1/payments/create-order/route.ts', file);
