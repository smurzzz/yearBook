/* P6 slice wiring — phases.md P6 step 5 (Auth was wired in T-021/T-023).

   One hook per slice hydrates the prototype store from the API when the app
   runs against the backend (USE_MOCK=false). In the demo build the store
   already holds the same data — the fixtures ARE the server response — so
   the fetch is skipped by definition; only the upload pipeline branches,
   because its mock path is a simulation by design.

   Retry: the screens' ErrorRetryBlock clears `state.loadError` with
   setLoadError(false), which re-arms these effects (loadError is a dep).

   Paging: list endpoints are drained page-by-page (limit 60 = the contract
   max) because the grids and their client-side filters need the full set —
   the richer-tile decision (api.md client notes). MAX_PAGES is a safety cap
   far above yearbook scale. */

import { useEffect } from "react";
import { api, USE_MOCK } from "./index";
import {
  personFromUploader,
  registerEventsFrom,
  registerPeopleFrom,
  toAdminPhoto,
  toAdminPhotoFromTile,
  toEventItem,
  toMyPhoto,
  toNotification,
  toStudentPhoto,
} from "./dto";
import { useMockApp } from "../prototype/store";
import { currentUserId } from "../prototype/selectors";
import type { PhotoItem } from "../prototype/types";

export const PAGE_SIZE = 60;
const MAX_PAGES = 50;

interface Page<T> {
  data: T[];
  next_cursor: string | null;
}

const fetchAll = async <T>(
  fetchPage: (cursor: string | null) => Promise<Page<T>>,
): Promise<T[]> => {
  const all: T[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < MAX_PAGES; i++) {
    const page = await fetchPage(cursor);
    all.push(...page.data);
    if (!page.next_cursor) return all;
    cursor = page.next_cursor;
  }
  return all;
};

/** Run `load` once per arm (loadError false → true → cleared). */
const useHydratedSync = (load: () => Promise<void>, deps: readonly unknown[]) => {
  const { state, dispatch } = useMockApp();
  useEffect(() => {
    if (USE_MOCK || state.loadError) return; // demo build: fixtures are loaded
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch {
        if (!cancelled) dispatch({ type: "setLoadError", value: true });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.loadError, ...deps]);
};

/** Events catalog (Home, Upload, My Photos chips, Review, Events screen). */
export const useEventsSync = () => {
  const { state, dispatch } = useMockApp();
  useEffect(() => {
    if (USE_MOCK || state.loadError || state.events.length) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.listEvents();
        if (cancelled) return;
        const events = res.data.map(toEventItem);
        registerEventsFrom(events);
        dispatch({ type: "hydrate", patch: { events } });
      } catch {
        if (!cancelled) dispatch({ type: "setLoadError", value: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch, state.events.length, state.loadError]);
};

/** GET /photos/mine — the student's grids (Home recent row + My Photos).
 *  Replaces `photos` wholesale: a student session only ever holds their own. */
export const useMyPhotosSync = () => {
  const { state, dispatch } = useMockApp();
  const viewerId = currentUserId(state);
  useEffect(() => {
    if (USE_MOCK || state.loadError) return;
    let cancelled = false;
    (async () => {
      try {
        const dtos = await fetchAll((cursor) =>
          api.myPhotos({ limit: PAGE_SIZE, cursor: cursor ?? undefined }),
        );
        if (cancelled) return;
        dispatch({ type: "hydrate", patch: { photos: dtos.map((d) => toMyPhoto(d, viewerId)) } });
      } catch {
        if (!cancelled) dispatch({ type: "setLoadError", value: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch, state.loadError, viewerId]);
};

/** GET /admin/review/queue — the review deck (merged into the photo pool). */
export const useReviewSync = () => {
  const { dispatch } = useMockApp();
  useHydratedSync(async () => {
    const dtos = await fetchAll((cursor) =>
      api.reviewQueue({ limit: PAGE_SIZE, cursor: cursor ?? undefined }),
    );
    registerPeopleFrom(dtos.map((d) => personFromUploader(d.uploader)));
    dispatch({ type: "mergePhotos", photos: dtos.map(toAdminPhoto) });
  }, []);
};

/** GET /admin/photos — the All-photos grid + client-side facet filters. */
export const useBrowseSync = () => {
  const { dispatch } = useMockApp();
  useHydratedSync(async () => {
    const dtos = await fetchAll((cursor) =>
      api.adminPhotos({ limit: PAGE_SIZE, cursor: cursor ?? undefined }),
    );
    registerPeopleFrom(dtos.map((d) => personFromUploader(d.uploader)));
    dispatch({ type: "mergePhotos", photos: dtos.map(toAdminPhotoFromTile) });
  }, []);
};

/** GET /notifications — bell sheet. */
export const useNotificationsSync = () => {
  const { dispatch } = useMockApp();
  useHydratedSync(async () => {
    const dtos = await fetchAll((cursor) =>
      api.notifications({ limit: PAGE_SIZE, cursor: cursor ?? undefined }),
    );
    dispatch({ type: "hydrate", patch: { notifications: dtos.map(toNotification) } });
  }, []);
};

/** GET /admin/users/:id/photos — the uploader grid sheet. */
export const useUploaderPhotosSync = (uploaderId: string | undefined) => {
  const { dispatch } = useMockApp();
  useHydratedSync(async () => {
    if (!uploaderId) return;
    const dtos = await fetchAll((cursor) =>
      api.adminUserPhotos(uploaderId, { limit: PAGE_SIZE, cursor: cursor ?? undefined }),
    );
    registerPeopleFrom(dtos.map((d) => personFromUploader(d.uploader)));
    dispatch({ type: "mergePhotos", photos: dtos.map(toAdminPhotoFromTile) });
  }, [uploaderId]);
};

/** GET /photos/:id — the viewer hydrates the full detail over its tile. */
export const hydrateMyPhotoDetail = async (
  photoId: string,
  viewerId: string,
): Promise<PhotoItem> => toStudentPhoto(await api.getMyPhoto(photoId), viewerId);
