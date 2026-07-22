const fs = require('fs');

let file = fs.readFileSync('src/lib/components/restaurant/RestaurantList.tsx', 'utf8');

file = file.replace(/import \{ collection, query, where, orderBy, onSnapshot, type DocumentData \} from "firebase\/firestore";/, 
  'import { collection, query, where, orderBy, onSnapshot, limit, type DocumentData } from "firebase/firestore";');

file = file.replace(/      orderBy\("updatedAt", "desc"\)/, '      orderBy("updatedAt", "desc"),\n      limit(100)');

fs.writeFileSync('src/lib/components/restaurant/RestaurantList.tsx', file);
