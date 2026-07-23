const fs = require('fs');

let file = fs.readFileSync('src/lib/components/restaurant/RestaurantCard.tsx', 'utf8');

file = file.replace(/  isOnline: boolean;\n}/, "  isOnline: boolean;\n  matchingDishes?: string[];\n}");

file = file.replace(/}: RestaurantCardProps\) {/, ", matchingDishes\n}: RestaurantCardProps) {");

const newInfo = `        <div className="flex items-center gap-4 text-xs" style={{ color: "var(--text-secondary)" }}>
          {openingHours && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {openingHours}
            </span>
          )}
          {priceForTwo && (
            <span className="flex items-center gap-1">
              <IndianRupee className="w-3.5 h-3.5" /> {priceForTwo} for two
            </span>
          )}
        </div>
        
        {matchingDishes && matchingDishes.length > 0 && (
          <div className="pt-2 border-t mt-2" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs font-semibold" style={{ color: "var(--primary)" }}>
              Matches: {matchingDishes.slice(0, 2).join(", ")}{matchingDishes.length > 2 ? \` +\${matchingDishes.length - 2}\` : ""}
            </p>
          </div>
        )}
      </div>`;

file = file.replace(/        <div className="flex items-center gap-4 text-xs" style=\{\{ color: "var\(--text-secondary\)" \}\}>[\s\S]*?<\/div>\n      <\/div>/, newInfo);

fs.writeFileSync('src/lib/components/restaurant/RestaurantCard.tsx', file);
