import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { Flag } from "lucide-react-native";
import { useTheme } from "../../theme/useTheme";
import { radius as radii, typography } from "../../theme/tokens";
import { initials } from "../../prototype/format";
import { img } from "../../prototype/assets";
import { StackBadge, StatusIcon } from "./Chips";
import type { PhotoItem } from "../../prototype/types";

const FILL = { position: "absolute" as const, left: 0, right: 0, top: 0, bottom: 0 };

/* -------------------------------- Avatar -------------------------------- */

const AVATAR_SIZES = { xs: 24, sm: 32, md: 40, lg: 56, xl: 80 } as const;
export type AvatarSize = keyof typeof AVATAR_SIZES;
const AVATAR_FONT: Record<AvatarSize, number> = { xs: 10, sm: 12, md: 13, lg: 17, xl: 20 };

export const Avatar = ({
  src,
  name,
  size = "md",
  tone = "brand",
  style,
}: {
  src?: string;
  name: string;
  size?: AvatarSize;
  tone?: "brand" | "admin";
  style?: StyleProp<ViewStyle>;
}) => {
  const t = useTheme();
  const [failed, setFailed] = useState(false);
  const dim = AVATAR_SIZES[size];
  const showPhoto = Boolean(src) && !failed;
  return (
    <View
      accessibilityLabel={name}
      style={[
        {
          width: dim,
          height: dim,
          borderRadius: dim / 2,
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: tone === "admin" ? t.admin : t.primarySoft,
        },
        style,
      ]}
    >
      {showPhoto ? (
        <Image source={img(src!)} style={{ width: dim, height: dim }} onError={() => setFailed(true)} />
      ) : (
        <Text
          style={{
            color: tone === "admin" ? t.adminForeground : t.primary,
            fontSize: AVATAR_FONT[size],
            fontWeight: "700",
          }}
        >
          {initials(name)}
        </Text>
      )}
    </View>
  );
};

/* -------------------------------- PhotoTile ------------------------------ */

export const PhotoTile = ({
  photo,
  showStatus = false,
  batchCount = 1,
  size,
  onPress,
  style,
}: {
  photo: PhotoItem;
  /** Admin surfaces only. Student surfaces must never pass this. */
  showStatus?: boolean;
  batchCount?: number;
  /** Fixed tile size; omit for responsive width inside a wrapping grid. */
  size?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) => {
  const t = useTheme();
  const reported = Boolean(photo.removalRequest && !photo.removalRequest.resolved);
  return (
    <Pressable
      accessibilityRole="imagebutton"
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: size,
          aspectRatio: 1,
          borderRadius: radii.tile,
          overflow: "hidden",
          backgroundColor: t.muted,
          opacity: pressed ? 0.92 : 1,
        },
        style,
      ]}
    >
      <Image source={img(photo.src)} style={FILL} resizeMode="cover" />
      {showStatus ? (
        <View style={{ position: "absolute", left: 6, top: 6 }}>
          <StatusIcon status={photo.status} />
        </View>
      ) : null}
      {showStatus && reported ? (
        <View
          style={{
            position: "absolute",
            right: 6,
            top: 6,
            flexDirection: "row",
            alignItems: "center",
            gap: 3,
            borderRadius: radii.pill,
            backgroundColor: t.reported,
            paddingHorizontal: 6,
            paddingVertical: 3,
          }}
        >
          <Flag size={12} color={t.onImage} />
          <Text style={[typography.caption, { color: t.onImage, fontWeight: "600" }]}>Reported</Text>
        </View>
      ) : null}
      {batchCount > 1 ? (
        <View style={{ position: "absolute", right: 6, bottom: 6 }}>
          <StackBadge count={batchCount} />
        </View>
      ) : null}
    </Pressable>
  );
};

