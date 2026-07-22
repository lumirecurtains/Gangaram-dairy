"use client";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`skeleton ${className}`} />;
}

export function RestaurantCardSkeleton() {
  return (
    <div className="rounded-xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <Skeleton className="w-full h-40 rounded-lg mb-3" />
      <Skeleton className="w-3/4 h-5 rounded mb-2" />
      <Skeleton className="w-1/2 h-4 rounded mb-2" />
      <Skeleton className="w-1/3 h-4 rounded" />
    </div>
  );
}

export function MenuItemSkeleton() {
  return (
    <div className="flex gap-3 p-4 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      <Skeleton className="w-20 h-20 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="w-2/3 h-5 rounded" />
        <Skeleton className="w-full h-4 rounded" />
        <Skeleton className="w-1/4 h-4 rounded" />
      </div>
    </div>
  );
}
