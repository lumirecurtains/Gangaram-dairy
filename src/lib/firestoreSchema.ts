// ============================================================
// FIRESTORE SCHEMA — typed interfaces for Gangaram platform
// Module 1 — Database, Rules, Public Storefront Split
// Module 13 — Reviews & Ratings schema added
// Module 18 — Notifications & Communication
// ============================================================

// --- Enums ---

export type OnboardingStatus =
  | "DRAFT"
  | "PENDING_VERIFICATION"
  | "LIVE"
  | "REJECTED"
  | "SUSPENDED"
  | "FROZEN"
  | "DELETED";

export type OrderStatus =
  | "pending_payment"
  | "payment_failed"
  | "paid"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "refunded";

export type SubscriptionPlan = "BASIC" | "PREMIUM" | "ENTERPRISE";
export type SubscriptionStatus = "ACTIVE" | "PAST_DUE" | "SUSPENDED";

export type UserRole =
  | "customer"
  | "merchant_staff"
  | "rider"
  | "support_agent"
  | "super_admin";

export type NotificationType =
  | "order.placed"
  | "payment.success"
  | "payment.failed"
  | "order.accepted"
  | "order.preparing"
  | "order.ready"
  | "rider.assigned"
  | "order.out_for_delivery"
  | "order.delivered"
  | "order.cancelled"
  | "refund.initiated"
  | "refund.completed"
  | "coupon.applied"
  | "admin.new_order"
  | "admin.payment_success"
  | "admin.payment_failed"
  | "admin.new_review"
  | "admin.order_cancelled";

// --- Merchant ---

export interface Merchant {
  ownerUid: string;
  razorpayAccountId: string | null;
  onboardingStatus: OnboardingStatus;
  fssaiNumber?: string;
  gstNumber?: string;
  geoFence?: GeoFence;
  billing?: BillingInfo;
  minimumProfitFloor?: number;
  subscriptionPlan?: SubscriptionPlan;
  subscriptionStatus?: SubscriptionStatus;
  billingCycleAnchor?: FirebaseTimestamp;
  featureFlags?: Record<string, boolean>;
  whiteLabelConfig?: Record<string, unknown> | null;
  enterpriseLicensing?: Record<string, unknown> | null;
  isFrozen?: boolean;
  rejectionReason?: string | null;
  deletedAt?: FirebaseTimestamp | null;
  seoIndexable?: boolean;
  metaTitleOverride?: string | null;
  metaDescriptionOverride?: string | null;
}

export interface GeoFence {
  lat: number;
  lng: number;
  radiusKm: number;
}

export interface BillingInfo {
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstNumber?: string;
}

// --- Storefront (PUBLIC READ) ---

export interface Storefront {
  merchantId: string;
  ownerUid: string;
  name: string;
  slug: string;
  city: string;
  isOnline: boolean;
  brandColor: string | null;
  ogImageUrl: string | null;
  onboardingStatus: OnboardingStatus;
  cuisine?: string | null;
  openingHours?: string | null;
  priceForTwo?: number | null;
  promoBanner?: string | null;

  // Module 13: Storefront is the public source of truth for ratings
  averageRating?: number;
  reviewCount?: number;

  updatedAt: FirebaseTimestamp;
}

// --- Menu Item ---

export interface MenuItem {
  name: string;
  description: string;
  ourPrice: number;
  baseCost: number;
  hotelProfit: number;
  isAvailable: boolean;
  aggregatorPrice: number | null;
  category: string;
  imageUrl: string;
  veg: boolean;
  sortOrder: number;
}

// --- Order Item (embedded in Order) ---

export interface OrderItem {
  itemId: string;
  name: string;
  qty: number;
  ourPrice: number;
  aggregatorPrice: number | null;
  baseCost: number;
  hotelProfit: number;
}

// --- Delivery Address (embedded in Order) ---

export interface DeliveryAddress {
  flat: string;
  street: string;
  city: string;
  pincode: string;
  landmark?: string;
}

// --- Order ---

