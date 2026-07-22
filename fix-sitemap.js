const fs = require('fs');

let robots = fs.readFileSync('src/app/robots.ts', 'utf8');
robots = robots.replace(/sitemap: \\\`\\\$\{siteUrl\}\/sitemap\.xml\\\`,/g, 'sitemap: `${siteUrl}/sitemap.xml`,');
fs.writeFileSync('src/app/robots.ts', robots);

let sitemap = fs.readFileSync('src/app/sitemap.ts', 'utf8');
sitemap = sitemap.replace(/url: \\\`\\\$\{siteUrl\}\/login\\\`,/g, 'url: `${siteUrl}/login`,');
sitemap = sitemap.replace(/url: \\\`\\\$\{siteUrl\}\/onboarding\\\`,/g, 'url: `${siteUrl}/onboarding`,');
sitemap = sitemap.replace(/url: \\\`\\\$\{siteUrl\}\/h\/\\\$\{data\.slug\}\\\`,/g, 'url: `${siteUrl}/h/${data.slug}`,');
fs.writeFileSync('src/app/sitemap.ts', sitemap);

