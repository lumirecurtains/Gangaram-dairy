const fs = require('fs');

let indexes = JSON.parse(fs.readFileSync('firestore.indexes.json', 'utf8'));

// We need to add the three missing composite indexes for Kitchen and Driver.
indexes.indexes.push({
  "collectionGroup": "orders",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "merchantId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "ASCENDING" }
  ]
});

indexes.indexes.push({
  "collectionGroup": "orders",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "merchantId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "riderId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "ASCENDING" }
  ]
});

indexes.indexes.push({
  "collectionGroup": "orders",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "riderId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "ASCENDING" }
  ]
});

// Remove any duplicates just in case
const uniqueIndexes = [];
const seen = new Set();
for (const idx of indexes.indexes) {
  const str = JSON.stringify(idx);
  if (!seen.has(str)) {
    seen.add(str);
    uniqueIndexes.push(idx);
  }
}
indexes.indexes = uniqueIndexes;

fs.writeFileSync('firestore.indexes.json', JSON.stringify(indexes, null, 2) + "\n");
