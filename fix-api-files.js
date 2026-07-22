const fs = require('fs');

let rateLimiter = fs.readFileSync('src/lib/security/rateLimiter.ts', 'utf8');
rateLimiter = rateLimiter.replace(/\\\`\\\$\{uid\}_\\\$\{endpointKey\}\\\`/g, '`${uid}_${endpointKey}`');
fs.writeFileSync('src/lib/security/rateLimiter.ts', rateLimiter);

let kitchen = fs.readFileSync('src/lib/api/kitchen.ts', 'utf8');
// Fix missing bracket inside kitchen.ts map/sort
kitchen = kitchen.replace(/        return timeA - timeB;\n      \}\);/g, "        return timeA - timeB;\n      });\n\n    callback(orders, isOffline);\n  });\n}");
fs.writeFileSync('src/lib/api/kitchen.ts', kitchen);

let driver = fs.readFileSync('src/lib/api/driver.ts', 'utf8');
// Fix missing block in driver.ts
const driverFix = `import {
  collection,
  query,
  where,
  onSnapshot,
  runTransaction,
  doc,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { getFirebaseFirestore } from "../firebase";
import { Order } from "../firestoreSchema";

export function subscribeToAvailableJobs(
  merchantId: string,
  callback: (orders: (Order & { id: string })[], isOffline: boolean) => void
) {
  const db = getFirebaseFirestore();

  const nowMs = Date.now();
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
      });

    callback(orders, isOffline);
  });
}

export function subscribeToMyDeliveries(
  riderId: string,
  callback: (orders: (Order & { id: string })[], isOffline: boolean) => void
) {
  const db = getFirebaseFirestore();

  const nowMs = Date.now();
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
      });

    callback(orders, isOffline);
  });
}

export async function acceptJobTransaction(orderId: string, riderId: string) {
  const db = getFirebaseFirestore();
  const orderRef = doc(db, "orders", orderId);

  await runTransaction(db, async (transaction) => {
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists()) {
      throw new Error("Order does not exist.");
    }

    const data = orderDoc.data() as Order;
    
    if (data.status !== "ready" || data.riderId !== null) {
      throw new Error("This order is no longer available.");
    }

    transaction.update(orderRef, {
      status: "out_for_delivery",
      riderId: riderId,
      updatedAt: serverTimestamp(),
      updatedBy: riderId,
    });
  });
}
`;
fs.writeFileSync('src/lib/api/driver.ts', driverFix);

