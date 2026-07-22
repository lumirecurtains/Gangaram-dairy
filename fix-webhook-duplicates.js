const fs = require('fs');

let file = fs.readFileSync('src/app/api/v1/webhooks/razorpay/route.ts', 'utf8');

// CRITICAL FIX: The legacy webhook code duplicated the recordCouponRedemption call.
// One was at line 94 (our fix from Module 14) and one was at line 136 (from original legacy code).
// We must remove the legacy duplicate to prevent users from permanently losing 2 slots per order.

const legacyDuplicate = `      // Record coupon redemption if coupon was used
      if (orderData.couponCode) {
        recordCouponRedemption(orderData.userId, orderData.couponCode).catch(console.error);
      }`;

file = file.replace(legacyDuplicate, "");

fs.writeFileSync('src/app/api/v1/webhooks/razorpay/route.ts', file);