export interface Order {
  userId: string;
  merchantId: string;
  riderId: string | null;
  items: OrderItem[];
  status: OrderStatus;
  deliveryAddress: DeliveryAddress;
  subTotal: number;
  deliveryFee: number;
  hotelShare: number;
  riderShare: number;
  grandTotal: number;
  razorpayOrderId: string | null;
  paymentId: string | null;
  couponCode?: string | null;
  discountPercent?: number;
  deliveryPinHash?: string;
  failedPinAttempts?: number;
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
  acceptedAt?: FirebaseTimestamp;
  readyAt?: FirebaseTimestamp;
  deliveredAt?: FirebaseTimestamp;
  updatedBy?: string;
  hasBeenReviewed?: boolean;
  // Module 3 — payment failure metadata
  paymentFailure?: PaymentFailure | null;
}

export interface PaymentFailure {
  errorCode: string | null;
  errorDescription: string | null;
  failedAt: FirebaseTimestamp;
}

// --- User ---

export interface User {
  theme: "light" | "dark";
  language: string;
  name: string;
  address: string;
  phone: string;
  isBanned?: boolean;
  bannedReason?: string | null;
  bannedAt?: FirebaseTimestamp | null;
}

// --- Module 13: Reviews ---
export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface Review {
  orderId: string;
  merchantId: string;
  userId: string;
  userName?: string | null;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
  moderatedBy?: string | null;
  moderationReason?: string | null;
}

// --- Module 6: Admin Collections ---

export interface RoleAssignment {
  role: UserRole;
  grantedBy: string;
  grantedAt: FirebaseTimestamp;
  revokedAt?: FirebaseTimestamp;
}

export interface AuditLog {
  actorUid: string;
  action: string;
  targetPath: string;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  timestamp: FirebaseTimestamp;
}

export interface PlatformMetrics {
  totalOrders: number;
  totalGMV: number;
  activeMerchants: number;
  activeRiders: number;
  aggregatorSavingsTotal?: number;
  avgOrderValue?: number;
}

export interface SupportTicket {
  merchantId: string;
  subject: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "critical";
  createdAt: FirebaseTimestamp;
}

// --- Module 9: Security ---

export interface IdempotencyRecord {
  key: string;
  uid: string;
  result: unknown | null;
  status: "processing" | "completed";
  createdAt: FirebaseTimestamp;
  ttl: FirebaseTimestamp;
}

export interface FraudSignal {
  uid: string;
  signal: string;
  details: Record<string, unknown>;
  timestamp: FirebaseTimestamp;
}

// --- Module 12 + Module 18: Notifications ---

export interface NotificationTemplate {
  channel: "whatsapp" | "sms" | "push" | "in_app";
  subjectOrTitle: string;
  bodyTemplate: string;
  updatedAt: FirebaseTimestamp;
}

export interface NotificationPreference {
  orderUpdates: boolean;
  paymentAlerts: boolean;
  offers: boolean;
  marketing: boolean;
}

export interface NotificationItem {
  title: string;
  body: string;
  read: boolean;
  type: string;
  link: string;
  metadata?: Record<string, unknown> | null;
  createdAt: FirebaseTimestamp;
}

// --- Module 13: Analytics ---

export interface MerchantDailyStats {
  merchantId: string;
  date: string;
  orderCount: number;
  grossRevenue: number;
  hotelShareTotal: number;
  riderShareTotal: number;
  avgOrderValue: number;
  cancelledCount: number;
}

// --- Module 14: Coupons & Loyalty ---

export interface Coupon {
  merchantId: string | null;
  discountPercent: number;
  maxUsesTotal: number;
  maxUsesPerUser: number;
  usesCount: number;
  expiresAt: FirebaseTimestamp;
  isActive: boolean;
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
}

export interface CouponRedemption {
  userId: string;
  couponCode: string;
  redeemedCount: number;
  lastRedeemedAt: FirebaseTimestamp;
}

export interface LoyaltyAccount {
  userId: string;
  pointsBalance: number;
  lifetimePoints: number;
  updatedAt: FirebaseTimestamp;
}

// --- Utility Types ---

export type FirebaseTimestamp = ReturnType<typeof import("firebase-admin/firestore").Timestamp.now>;
