import { Skeleton, SkeletonCard, SkeletonGrid, SkeletonLine, SkeletonTile } from "@/components/app/Feedback";

/**
 * Loading compositions that mirror the real layouts, so the skeleton states on
 * the States page match the screens they stand in for.
 */
export const HomeSkeleton = () => (
  <div className="px-5 pt-3">
    <div className="flex items-center gap-3">
      <Skeleton className="size-10 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <SkeletonLine className="h-2.5 w-24" />
        <SkeletonLine className="h-3.5 w-32" />
      </div>
      <Skeleton className="size-10 rounded-full" />
    </div>
    <SkeletonLine className="mt-7 h-2.5 w-20" />
    <SkeletonLine className="mt-2 h-4 w-40" />
    <div className="mt-3 space-y-3.5">
      <SkeletonCard />
      <SkeletonCard />
    </div>
  </div>
);

export const GallerySkeleton = () => (
  <div className="px-5 pt-4">
    <div className="flex items-start gap-4">
      <Skeleton className="size-20 rounded-full" />
      <div className="flex-1 space-y-2 pt-1">
        <SkeletonLine className="h-4 w-36" />
        <SkeletonLine className="h-2.5 w-24" />
        <div className="flex gap-5 pt-1">
          <SkeletonLine className="h-6 w-12" />
          <SkeletonLine className="h-6 w-12" />
        </div>
      </div>
    </div>
    <div className="mt-4 flex gap-2">
      <Skeleton className="h-9 w-16 rounded-full" />
      <Skeleton className="h-9 w-32 rounded-full" />
      <Skeleton className="h-9 w-28 rounded-full" />
    </div>
    <SkeletonGrid className="mt-3" count={9} />
  </div>
);

export const ReviewSkeleton = () => (
  <div className="flex h-full flex-col px-5 pt-3">
    <div className="flex items-center justify-between">
      <SkeletonLine className="h-3 w-20" />
      <Skeleton className="h-6 w-24 rounded-full" />
    </div>
    <Skeleton className="mt-3 h-[300px] w-full rounded-[20px]" />
    <div className="mt-4 space-y-2">
      <SkeletonLine className="h-3.5 w-40" />
      <SkeletonLine className="h-2.5 w-56" />
      <SkeletonLine className="h-2.5 w-48" />
    </div>
    <div className="mt-auto flex gap-3 pb-5">
      <Skeleton className="h-12 flex-1 rounded-full" />
      <Skeleton className="h-12 flex-1 rounded-full" />
    </div>
  </div>
);

export const ListSkeleton = ({ rows = 4 }: { rows?: number }) => (
  <div className="space-y-2.5 px-5 pt-4">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3">
        <Skeleton className="size-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <SkeletonLine className="h-3 w-2/3" />
          <SkeletonLine className="h-2.5 w-1/3" />
        </div>
      </div>
    ))}
  </div>
);

export const GridOnlySkeleton = () => <SkeletonGrid className="px-5 pt-2" count={12} />;

export const AvatarSkeleton = () => <Skeleton className="size-20 rounded-full" />;

export const TileSkeletonRow = () => (
  <div className="flex gap-2 px-5 pt-3">
    {Array.from({ length: 4 }).map((_, i) => (
      <SkeletonTile key={i} className="w-20" />
    ))}
  </div>
);
