import { Navigate, type RouteObject } from "react-router-dom";

import { DesignShell } from "./components/shell/DesignShell";
import AdminScreens from "./pages/AdminScreens";
import AuthPage from "./pages/AuthPage";
import ComponentLibrary from "./pages/ComponentLibrary";
import DarkModePage from "./pages/DarkModePage";
import FlowsPage from "./pages/FlowsPage";
import NotFound from "./pages/NotFound";
import SharedSheets from "./pages/SharedSheets";
import StatesPage from "./pages/StatesPage";
import StudentScreens from "./pages/StudentScreens";
import StyleGuide from "./pages/StyleGuide";

export const routers: RouteObject[] = [
  {
    path: "/",
    element: <DesignShell />,
    children: [
      { index: true, element: <Navigate to="/style-guide" replace /> },
      { path: "style-guide", element: <StyleGuide /> },
      { path: "components", element: <ComponentLibrary /> },
      { path: "auth", element: <AuthPage /> },
      { path: "student", element: <StudentScreens /> },
      { path: "admin", element: <AdminScreens /> },
      { path: "shared", element: <SharedSheets /> },
      { path: "states", element: <StatesPage /> },
      { path: "dark-mode", element: <DarkModePage /> },
      { path: "flows", element: <FlowsPage /> },
    ],
  },
  /* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */
  {
    path: "*",
    element: <NotFound />,
  },
];

declare global {
  interface Window {
    __routers__: typeof routers;
  }
}

window.__routers__ = routers;
