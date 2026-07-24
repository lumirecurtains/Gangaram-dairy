const fs = require('fs');

let profilePage = fs.readFileSync('src/app/profile/page.tsx', 'utf8');
profilePage = profilePage.replace(/<div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold" style=\{\{ background: "var\(--primary\)" \}\}>\n            \{name\?.charAt\(0\)\?.toUpperCase\(\) \|\| user\.phoneNumber\?\.charAt\(1\) \|\| "U"\}\n          <\/div>/g, 
  '<div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold" style={{ background: "var(--primary)" }}>\n            {String(name?.charAt(0)?.toUpperCase() || user.phoneNumber?.charAt(1) || "U")}\n          </div>');

profilePage = profilePage.replace(/\{(claims as any)?.role && \(/g, '{Boolean((claims as any)?.role) && (');
profilePage = profilePage.replace(/\{claims.role\} access/g, '{String((claims as any)?.role || "")} access');

fs.writeFileSync('src/app/profile/page.tsx', profilePage);
