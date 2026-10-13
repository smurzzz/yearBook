import { useRef } from "react";

/**
 * Keeps the last known params while a sheet animates out, so closing never
 * blanks the content mid-transition.
 */
export const useStickyParams = <T,>(open: boolean, params: T | null): T | null => {
  const ref = useRef<T | null>(null);
  if (open && params) ref.current = params;
  return ref.current;
};
