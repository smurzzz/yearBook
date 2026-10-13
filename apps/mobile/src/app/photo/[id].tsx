import React from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { PhotoViewerOverlay } from "@/sheets/PhotoSheets";

/** Full-screen photo viewer pushed from My Photos and Home grids. */
export default function PhotoRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  return <PhotoViewerOverlay open photoId={id} onClose={() => router.back()} />;
}
