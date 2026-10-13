import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import { createInitialState, reducer, type Action } from "./reducer";
import type {
  DialogId,
  OverlayId,
  OverlayStackItem,
  PrototypeState,
  Role,
  Screen,
  ToastState,
} from "./types";

interface PrototypeContextValue {
  state: PrototypeState;
  dispatch: Dispatch<Action>;
}

const PrototypeContext = createContext<PrototypeContextValue | null>(null);

export interface PrototypeProviderProps {
  children: ReactNode;
  /** Frame-specific starting point: sign-in, a role, a deep-linked flow step… */
  initial?: Partial<PrototypeState>;
  /** Drives the simulated upload progress loop. Off for static galleries. */
  animate?: boolean;
  /** Replayed once on mount — how flows.ts scripts a frame deterministically. */
  script?: Action[];
}

export const PrototypeProvider = ({
  children,
  initial,
  animate = true,
  script,
}: PrototypeProviderProps) => {
  const [state, dispatch] = useReducer(reducer, initial, (seed) =>
    createInitialState(seed ?? {}),
  );

  useEffect(() => {
    if (!animate || state.uploadPhase !== "running") return;
    const id = window.setInterval(() => dispatch({ type: "uploadTick" }), 220);
    return () => window.clearInterval(id);
  }, [animate, state.uploadPhase]);

  useEffect(() => {
    if (!script?.length) return;
    script.forEach((action) => dispatch(action));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <PrototypeContext.Provider value={{ state, dispatch }}>
      {children}
    </PrototypeContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const usePrototype = () => {
  const ctx = useContext(PrototypeContext);
  if (!ctx) throw new Error("usePrototype must be used inside a PrototypeProvider");
  return ctx;
};

/** Convenience hook: the frame state plus pre-bound dispatchers. */
// eslint-disable-next-line react-refresh/only-export-components
export const useMockApp = () => {
  const { state, dispatch } = usePrototype();
  return {
    state,
    dispatch,
    goto: (screen: Screen) => dispatch({ type: "goto", screen }),
    setRole: (role: Role) => dispatch({ type: "setRole", role }),
    open: (id: OverlayId, params: Omit<OverlayStackItem, "id"> = {}) =>
      dispatch({ type: "openOverlay", overlay: { id, ...params } }),
    close: () => dispatch({ type: "closeOverlay" }),
    closeAll: () => dispatch({ type: "closeOverlays" }),
    ask: (dialog: DialogId, params: { photoId?: string; eventId?: string } = {}) =>
      dispatch({ type: "openDialog", dialog, ...params }),
    closeDialog: () => dispatch({ type: "closeDialog" }),
    say: (toast: Omit<ToastState, "key">) => dispatch({ type: "toast", toast }),
  };
};
