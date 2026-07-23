const fs = require('fs');

let file = fs.readFileSync('src/lib/components/restaurant/RestaurantList.tsx', 'utf8');

const imports = `import { RestaurantCard } from "./RestaurantCard";`;
file = file.replace(/import { RestaurantCard } from "\.\/RestaurantCard";/, `import { RestaurantCard } from "./RestaurantCard";\nimport { useAuth } from "@/lib/contexts";`);

const states = `  const [restaurants, setRestaurants] = useState<StorefrontDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [menuSearchData, setMenuSearchData] = useState<{merchantId: string, name: string}[] | null>(null);`;

file = file.replace(/  const \[restaurants, setRestaurants\] = useState<StorefrontDoc\[\]>\(\[\]\);\n  const \[loading, setLoading\] = useState\(true\);\n  const \[search, setSearch\] = useState\(""\);/, states);

const filterLogic = `  useEffect(() => {
    // Only fetch if we have restaurants and haven't fetched the menu index yet
    if (restaurants.length > 0 && !menuSearchData) {
      const merchantIds = restaurants.map(r => r.merchantId || r.id);
      fetch("/api/v1/search/menus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantIds })
      })
      .then(res => res.json())
      .then(data => {
        if (data.menus) setMenuSearchData(data.menus);
      })
      .catch(err => console.error("Search index error:", err));
    }
  }, [restaurants, menuSearchData]);

  const cleanSearch = search.trim().toLowerCase();

  const filtered = restaurants.map((r) => {
    const matchesName = r.name?.toLowerCase().includes(cleanSearch);
    const matchesCuisine = r.cuisine?.toLowerCase().includes(cleanSearch);
    const matchesCity = r.city?.toLowerCase().includes(cleanSearch);
    
    let matchingDishes: string[] = [];
    if (cleanSearch.length > 0 && menuSearchData) {
      matchingDishes = menuSearchData
        .filter(m => m.merchantId === (r.merchantId || r.id) && m.name.toLowerCase().includes(cleanSearch))
        .map(m => m.name);
    }

    const isMatch = cleanSearch === "" || matchesName || matchesCuisine || matchesCity || matchingDishes.length > 0;

    return isMatch ? { ...r, matchingDishes } : null;
  }).filter(Boolean) as (StorefrontDoc & { matchingDishes?: string[] })[];`;

file = file.replace(/  const filtered = restaurants\.filter\(\(r\) =>[\s\S]*?  \);/m, filterLogic);

fs.writeFileSync('src/lib/components/restaurant/RestaurantList.tsx', file);
