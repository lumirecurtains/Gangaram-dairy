import {
  collection,
  query,
  where,
  onSnapshot,
  runTransaction,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { getFirebaseFirestore } from "../firebase";
import { Order } from "../firestoreSchema";

export function subscribeToAvailableJobs(
  merchantId: string,
  callback: (orders: (Order & { id: string })[], isOffline: boolean) => void
) {
  const db = getFirebaseFirestore();

  // Query strictly for 'ready' orders that are unassigned
  const q = query(
    collection(db, "orders"),
    where("merchantId", "==", merchantId),
    where("status", "==", "ready"),
    where("riderId", "==", null)
  );

  return onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
    const isOffline = snapshot.metadata.fromCache;
    const now = Date.now();
    const cutoff = now - 24 * 60 * 60 * 1000;

    const orders = snapshot.docs
      .map((d) => ({ id: d.id, ...(d.data() as Order) }))
      .filter((order) => {
        if (!order.createdAt) return false;
        const orderTimeMs = (order.createdAt as any).toMillis
          ? (order.createdAt as any).toMillis()
          : (order.createdAt as any).seconds * 1000;
        return orderTimeMs >= cutoff;
      })
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

  const q = query(
    collection(db, "orders"),
    where("riderId", "==", riderId),
    where("status", "in", ["out_for_delivery", "delivered"])
  );

  return onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
    const isOffline = snapshot.metadata.fromCache;
    
    // We want to show recently delivered items for the session, so we limit to 12 hours
    const now = Date.now();
    const cutoff = now - 12 * 60 * 60 * 1000;

    const orders = snapshot.docs
      .map((d) => ({ id: d.id, ...(d.data() as Order) }))
      .filter((order) => {
        if (!order.createdAt) return false;
        const orderTimeMs = (order.createdAt as any).toMillis
          ? (order.createdAt as any).toMillis()
          : (order.createdAt as any).seconds * 1000;
        return orderTimeMs >= cutoff;
      })
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
    
    // Concurrency Safety & Rule validation constraints
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
