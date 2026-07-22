import {
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
import { Order, OrderStatus } from "../firestoreSchema";
import { KITCHEN_CONFIG } from "../config/constants";

export function subscribeToActiveOrders(
  merchantId: string,
  callback: (orders: (Order & { id: string })[], isOffline: boolean) => void
) {
  const db = getFirebaseFirestore();

  const nowMs = Date.now();
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
      });

    callback(orders, isOffline);
  });
}

export async function transitionOrderStatus(
  orderId: string,
  expectedCurrentStatus: OrderStatus,
  newStatus: OrderStatus,
  userId: string
) {
  const db = getFirebaseFirestore();
  const orderRef = doc(db, "orders", orderId);

  await runTransaction(db, async (transaction) => {
    const orderDoc = await transaction.get(orderRef);
    if (!orderDoc.exists()) {
      throw new Error("Order does not exist.");
    }

    const data = orderDoc.data() as Order;
    
    // Concurrency Safety: Check if someone else already transitioned this order
    if (data.status !== expectedCurrentStatus) {
      throw new Error(`Order was already updated to ${data.status}. Someone else might have clicked it.`);
    }

    const updatePayload: Record<string, any> = {
      status: newStatus,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    };

    if (newStatus === "preparing") {
      updatePayload.acceptedAt = serverTimestamp();
    } else if (newStatus === "ready") {
      updatePayload.readyAt = serverTimestamp();
    }

    transaction.update(orderRef, updatePayload);
  });
}
