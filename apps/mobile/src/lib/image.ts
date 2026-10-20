/* Image pipeline — tasks T-042/T-043, features/photo-upload.md.

   Two jobs:

   1. Pick photos with the OS picker (camera or gallery) and ask for the
      permissions the platform wants.
   2. Prepare the two files the API expects from each pick: a compressed
      original (long edge 1920 px, JPEG 0.8) and a thumbnail (long edge
      480 px, JPEG 0.6). Both stay inside the server caps
      (LIMITS.ORIGINAL_MAX_BYTES / THUMB_MAX_BYTES) — a modern phone photo
      is far larger than the 5 MB the API accepts, so resizing is not an
      optimisation but a requirement.

   The native modules are imported lazily: the web bundle must not carry
   them, and this file stays importable from a plain Node unit test where
   only the pure helpers (planResize, withinLimits) run. */

import { LIMITS } from "@yearbookhub/shared";
import type { UploadFileRef } from "../prototype/types";

export interface PickedPhoto {
  /** Local URI of the picked file. */
  uri: string;
  width: number;
  height: number;
  /** Byte size when the platform reported one. */
  bytes?: number;
  /** Original file name, shown in the upload list. */
  name?: string;
}

export interface PreparedPhoto {
  original: UploadFileRef;
  thumb: UploadFileRef;
}

/* ------------------------------ pure helpers ----------------------------- */

export interface ResizePlan {
  width: number;
  height: number;
}

/** Scale an image down so its long edge is at most `longEdge` px. Images
 *  that are already small enough are left alone (never scaled up). */
export const planResize = (width: number, height: number, longEdge: number): ResizePlan => {
  if (!width || !height || longEdge <= 0) return { width: 0, height: 0 };
  const longest = Math.max(width, height);
  if (longest <= longEdge) return { width, height };
  const scale = longEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

/** True when the prepared files fit the server caps. */
export const withinLimits = (originalBytes: number, thumbBytes: number): boolean =>
  originalBytes > 0 &&
  originalBytes <= LIMITS.ORIGINAL_MAX_BYTES &&
  thumbBytes > 0 &&
  thumbBytes <= LIMITS.THUMB_MAX_BYTES;

/* ------------------------------- permissions ----------------------------- */

export const ensureCameraPermission = async (): Promise<boolean> => {
  const ImagePicker = await import("expo-image-picker");
  const current = await ImagePicker.getCameraPermissionsAsync();
  if (current.granted) return true;
  const asked = await ImagePicker.requestCameraPermissionsAsync();
  return asked.granted;
};

export const ensureLibraryPermission = async (): Promise<boolean> => {
  const ImagePicker = await import("expo-image-picker");
  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.granted) return true;
  const asked = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return asked.granted;
};

/* --------------------------------- picking ------------------------------- */

const toPicked = (asset: {
  uri: string;
  width: number;
  height: number;
  fileSize?: number;
  fileName?: string | null;
}): PickedPhoto => ({
  uri: asset.uri,
  width: asset.width,
  height: asset.height,
  bytes: asset.fileSize,
  name: asset.fileName ?? undefined,
});

/** One photo from the camera. Null when the student closed the camera. */
export const pickFromCamera = async (): Promise<PickedPhoto | null> => {
  const ImagePicker = await import("expo-image-picker");
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    quality: 1,
    allowsEditing: false,
  });
  if (result.canceled || !result.assets?.length) return null;
  return toPicked(result.assets[0]);
};

/** Up to `limit` photos from the gallery. Empty when the student backed out. */
export const pickFromLibrary = async (limit: number): Promise<PickedPhoto[]> => {
  const ImagePicker = await import("expo-image-picker");
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: true,
    selectionLimit: Math.max(1, limit),
    quality: 1,
    allowsEditing: false,
  });
  if (result.canceled || !result.assets?.length) return [];
  return result.assets.map(toPicked);
};

/* -------------------------------- preparing ------------------------------ */

/** Byte size of a local file. The native filesystem knows it exactly; the
 *  web build has no filesystem, so the file is fetched and measured. */
const fileSize = async (uri: string): Promise<number> => {
  try {
    const { File } = await import("expo-file-system");
    const file = new File(uri);
    if (file.exists) return file.size;
  } catch {
    // Web (or an exotic platform): fall through to the fetch measurement.
  }
  const response = await fetch(uri);
  const blob = await response.blob();
  return blob.size;
};

const resizeTo = async (
  uri: string,
  plan: ResizePlan,
  quality: number,
): Promise<{ uri: string; width: number; height: number }> => {
  const { ImageManipulator, SaveFormat } = await import("expo-image-manipulator");
  const context = ImageManipulator.manipulate(uri);
  if (plan.width && plan.height) context.resize({ width: plan.width, height: plan.height });
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ compress: quality, format: SaveFormat.JPEG });
  return { uri: saved.uri, width: saved.width, height: saved.height };
};

/**
 * Compress one picked photo into the original + thumbnail pair the API
 * uploads. Throws when the result still exceeds the server caps — the
 * caller turns that into the "photo too large" state.
 */
export const preparePhoto = async (photo: PickedPhoto): Promise<PreparedPhoto> => {
  const originalPlan = planResize(photo.width, photo.height, LIMITS.ORIGINAL_LONG_EDGE_PX);
  const thumbPlan = planResize(photo.width, photo.height, LIMITS.THUMB_LONG_EDGE_PX);

  const original = await resizeTo(photo.uri, originalPlan, LIMITS.ORIGINAL_JPEG_QUALITY);
  const thumb = await resizeTo(photo.uri, thumbPlan, LIMITS.THUMB_JPEG_QUALITY);

  const originalBytes = await fileSize(original.uri);
  const thumbBytes = await fileSize(thumb.uri);

  if (!withinLimits(originalBytes, thumbBytes)) {
    const error = new Error("PHOTO_TOO_LARGE");
    error.name = "PHOTO_TOO_LARGE";
    throw error;
  }

  return {
    original: {
      uri: original.uri,
      width: original.width || originalPlan.width,
      height: original.height || originalPlan.height,
      bytes: originalBytes,
    },
    thumb: {
      uri: thumb.uri,
      width: thumb.width || thumbPlan.width,
      height: thumb.height || thumbPlan.height,
      bytes: thumbBytes,
    },
  };
};

/** Prepare a batch, one photo at a time (resizing is CPU-bound). */
export const preparePhotos = async (
  photos: PickedPhoto[],
  onProgress?: (index: number, total: number) => void,
): Promise<PreparedPhoto[]> => {
  const prepared: PreparedPhoto[] = [];
  for (let i = 0; i < photos.length; i++) {
    prepared.push(await preparePhoto(photos[i]));
    onProgress?.(i + 1, photos.length);
  }
  return prepared;
};
