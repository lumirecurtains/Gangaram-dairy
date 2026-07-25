const fs = require('fs');

function replaceImg(filepath) {
  if (!fs.existsSync(filepath)) return;
  let file = fs.readFileSync(filepath, 'utf8');
  
  // Need to import Image if not present
  if (file.includes('<img ') && !file.includes('import Image from "next/image"')) {
    file = file.replace(/import /, 'import Image from "next/image";\nimport ');
  }

  // Replace <img src={...} alt={...} className={...} /> with <Image src={...} alt={...} className={...} fill /> 
  // if it's inside a relative container. But since we don't know the exact sizing, using fill={true} with object-cover on className is usually safe for these cards.
  
  // For RestaurantCard.tsx
  if (filepath.includes('RestaurantCard')) {
    file = file.replace(/<img src=\{promoBanner\} alt=\{name\} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" \/>/g, 
      '<Image src={promoBanner} alt={name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />');
  }
  
  // For MenuItemCard.tsx
  if (filepath.includes('MenuItemCard')) {
    file = file.replace(/<img src=\{imageUrl\} alt=\{name\} className="w-full h-full object-cover" loading="lazy" \/>/g, 
      '<Image src={imageUrl} alt={name} fill className="object-cover" />');
  }

  // For CartItem.tsx
  if (filepath.includes('CartItem')) {
    file = file.replace(/<img src=\{imageUrl\} alt=\{name\} className="w-full h-full object-cover" loading="lazy" \/>/g, 
      '<Image src={imageUrl} alt={name} fill className="object-cover" />');
  }

  // For profile/page.tsx
  if (filepath.includes('profile')) {
    file = file.replace(/<img src=\{user\.photoURL\} alt="" className="w-full h-full object-cover rounded-2xl" \/>/g, 
      '<Image src={user.photoURL} alt="" fill className="object-cover rounded-2xl" />');
  }

  fs.writeFileSync(filepath, file);
}

replaceImg('src/lib/components/restaurant/RestaurantCard.tsx');
replaceImg('src/lib/components/menu/MenuItemCard.tsx');
replaceImg('src/lib/components/cart/CartItem.tsx');
replaceImg('src/app/profile/page.tsx');
