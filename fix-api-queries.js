const fs = require('fs');

// Kitchen API
let kitchen = fs.readFileSync('src/lib/api/kitchen.ts', 'utf8');

const kReplace = `  const nowMs = Date.now();
  const cutoff = nowMs - KITCHEN_CONFIG.ACTIVE_ORDER_WINDOW_HOURS * 60 * 60 * 1000;
  const cutoffTimestamp = Timestamp.fromMillis(cutoff);

  // Scalability: Query time bounds directly on Firestore using composite index
  const q = query(
    collection(db, "orders"),
    where("merchantId", "==", merchantId),
    where("status", "in", ["paid", "preparing", "ready"]),
    where("createdAt", ">=", cutoffTimestamp)
  );

  return onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
    const isOffline = snapshot.metadata.fromCache;

    const orders = snapshot.docs
      .map((d) => ({ id: d.id, ...(d.data() as Order) }))
      .sort((a, b) => {
        const timeA = (a.createdAt as any).seconds || 0;
        const timeB = (b.createdAt as any).seconds || 0;
        return timeA - timeB;
      });`;

kitchen = kitchen.replace(/  \/\/ We query by merchantId and IN \['paid', 'preparing', 'ready'\]\.[\s\S]*?\.sort\(\(a, b\) => \{/, kReplace);

kitchen = kitchen.replace(/import \{[\s\S]*?serverTimestamp,\n\} from "firebase\/firestore";/, `import {\n  collection,\n  query,\n  where,\n  onSnapshot,\n  runTransaction,\n  doc,\n  serverTimestamp,\n  Timestamp\n} from "firebase/firestore";`);

fs.writeFileSync('src/lib/api/kitchen.ts', kitchen);

// Driver API
let driver = fs.readFileSync('src/lib/api/driver.ts', 'utf8');

const dReplace1 = `  const nowMs = Date.now();
  const cutoff = nowMs - 24 * 60 * 60 * 1000;
  const cutoffTimestamp = Timestamp.fromMillis(cutoff);

  const q = query(
    collection(db, "orders"),
    where("merchantId", "==", merchantId),
    where("status", "==", "ready"),
    where("riderId", "==", null),
    where("createdAt", ">=", cutoffTimestamp)
  );

  return onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
    const isOffline = snapshot.metadata.fromCache;

    const orders = snapshot.docs
      .map((d) => ({ id: d.id, ...(d.data() as Order) }))
      .sort((a, b) => {
        const timeA = (a.createdAt as any).seconds || 0;
        const timeB = (b.createdAt as any).seconds || 0;
        return timeA - timeB; // Oldest first
      });`;

driver = driver.replace(/  \/\/ Query strictly for 'ready' orders that are unassigned[\s\S]*?return timeA - timeB; \/\/ Oldest first\n      \}\);/, dReplace1);

const dReplace2 = `  const nowMs = Date.now();
  const cutoff = nowMs - 12 * 60 * 60 * 1000;
  const cutoffTimestamp = Timestamp.fromMillis(cutoff);

  const q = query(
    collection(db, "orders"),
    where("riderId", "==", riderId),
    where("status", "in", ["out_for_delivery", "delivered"]),
    where("createdAt", ">=", cutoffTimestamp)
  );

  return onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
    const isOffline = snapshot.metadata.fromCache;

    const orders = snapshot.docs
      .map((d) => ({ id: d.id, ...(d.data() as Order) }))
      .sort((a, b) => {
        const timeA = (a.createdAt as any).seconds || 0;
        const timeB = (b.createdAt as any).seconds || 0;
        return timeB - timeA; // Newest first
      });`;

driver = driver.replace(/  const q = query\([\s\S]*?return timeB - timeA; \/\/ Newest first\n      \}\);/, dReplace2);

driver = driver.replace(/import \{[\s\S]*?serverTimestamp,\n\} from "firebase\/firestore";/, `import {\n  collection,\n  query,\n  where,\n  onSnapshot,\n  runTransaction,\n  doc,\n  serverTimestamp,\n  Timestamp\n} from "firebase/firestore";`);

fs.writeFileSync('src/lib/api/driver.ts', driver);
