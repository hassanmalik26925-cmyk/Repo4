import { type ReactNode } from "react";

export function ShimmerSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`shimmer-bg rounded-2xl ${className}`} />
  );
}

export function ShimmerRows({ count = 3, height = "h-28" }: { count?: number; height?: string }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <ShimmerSkeleton key={i} className={height} />
      ))}
    </div>
  );
}

export function ShimmerStatGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="shimmer-bg rounded-2xl p-4">
          <div className="mb-2 h-3 w-16 rounded shimmer-bg" />
          <div className="h-8 w-24 rounded shimmer-bg" />
        </div>
      ))}
    </div>
  );
}
