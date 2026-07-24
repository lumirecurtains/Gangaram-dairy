const fs = require('fs');
let file = fs.readFileSync('src/lib/components/address/AddressSelector.tsx', 'utf8');

file = file.replace(/const \[editing, setEditing\] = useState\(false\);/,
  `const isComplete = Boolean(defaultAddress.flat && defaultAddress.street && defaultAddress.city && defaultAddress.pincode);
  const [editing, setEditing] = useState(!isComplete);`);

fs.writeFileSync('src/lib/components/address/AddressSelector.tsx', file);
