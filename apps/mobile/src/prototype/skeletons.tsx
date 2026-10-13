import React from "react";
import { View } from "react-native";
import {
  Skeleton,
  SkeletonCard,
  SkeletonGrid,
  SkeletonLine,
} from "../components/ui/Feedback";
import { useTheme } from "../theme/useTheme";

/**
 * Loading compositions that mirror the real layouts, so skeleton states match
 * the screens they stand in for (spec §10).
 */
export const HomeSkeleton = () => (
  <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Skeleton style={{ width: 40, height: 40, borderRadius: 20 }} />
      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonLine style={{ height: 10, width: 96 }} />
        <SkeletonLine style={{ height: 14, width: 128 }} />
      </View>
      <Skeleton style={{ width: 40, height: 40, borderRadius: 20 }} />
    </View>
    <SkeletonLine style={{ height: 10, width: 80, marginTop: 28 }} />
    <SkeletonLine style={{ height: 16, width: 160, marginTop: 8 }} />
    <View style={{ marginTop: 12, gap: 14 }}>
      <SkeletonCard />
      <SkeletonCard />
    </View>
  </View>
);

export const GallerySkeleton = () => (
  <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
    <View style={{ flexDirection: "row", gap: 16 }}>
      <Skeleton style={{ width: 80, height: 80, borderRadius: 40 }} />
      <View style={{ flex: 1, gap: 8, paddingTop: 4 }}>
        <SkeletonLine style={{ height: 16, width: 144 }} />
        <SkeletonLine style={{ height: 10, width: 96 }} />
        <View style={{ flexDirection: "row", gap: 20, paddingTop: 4 }}>
          <SkeletonLine style={{ height: 24, width: 48 }} />
          <SkeletonLine style={{ height: 24, width: 48 }} />
        </View>
      </View>
    </View>
    <View style={{ marginTop: 16, flexDirection: "row", gap: 8 }}>
      <Skeleton style={{ height: 36, width: 64, borderRadius: 999 }} />
      <Skeleton style={{ height: 36, width: 128, borderRadius: 999 }} />
      <Skeleton style={{ height: 36, width: 112, borderRadius: 999 }} />
    </View>
    <View style={{ marginTop: 12 }}>
      <SkeletonGrid count={9} />
    </View>
  </View>
);

export const ReviewSkeleton = () => (
  <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 12 }}>
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <SkeletonLine style={{ height: 12, width: 80 }} />
      <Skeleton style={{ height: 24, width: 96, borderRadius: 999 }} />
    </View>
    <Skeleton style={{ height: 232, borderRadius: 20, marginTop: 12 }} />
    <View style={{ marginTop: 16, gap: 8 }}>
      <SkeletonLine style={{ height: 14, width: 160 }} />
      <SkeletonLine style={{ height: 10, width: 224 }} />
      <SkeletonLine style={{ height: 10, width: 192 }} />
    </View>
    <View style={{ marginTop: "auto", flexDirection: "row", gap: 12, paddingBottom: 20 }}>
      <Skeleton style={{ height: 48, flex: 1, borderRadius: 999 }} />
      <Skeleton style={{ height: 48, flex: 1, borderRadius: 999 }} />
    </View>
  </View>
);

export const ListSkeleton = ({ rows = 4 }: { rows?: number }) => {
  const t = useTheme();
  return (
  <View style={{ paddingHorizontal: 20, paddingTop: 16, gap: 10 }}>
    {Array.from({ length: rows }).map((_, i) => (
      <View
        key={i}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: t.border,
          padding: 12,
        }}
      >
        <Skeleton style={{ width: 48, height: 48, borderRadius: 12 }} />
        <View style={{ flex: 1, gap: 8 }}>
          <SkeletonLine style={{ height: 12, width: "66%" }} />
          <SkeletonLine style={{ height: 10, width: "33%" }} />
        </View>
      </View>
    ))}
  </View>
  );
};

export const GridOnlySkeleton = ({ count = 12 }: { count?: number }) => (
  <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
    <SkeletonGrid count={count} />
  </View>
);
