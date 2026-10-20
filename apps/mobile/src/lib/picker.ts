/* Photo picker — the real camera/gallery flow (T-043).

   The demo build keeps its mock picker sheet (a grid of bundled photos).
   This hook is the real build's path: ask the OS for the permission, open
   the system picker, resize what came back and put the prepared files into
   the upload draft. */

import { useCallback, useState } from "react";
import { useMockApp } from "../prototype/store";
import { MAX_BATCH } from "../prototype/selectors";
import type { UploadItem } from "../prototype/types";
import {
  ensureCameraPermission,
  ensureLibraryPermission,
  pickFromCamera,
  pickFromLibrary,
  preparePhotos,
  type PickedPhoto,
} from "./image";
import { randomUuid } from "./uuid";

export type PickError = "denied" | "too-large" | "failed" | null;

export interface PickOutcome {
  granted: boolean;
  added: number;
  canceled: boolean;
}

export const usePhotoPicker = () => {
  const { dispatch } = useMockApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<PickError>(null);

  const addPhotos = useCallback(
    async (photos: PickedPhoto[]) => {
      if (!photos.length) return;
      setBusy(true);
      setError(null);
      try {
        const prepared = await preparePhotos(photos);
        const items: UploadItem[] = prepared.map((files, index) => ({
          id: `u-${Date.now()}-${randomUuid().slice(0, 8)}-${index}`,
          src: files.thumb.uri,
          name: photos[index]?.name,
          caption: "",
          status: "waiting",
          progress: 0,
          clientId: randomUuid(),
          files: { original: files.original, thumb: files.thumb },
        }));
        dispatch({ type: "addUploadFiles", items });
      } catch (caught) {
        const name = (caught as Error)?.name;
        setError(name === "PHOTO_TOO_LARGE" ? "too-large" : "failed");
      } finally {
        setBusy(false);
      }
    },
    [dispatch],
  );

  /** One photo from the camera. */
  const pickCamera = useCallback(async (): Promise<PickOutcome> => {
    setError(null);
    const granted = await ensureCameraPermission();
    if (!granted) {
      setError("denied");
      return { granted: false, added: 0, canceled: false };
    }
    const photo = await pickFromCamera();
    if (!photo) return { granted: true, added: 0, canceled: true };
    await addPhotos([photo]);
    return { granted: true, added: 1, canceled: false };
  }, [addPhotos]);

  /** Up to `limit` photos from the gallery. */
  const pickLibrary = useCallback(
    async (limit: number = MAX_BATCH): Promise<PickOutcome> => {
      setError(null);
      const granted = await ensureLibraryPermission();
      if (!granted) {
        setError("denied");
        return { granted: false, added: 0, canceled: false };
      }
      const photos = await pickFromLibrary(limit);
      if (!photos.length) return { granted: true, added: 0, canceled: true };
      await addPhotos(photos);
      return { granted: true, added: photos.length, canceled: false };
    },
    [addPhotos],
  );

  return { pickCamera, pickLibrary, busy, error };
};
