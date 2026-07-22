// ============================================================
// PAGINATION HELPER — Gangaram Scalability Layer
// Module 10 — Cursor-based pagination using Firestore startAfter()
// Numeric offset (page numbers) is EXPLICITLY BANNED
// ============================================================

import { getFirestore, type DocumentSnapshot } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebaseAdmin";

export interface PaginationOptions {
  /**
   * Maximum documents to return. Default 20, max 100.
   */
  limit?: number;

  /**
   * Document ID to start after (cursor).
   * If provided alongside cursorDoc, cursorDoc takes precedence.
   */
  cursor?: string;

  /**
   * A document snapshot to start after (from a previous query result).
   * Takes precedence over cursor (string ID).
   */
  cursorDoc?: DocumentSnapshot | null;

  /**
   * Field to order by, defaults to "createdAt".
   */
  orderByField?: string;

  /**
   * Order direction. Defaults to "desc".
   */
  orderDirection?: "asc" | "desc";

  /**
   * Optional filters: array of { field, operator, value } tuples.
   */
  filters?: Array<{
    field: string;
    operator: FirebaseFirestore.WhereFilterOp;
    value: unknown;
  }>;
}

export interface PaginatedResult<T> {
  items: Array<{ id: string; data: T }>;
  nextCursor: string | null;
  hasMore: boolean;
}

/**
 * Executes a cursor-paginated query against a Firestore collection.
 *
 * ⛔ NUMERIC OFFSET IS BANNED — Firestore charges per document read
 * with offset, making it expensive and slow. Use cursor-based pagination.
 *
 * @param collectionPath - The Firestore collection path (e.g. "orders")
 * @param options - PaginationOptions for filtering, sorting, and cursor
 * @returns PaginatedResult with typed items and the next cursor ID
 */
export async function getPaginatedResults<T = Record<string, unknown>>(
  collectionPath: string,
  options: PaginationOptions = {}
): Promise<PaginatedResult<T>> {
  getAdminApp();
  const db = getFirestore();

  const limit = Math.min(options.limit ?? 20, 100);
  const orderByField = options.orderByField ?? "createdAt";
  const orderDirection = options.orderDirection ?? "desc";

  let query: FirebaseFirestore.Query = db
    .collection(collectionPath)
    .orderBy(orderByField, orderDirection)
    .limit(limit + 1); // Fetch +1 to determine hasMore

  // Apply filters
  if (options.filters && options.filters.length > 0) {
    for (const filter of options.filters) {
      query = query.where(filter.field, filter.operator, filter.value);
    }
  }

  // Apply cursor
  if (options.cursorDoc) {
    query = query.startAfter(options.cursorDoc);
  } else if (options.cursor) {
    const cursorSnapshot = await db.collection(collectionPath).doc(options.cursor).get();
    if (cursorSnapshot.exists) {
      query = query.startAfter(cursorSnapshot);
    }
  }

  const snapshot = await query.get();
  const docs = snapshot.docs;

  // Determine if there are more results
  const hasMore = docs.length > limit;
  const items = docs.slice(0, limit).map((doc) => ({
    id: doc.id,
    data: doc.data() as T,
  }));

  const nextCursor = hasMore ? docs[limit - 1].id : null;

  return { items, nextCursor, hasMore };
}

/**
 * Builds Firestore filters from common query patterns.
 * Use this to construct the filters array for getPaginatedResults.
 */
export function buildFilter(
  field: string,
  operator: FirebaseFirestore.WhereFilterOp,
  value: unknown
): { field: string; operator: FirebaseFirestore.WhereFilterOp; value: unknown } {
  return { field, operator, value };
}
