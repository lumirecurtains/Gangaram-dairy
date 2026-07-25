const fs = require('fs');
let file = fs.readFileSync('src/app/order/[id]/page.tsx', 'utf8');

const replacement = `
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,`;

file = file.replace(/      if \(rpData\.razorpayOrderId\.startsWith\("order_dev_"\)\) \{[\s\S]*?const options = \{[\s\S]*?key: process\.env\.NEXT_PUBLIC_RAZORPAY_KEY_ID,/, "      const options = {\n        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,");

fs.writeFileSync('src/app/order/[id]/page.tsx', file);
