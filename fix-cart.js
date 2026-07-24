const fs = require('fs');
let file = fs.readFileSync('src/lib/contexts/CartContext.tsx', 'utf8');

file = file.replace(
  /clearCart: \(\) => void;/,
  "clearCart: () => void;\n  replaceCart: (items: CartItem[], merchantId: string, merchantName: string) => void;"
);

const replaceFn = `  const replaceCart = useCallback((newItems: CartItem[], mId: string, mName: string) => {
    setItems(newItems);
    setMerchantId(mId);
    setMerchantName(mName);
  }, []);

  const itemCount = items.reduce((sum, i) => sum + i.qty, 0);`;

file = file.replace(/  const itemCount = items\.reduce\(\(sum, i\) => sum \+ i\.qty, 0\);/, replaceFn);

file = file.replace(
  /clearCart,/,
  "clearCart,\n        replaceCart,"
);

fs.writeFileSync('src/lib/contexts/CartContext.tsx', file);