/** 3-column wrapping grid (gap 2), matching the PhotoGrid rules. */
export const PhotoGrid = ({
  photos,
  width,
  showStatus,
  onPhotoPress,
  batchCounts,
  padded = false,
  style,
}: {
  photos: PhotoItem[];
  /** Available content width. */
  width: number;
  showStatus?: boolean;
  onPhotoPress?: (photo: PhotoItem) => void;
  batchCounts?: Map<string, number>;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}) => {
  const gap = 2;
  const pad = padded ? 20 : 0;
  const tile = (width - pad * 2 - gap * 2) / 3;
  return (
    <View style={[{ flexDirection: "row", flexWrap: "wrap", paddingHorizontal: pad, gap }, style]}>
      {photos.map((photo) => (
        <PhotoTile
          key={photo.id}
          photo={photo}
          size={tile}
          showStatus={showStatus}
          batchCount={
            photo.batchId ? batchCounts?.get(photo.batchId) ?? 1 : 1
          }
          onPress={() => onPhotoPress?.(photo)}
        />
      ))}
    </View>
  );
};

/* --------------------------------- Brand --------------------------------- */

/** YearbookHub mark: an aperture iris inside a yearbook page with a folded corner. */
export const LogoMark = ({ size = 32, color = "#5B4BE0" }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" accessibilityElementsHidden importantForAccessibility="no">
    <Path
      d="M8.5 2.75h9.9L28 12.35V25.5a3.75 3.75 0 0 1-3.75 3.75H8.5A3.75 3.75 0 0 1 4.75 25.5V6.5A3.75 3.75 0 0 1 8.5 2.75Z"
      fill={color}
      fillOpacity={0.12}
    />
    <Path
      d="M8.5 2.75h9.9L28 12.35V25.5a3.75 3.75 0 0 1-3.75 3.75H8.5A3.75 3.75 0 0 1 4.75 25.5V6.5A3.75 3.75 0 0 1 8.5 2.75Z"
      fill="none"
      stroke={color}
      strokeWidth={1.7}
      strokeLinejoin="round"
    />
    <Path d="M18.4 2.75V12.35H28" fill="none" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
    <Circle cx={16.2} cy={18.6} r={5.5} fill="none" stroke={color} strokeWidth={1.6} />
    <Path
      d="M16.2 13.1 21 15.85 21 21.35 16.2 24.1 11.4 21.35 11.4 15.85Z"
      fill="none"
      stroke={color}
      strokeWidth={1.2}
      strokeLinejoin="round"
      opacity={0.85}
    />
  </Svg>
);

