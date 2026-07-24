const fs = require('fs');
let file = fs.readFileSync('src/app/profile/page.tsx', 'utf8');

// The ReactNode error usually means something like a string or undefined is being rendered incorrectly.
// Let's replace the User Initials logic.
const fixInitials = `<div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold" style={{ background: "var(--primary)" }}>
            {name ? name.charAt(0).toUpperCase() : (user.phoneNumber ? user.phoneNumber.charAt(1) : "U")}
          </div>`;

file = file.replace(/<div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold" style=\{\{ background: "var\(--primary\)" \}\}>[\s\S]*?<\/div>/, fixInitials);

fs.writeFileSync('src/app/profile/page.tsx', file);
