const fs = require('fs');
let file = fs.readFileSync('src/app/api/v1/webhooks/razorpay/route.ts', 'utf8');

file = file.replace('  } catch (err: unknown) {\n    console.error("Webhook error:", err);\n    return NextResponse.json({ status: "ok" });\n  }',
  '  } catch (err: unknown) {\n    console.error("Webhook error:", err);\n    return NextResponse.json({ error: "Internal server error" }, { status: 500 });\n  }');

const originalCapturedCheck = `  const orderDoc = ordersSnapshot.docs[0];
  const orderData = orderDoc.data();

  if (orderData?.status !== "pending_payment") {
    return NextResponse.json({ status: "already_processed" });
  }`;

const newCapturedCheck = `  const orderDoc = ordersSnapshot.docs[0];
  const orderData = orderDoc.data();

  if (orderData?.status !== "pending_payment") {
    return NextResponse.json({ status: "already_processed" });
  }

  const paymentAmount = payment.amount as number;
  const paymentCurrency = payment.currency as string;
  const paymentStatus = payment.status as string;

  if (paymentStatus !== "captured") {
    console.error("Payment status not captured:", paymentStatus);
    return NextResponse.json({ error: "Payment not captured" }, { status: 400 });
  }

  if (paymentCurrency !== "INR") {
    console.error("Invalid currency:", paymentCurrency);
    return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
  }

  const expectedAmount = Math.round(orderData.grandTotal * 100);
  if (paymentAmount !== expectedAmount) {
    console.error(\`Amount mismatch. Expected \${expectedAmount}, got \${paymentAmount}\`);
    return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
  }`;

file = file.replace(originalCapturedCheck, newCapturedCheck);

fs.writeFileSync('src/app/api/v1/webhooks/razorpay/route.ts', file);
