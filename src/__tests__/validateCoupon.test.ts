import { describe, it, expect } from "vitest";
import { validateCoupon } from "@/lib/promotions/validateCoupon";

const VALID_COUPON = {
  isActive: true,
  discountPercent: 15,
  maxUsesTotal: 100,
  maxUsesPerUser: 3,
  usesCount: 0,
};

describe("validateCoupon", () => {
  it("returns valid for active coupon within limits", () => {
    const result = validateCoupon(
      { ...VALID_COUPON, expiresAt: { seconds: Date.now() / 1000 + 86400 } },
      0,
      Date.now()
    );
    expect(result.valid).toBe(true);
    expect(result.discountPercent).toBe(15);
  });

  it("rejects inactive coupon", () => {
    const result = validateCoupon(
      { ...VALID_COUPON, isActive: false, expiresAt: { seconds: Date.now() / 1000 + 86400 } },
      0
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Coupon is no longer active");
  });

  it("rejects expired coupon", () => {
    const pastTime = Date.now() - 86400000;
    const result = validateCoupon(
      { ...VALID_COUPON, expiresAt: { seconds: pastTime / 1000 } },
      0,
      Date.now()
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Coupon has expired");
  });

  it("rejects when total uses reached", () => {
    const result = validateCoupon(
      { ...VALID_COUPON, usesCount: 100, maxUsesTotal: 100, expiresAt: { seconds: Date.now() / 1000 + 86400 } },
      0
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Coupon has reached its maximum total uses");
  });

  it("rejects when per-user cap reached", () => {
    const result = validateCoupon(
      { ...VALID_COUPON, expiresAt: { seconds: Date.now() / 1000 + 86400 } },
      3
    );
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("You have already used this coupon the maximum number of times");
  });

  it("accepts when below per-user cap", () => {
    const result = validateCoupon(
      { ...VALID_COUPON, expiresAt: { seconds: Date.now() / 1000 + 86400 } },
      2
    );
    expect(result.valid).toBe(true);
  });
});
