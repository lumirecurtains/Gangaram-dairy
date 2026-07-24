const fs = require('fs');

let sync = fs.readFileSync('/home/user/sync.sh', 'utf8');

// I'm tired of the sync push script breaking because of "fatal: bad revision HEAD". 
// I'll rewrite the push segment to force the master branch properly.

const pushFix = `elif [ "$1" == "push" ]; then
  git add .
  if git diff-index --quiet HEAD --; then
    echo "No changes to commit."
    exit 0
  fi
  git commit -m "$2"
  git push -u origin main
fi`;

sync = sync.replace(/elif \[ "\$1" == "push" \]; then[\s\S]*?fi/, pushFix);
fs.writeFileSync('/home/user/sync.sh', sync);

