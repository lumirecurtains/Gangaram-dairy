const fs = require('fs');
let file = fs.readFileSync('src/app/layout.tsx', 'utf8');

const skipLink = `      <body className="min-h-full flex flex-col bg-[var(--bg)] text-[var(--text)]">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-[9999] bg-[var(--primary)] text-white px-4 py-2 rounded-lg font-bold">
          Skip to content
        </a>
        <Providers>`;

file = file.replace(/      <body className="min-h-full flex flex-col bg-\[var\(--bg\)\] text-\[var\(--text\)\]">\n        <Providers>/, skipLink);
fs.writeFileSync('src/app/layout.tsx', file);
