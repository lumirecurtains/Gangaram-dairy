const fs = require('fs');
let pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

if (!pkg.scripts['type-check']) {
  pkg.scripts['type-check'] = "tsc --noEmit";
}

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
