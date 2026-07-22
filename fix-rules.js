const fs = require('fs');
let rules = fs.readFileSync('firestore.rules', 'utf8');

const replacement = `allow update: if request.auth.token.merchant_staff == true
                  && request.auth.token.merchantId == resource.data.merchantId
                  && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'updatedAt', 'updatedBy', 'acceptedAt', 'readyAt'])
                  && (request.resource.data.status == 'preparing' || request.resource.data.status == 'ready');
      allow delete: if false;`;

rules = rules.replace("allow update, delete: if false;", replacement);
fs.writeFileSync('firestore.rules', rules);