/** Full lockup used on Sign In and app bars. */
export const Logo = ({
  size = 32,
  tagline,
  tone = "brand",
}: {
  size?: number;
  tagline?: string;
  tone?: "brand" | "onImage" | "admin";
}) => {
  const t = useTheme();
  const accent =
    tone === "brand" ? t.primary : tone === "admin" ? t.admin : t.onImage;
  const text = tone === "brand" ? t.foreground : accent;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <LogoMark size={size} color={accent} />
      <View>
        <Text style={[typography.subhead, { color: text, fontWeight: "800", letterSpacing: -0.34 }]}>
          Yearbook<Text style={{ color: accent }}>Hub</Text>
        </Text>
        {tagline ? (
          <Text style={[typography.caption, { color: tone === "brand" ? t.mutedForeground : text, opacity: 0.8 }]}>
            {tagline}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

/** Google's brand mark — identity colors stay untouched. */
export const GoogleMark = ({ size = 18 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityElementsHidden importantForAccessibility="no">
    <Path
      fill="#EA4335"
      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
    />
    <Path
      fill="#4285F4"
      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65Z"
    />
    <Path
      fill="#FBBC05"
      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19Z"
    />
    <Path
      fill="#34A853"
      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"
    />
  </Svg>
);

/* ------------------------------ ZoomableImage ---------------------------- */

type GestureStore = {
  zoomed: boolean;
  onSwipe?: (delta: number) => void;
  lastScale: number;
  swipeLock: boolean;
  origin: { x: number; y: number } | null;
  d: { dx: number; dy: number };
};

/* Gesture offset helpers: module scope keeps every mutable operation out of
   the render pass (react-hooks/refs). */
const panExtract = (v: Animated.ValueXY) => v.extractOffset();
const panFlatten = (v: Animated.ValueXY) => v.flattenOffset();
const panSet = (v: Animated.ValueXY, x: number, y: number) => v.setValue({ x, y });

/**
 * Pinch-to-zoom + tap-to-zoom + pan while zoomed, plus horizontal swipe
 * detection for the review deck (previous/next). Handlers are attached via
 * the View responder props and read live zoom/onSwipe values from a store
 * ref that an effect keeps in sync with render state; deltas are tracked
 * from page coordinates (the View responder API has no gesture state).
 */
export const ZoomableImage = ({
  src,
  style,
  onSwipe,
  children,
}: {
  src: string;
  style?: StyleProp<ViewStyle>;
  onSwipe?: (delta: number) => void;
  children?: React.ReactNode;
}) => {
  const [scale] = useState(() => new Animated.Value(1));
  const [translate] = useState(() => new Animated.ValueXY({ x: 0, y: 0 }));
  const [zoomed, setZoomed] = useState(false);
  const store = useRef<GestureStore>({
    zoomed: false,
    lastScale: 1,
    swipeLock: false,
    origin: null,
    d: { dx: 0, dy: 0 },
  });

  useEffect(() => {
    store.current.zoomed = zoomed;
    store.current.onSwipe = onSwipe;
  }, [onSwipe, store, zoomed]);

  const animateTo = (toScale: number, x = 0, y = 0) => {
    store.current.lastScale = toScale;
    Animated.parallel([
      Animated.spring(scale, { toValue: toScale, useNativeDriver: true, friction: 7 }),
      Animated.spring(translate, { toValue: { x, y }, useNativeDriver: true, friction: 7 }),
    ]).start(() => setZoomed(toScale > 1));
  };

  const swipe = (dx: number, dy: number) => {
    if (store.current.swipeLock) return;
    if (Math.abs(dx) <= 60 || Math.abs(dy) >= 40) return;
    store.current.swipeLock = true;
    store.current.onSwipe?.(dx < 0 ? 1 : -1);
    setTimeout(() => {
      store.current.swipeLock = false;
    }, 400);
  };

  return (
    <View
      style={[{ overflow: "hidden" }, style]}
      onMoveShouldSetResponder={(e) => {
        const { pageX, pageY } = e.nativeEvent;
        const origin = store.current.origin;
        if (!origin) {
          store.current.origin = { x: pageX, y: pageY };
          return false;
        }
        return Math.abs(pageX - origin.x) > 8 || Math.abs(pageY - origin.y) > 8;
      }}
      onResponderGrant={(e) => {
        store.current.origin = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
        if (store.current.lastScale > 1) panExtract(translate);
      }}
      onResponderMove={(e) => {
        const origin = store.current.origin;
        if (!origin) return;
        const dx = e.nativeEvent.pageX - origin.x;
        const dy = e.nativeEvent.pageY - origin.y;
        store.current.d = { dx, dy };
        if (store.current.lastScale > 1) panSet(translate, dx, dy);
      }}
      onResponderRelease={() => {
        const { dx, dy } = store.current.d;
        if (store.current.lastScale > 1) {
          panFlatten(translate);
          if (Math.abs(dx) < 6 && Math.abs(dy) < 6 && !store.current.zoomed) return;
          if (Math.abs(dx) > 60 && Math.abs(dy) < 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            animateTo(1);
            panSet(translate, 0, 0);
            swipe(dx, dy);
          } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
            animateTo(store.current.zoomed ? 1 : 2.2);
            panSet(translate, 0, 0);
          }
        } else {
          swipe(dx, dy);
        }
      }}
    >
      <Animated.Image
        source={img(src)}
        style={[FILL, { transform: [{ scale }, { translateX: translate.x }, { translateY: translate.y }] }]}
        resizeMode="cover"
      />
      {children}
    </View>
  );
};
