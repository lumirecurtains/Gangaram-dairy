// ============================================================
// FIRESTORE SCHEMA — typed interfaces for Gangaram platform
// Module 1 — Database, Rules, Public Storefront Split
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
  | "paid"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export type SubscriptionPlan = "BASIC" | "PREMIUM" | "ENTERPRISE";
export type SubscriptionStatus = "ACTIVE" | "PAST_DUE" | "SUSPENDED";

export type UserRole =
  | "customer"
  | "merchant_staff"
  | "rider"
  | "support_agent"
  | "super_admin";

// --- Merchant ---

export interface Merchant {
  ownerUid: string;
  razorpayAccountId: string | null;
  onboardingStatus: OnboardingStatus;
  // Modules 7+ fields
  fssaiNumber?: string;
  gstNumber?: string;
  geoFence?: GeoFence;
  billing?: BillingInfo;
  minimumProfitFloor?: number;
  // Module 7 onboarding
  subscriptionPlan?: SubscriptionPlan;
  subscriptionStatus?: SubscriptionStatus;
  billingCycleAnchor?: FirebaseTimestamp;
  featureFlags?: Record<string, boolean>;
  whiteLabelConfig?: Record<string, unknown> | null;
  enterpriseLicensing?: Record<string, unknown> | null;
  isFrozen?: boolean;
  rejectionReason?: string | null;
  deletedAt?: FirebaseTimestamp | null;
  // Module 11 SEO
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
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
  acceptedAt?: FirebaseTimestamp;
  readyAt?: FirebaseTimestamp;
  updatedBy?: string;
}

// --- User ---

export interface User {
  theme: "light" | "dark";
  language: string;
  name: string;
  address: string;
  phone: string;
  // Module 9 — admin only
  isBanned?: boolean;
  bannedReason?: string | null;
  bannedAt?: FirebaseTimestamp | null;
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
  // Module 13 extends this
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

export interface IdempotencyKey {
  createdAt: FirebaseTimestamp;
  resultOrderId: string;
  ttl: FirebaseTimestamp;
}

export interface FraudSignal {
  uid: string;
  signal: string;
  details: Record<string, unknown>;
  timestamp: FirebaseTimestamp;
}

// --- Module 12: Notifications ---

export interface NotificationTemplate {
  channel: "whatsapp" | "sms" | "push" | "in_app";
  subjectOrTitle: string;
  bodyTemplate: string;
  updatedAt: FirebaseTimestamp;
}

export interface NotificationPreference {
  whatsappEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  marketingOptIn: boolean;
}

export interface NotificationItem {
  title: string;
  body: string;
  read: boolean;
  createdAt: FirebaseTimestamp;
}

// --- Module 13: Analytics ---

export interface MerchantDailyStats {
  merchantId: string;
  date: string; // yyyy-mm-dd
  orderCount: number;
  grossRevenue: number;
  hotelShareTotal: number;
  riderShareTotal: number;
  avgOrderValue: number;
  cancelledCount: number;
}

// --- Module 14: Coupons & Loyalty ---

export interface Coupon {
  merchantId: string | null; // null = platform-wide
  discountPercent: number;
  maxUsesTotal: number;
  maxUsesPerUser: number;
  usesCount: number;
  expiresAt: FirebaseTimestamp;
  isActive: boolean;
}

export interface CouponRedemption {
  redeemedCount: number;
}

export interface LoyaltyAccount {
  pointsBalance: number;
  lifetimePoints: number;
  updatedAt: FirebaseTimestamp;
}

// --- Module 15: AI Config ---

export interface AIConfig {
  recommendationsEnabled: boolean;
  supportChatEnabled: boolean;
  provider: "none" | "anthropic" | string;
}

// --- Utility ---
// Compatible with both firebase (client) Timestamp and firebase-admin Timestamp

export interface FirebaseTimestamp {
  seconds: number;
  nanoseconds: number;
  toDate: () => Date;
  toMillis: () => number;
}

// Collection path helpers
export const Collections = {
  merchants: "merchants",
  storefronts: "storefronts",
  menus: (merchantId: string) => `merchants/${merchantId}/menus`,
  orders: "orders",
  users: "users",
  roleAssignments: "roleAssignments",
  auditLogs: "auditLogs",
  platformMetrics: "platformMetrics",
  supportTickets: "supportTickets",
  platformSettings: "platformSettings",
  featureFlags: "featureFlags",
  systemMeta: "systemMeta",
  migrations: "migrations",
  backupHistory: "backupHistory",
  idempotencyKeys: "idempotencyKeys",
  rateLimitCounters: "rateLimitCounters",
  fraudSignals: "fraudSignals",
  notificationTemplates: "notificationTemplates",
  notificationPreferences: "notificationPreferences",
  notifications: (uid: string) => `notifications/${uid}/items`,
  merchantDailyStats: "merchantDailyStats",
  coupons: "coupons",
  couponRedemptions: "couponRedemptions",
  loyaltyAccounts: "loyaltyAccounts",
  aiConfig: "aiConfig",
  dispatchFailures: "dispatchFailures",
} as const;
