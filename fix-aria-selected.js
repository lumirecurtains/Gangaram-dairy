const fs = require('fs');

let file = fs.readFileSync('src/lib/components/common/FilterChips.tsx', 'utf8');

file = file.replace(/onClick=\{\(\) => onSelect\(isActive \? null : option\)\}/g, 
  `onClick={() => onSelect(isActive ? null : option)} aria-pressed={isActive}`);

fs.writeFileSync('src/lib/components/common/FilterChips.tsx', file);
