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

import { useEffect, useState } from "react";
import { api, USE_MOCK } from "./index";
import { ensureLookups, lookupNames } from "./lookups";
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
import type { Action } from "../prototype/reducer";
import type { PhotoItem } from "../prototype/types";

export const PAGE_SIZE = 60;
const MAX_PAGES = 50;

/** The list endpoints only exist for a bootstrapped account: a signed-out
 *  visitor has no session (every request would answer 401), and a brand-new
 *  student has no user row yet (GET /photos/mine answers 404 USER_NOT_FOUND
 *  until the first-time setup sheet creates it). */
const canSync = (signedIn: boolean, bootstrapped: boolean) => signedIn && bootstrapped;

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
    if (!canSync(state.signedIn, state.firstTimeSetupDone)) return; // no session yet, or the account is not bootstrapped
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
  }, [state.firstTimeSetupDone, state.loadError, state.signedIn, ...deps]);
};

/** Events catalog (Home, Upload, My Photos chips, Review, Events screen). */
export const useEventsSync = () => {
  const { state, dispatch } = useMockApp();
  useEffect(() => {
    if (USE_MOCK || state.loadError || state.events.length) return;
    if (!canSync(state.signedIn, state.firstTimeSetupDone)) return;
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
  }, [dispatch, state.events.length, state.firstTimeSetupDone, state.loadError, state.signedIn]);
};

/** GET /photos/mine — the student's grids (Home recent row + My Photos).
 *  Replaces `photos` wholesale: a student session only ever holds their own. */
export const refreshMyPhotos = async (
  dispatch: (action: Action) => void,
  viewerId: string,
): Promise<void> => {
  const dtos = await fetchAll((cursor) =>
    api.myPhotos({ limit: PAGE_SIZE, cursor: cursor ?? undefined }),
  );
  dispatch({ type: "hydrate", patch: { photos: dtos.map((d) => toMyPhoto(d, viewerId)) } });
};

export const useMyPhotosSync = () => {
  const { state, dispatch } = useMockApp();
  const viewerId = currentUserId(state);
  useEffect(() => {
    if (USE_MOCK || state.loadError) return;
    if (!canSync(state.signedIn, state.firstTimeSetupDone)) return;
    let cancelled = false;
    (async () => {
      try {
        await refreshMyPhotos(dispatch, viewerId);
      } catch {
        if (!cancelled) dispatch({ type: "setLoadError", value: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch, state.firstTimeSetupDone, state.loadError, state.signedIn, viewerId]);
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

/** GET /notifications — bell sheet. `enabled` is the sheet's open state: the
 *  list is only worth fetching when the student actually opens the bell. */
export const useNotificationsSync = (enabled = true) => {
  const { dispatch } = useMockApp();
  useHydratedSync(async () => {
    if (!enabled) return;
    const dtos = await fetchAll((cursor) =>
      api.notifications({ limit: PAGE_SIZE, cursor: cursor ?? undefined }),
    );
    dispatch({ type: "hydrate", patch: { notifications: dtos.map(toNotification) } });
  }, [enabled]);
};

/** GET /lookups — the category and club lists (names for the chips, ids for
 *  the upload). Cached; the demo build keeps its bundled lists. */
export const useLookupsSync = () => {
  const [names, setNames] = useState({ categories: [] as string[], clubs: [] as string[] });
  useEffect(() => {
    if (USE_MOCK) return;
    let cancelled = false;
    ensureLookups()
      .then(() => {
        if (cancelled) return;
        setNames({ categories: lookupNames("categories"), clubs: lookupNames("clubs") });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  return names;
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
