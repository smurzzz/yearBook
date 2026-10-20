/* Upload runner — the React glue around the real pipeline (T-044).

   The demo build keeps its simulation (`startUpload` + the tick loop in the
   prototype store). This hook is the real build's path: it runs
   api/upload.ts, mirrors every photo's progress into the store so the
   Upload Progress sheet shows the truth, and refreshes "My photos" when the
   batch lands.

   Failure is per photo, not per batch: a photo that could not be uploaded
   keeps its row and can be retried (the client_id is reused, so the server
   recognises the retry as the same photo). */

import { useCallback, useState } from "react";
import { useMockApp } from "../prototype/store";
import { currentUserId } from "../prototype/selectors";
import type { UploadItem } from "../prototype/types";
import { USE_MOCK } from "./index";
import { isApiError } from "./errors";
import { ensureLookups, lookupId } from "./lookups";
import { refreshMyPhotos } from "./sync";
import { uploadBatch, type UploadCandidate } from "./upload";
import { randomUuid } from "../lib/uuid";

/** What the failed row says under its bar. */
const FAILURE_NOTES: Record<string, string> = {
  UPLOAD_FAILED: "Interrupted",
  UPLOAD_NOT_FOUND: "Didn't finish",
  NOT_FOUND: "Missing",
};

const isOfflineError = (error: unknown): boolean =>
  isApiError(error) && (error.code === "NETWORK_ERROR" || error.status === 0);

const toCandidate = (item: UploadItem): UploadCandidate | null => {
  if (!item.files) return null;
  return {
    id: item.id,
    clientId: item.clientId ?? randomUuid(),
    caption: item.caption,
    original: item.files.original,
    thumb: item.files.thumb,
  };
};

export const useUploadRunner = () => {
  const { state, dispatch } = useMockApp();
  const [running, setRunning] = useState(false);

  const run = useCallback(
    async (items: UploadItem[]) => {
      const candidates = items
        .map(toCandidate)
        .filter((candidate): candidate is UploadCandidate => candidate !== null);
      if (!candidates.length) return;

      const eventId = state.upload.eventId;
      const categoryName = state.upload.category;
      if (!eventId || !categoryName) {
        dispatch({ type: "setBatchMessage", message: "Choose an event and a category first." });
        return;
      }
      if (!state.upload.consent) {
        dispatch({
          type: "setBatchMessage",
          message: "Confirm that you have permission to share these photos.",
        });
        return;
      }

      try {
        await ensureLookups();
        const categoryId = lookupId("categories", categoryName);
        if (!categoryId) {
          dispatch({ type: "setBatchMessage", message: "That category is not available. Pick another one." });
          return;
        }
        const clubId = lookupId("clubs", state.upload.club);

        const outcomes = await uploadBatch({
          items: candidates,
          eventId,
          categoryId,
          clubId,
          consent: true,
          onStage: (id, status, progress, note) =>
            dispatch({ type: "setUploadItemProgress", id, status, progress, failNote: note }),
        });

        for (const outcome of outcomes) {
          dispatch({
            type: "setUploadItemProgress",
            id: outcome.id,
            status: outcome.ok ? "done" : "failed",
            progress: outcome.ok ? 100 : 60,
            failNote: outcome.ok ? undefined : FAILURE_NOTES[outcome.code ?? ""] ?? "Failed",
          });
        }

        const failed = outcomes.filter((outcome) => !outcome.ok);
        dispatch({ type: "setUploadPhase", phase: failed.length ? "running" : "success" });
        if (!failed.length) {
          await refreshMyPhotos(dispatch, currentUserId(state)).catch(() => undefined);
        }
      } catch (error) {
        /* The batch never started (closed event, limit reached, no network…).
           Every row shows the reason and stays retryable. */
        const note = isApiError(error) ? error.message : "Upload failed. Please try again.";
        if (isOfflineError(error)) {
          /* The offline banner lives in the progress sheet — keep it open. */
          dispatch({ type: "setUploadError", error: "offline" });
        } else {
          dispatch({ type: "setBatchMessage", message: note });
        }
        for (const item of items) {
          dispatch({
            type: "setUploadItemProgress",
            id: item.id,
            status: "failed",
            progress: 0,
            failNote: note,
          });
        }
      } finally {
        setRunning(false);
      }
    },
    [dispatch, state],
  );

  /** Submit the whole draft. */
  const submit = useCallback(async () => {
    if (USE_MOCK) {
      dispatch({ type: "startUpload" });
      return;
    }
    const items = state.upload.items;
    dispatch({ type: "startUpload" });
    setRunning(true);
    await run(items);
  }, [dispatch, run, state.upload.items]);

  /** Retry the failed rows (the whole batch when nothing specific failed). */
  const retry = useCallback(async () => {
    if (USE_MOCK) {
      dispatch({ type: "retryFailed" });
      return;
    }
    const failed = state.upload.items.filter((item) => item.status === "failed");
    const items = failed.length ? failed : state.upload.items;
    dispatch({ type: "retryFailed" });
    setRunning(true);
    await run(items);
  }, [dispatch, run, state.upload.items]);

  return { submit, retry, running };
};
