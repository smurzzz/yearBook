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
  /** Drives the simulated upload progress loop. */
  animate?: boolean;
}

export const PrototypeProvider = ({
  children,
  initial,
  animate = true,
}: PrototypeProviderProps) => {
  const [state, dispatch] = useReducer(reducer, initial, (seed) =>
    createInitialState(seed ?? {}),
  );

  useEffect(() => {
    if (!animate || state.uploadPhase !== "running") return;
    // Slow-network simulation (P2A dev menu): the same ticks, ~5× slower.
    const id = setInterval(() => dispatch({ type: "uploadTick" }), state.slowNetwork ? 1_100 : 220);
    return () => clearInterval(id);
  }, [animate, state.uploadPhase, state.slowNetwork]);

  return (
    <PrototypeContext.Provider value={{ state, dispatch }}>
      {children}
    </PrototypeContext.Provider>
  );
};

export const usePrototype = () => {
  const ctx = useContext(PrototypeContext);
  if (!ctx) throw new Error("usePrototype must be used inside a PrototypeProvider");
  return ctx;
};

/** Convenience hook: the frame state plus pre-bound dispatchers. */
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
