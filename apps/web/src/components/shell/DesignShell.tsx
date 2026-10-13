import { ArrowLeft, ArrowRight, Menu, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { Logo } from "@/components/brand/Logo";
import { PhoneButton } from "@/components/app/PhoneButton";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// eslint-disable-next-line react-refresh/only-export-components
export const SECTIONS = [
  { to: "/style-guide", index: "01", label: "Style guide", blurb: "Palette, type, motion, rules" },
  { to: "/components", index: "02", label: "Component library", blurb: "Atoms, molecules, patterns" },
  { to: "/auth", index: "03", label: "Auth", blurb: "Sign in, consent, first run" },
  { to: "/student", index: "04", label: "Student screens", blurb: "Home, Upload, My Photos" },
  { to: "/admin", index: "05", label: "Admin screens", blurb: "Review, All photos, Events" },
  { to: "/shared", index: "06", label: "Sheets, dialogs, toasts", blurb: "Shared surfaces" },
  { to: "/states", index: "07", label: "States", blurb: "Loading, empty, network, auth" },
  { to: "/dark-mode", index: "08", label: "Dark mode", blurb: "Seven surfaces inverted" },
  { to: "/flows", index: "09", label: "Prototype flows", blurb: "Seven clickable journeys" },
];

const NavList = ({ onNavigate }: { onNavigate?: () => void }) => (
  <nav className="mt-7 space-y-1" aria-label="Deliverables">
    {SECTIONS.map((section) => (
      <NavLink
        key={section.to}
        to={section.to}
        onClick={onNavigate}
        className={({ isActive }) =>
          cn(
            "group flex items-start gap-3 rounded-2xl px-3 py-2.5 transition-colors duration-200",
            isActive ? "bg-sidebar-accent" : "hover:bg-muted/70",
          )
        }
      >
        {({ isActive }) => (
          <>
            <span
              className={cn(
                "tabular mt-[2px] font-mono text-caption font-bold",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              {section.index}
            </span>
            <span className="min-w-0">
              <span
                className={cn(
                  "block text-label font-bold",
                  isActive ? "text-sidebar-accent-foreground" : "text-foreground",
                )}
              >
                {section.label}
              </span>
              <span className="mt-0.5 block text-caption leading-[16px] text-muted-foreground">
                {section.blurb}
              </span>
            </span>
          </>
        )}
      </NavLink>
    ))}
  </nav>
);

export const DesignShell = () => {
  const { pathname } = useLocation();
  const [dark, setDark] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    setNavOpen(false);
    window.scrollTo({ top: 0 });
  }, [pathname]);

  const activeIndex = SECTIONS.findIndex((section) => section.to === pathname);
  const prev = activeIndex > 0 ? SECTIONS[activeIndex - 1] : null;
  const next = activeIndex >= 0 && activeIndex < SECTIONS.length - 1 ? SECTIONS[activeIndex + 1] : null;

  const ThemeToggle = (
    <button
      type="button"
      onClick={() => setDark((v) => !v)}
      aria-pressed={dark}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-3.5 py-2.5 text-left shadow-tile transition-colors hover:bg-muted/60"
    >
      {dark ? <Moon className="size-4 text-primary" aria-hidden="true" /> : <Sun className="size-4 text-primary" aria-hidden="true" />}
      <span className="flex-1 text-label font-semibold text-foreground">
        {dark ? "Dark canvas" : "Light canvas"}
      </span>
      <span className="text-caption text-muted-foreground">Docs only</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-[1560px] gap-12 px-5 lg:px-10">
        <aside className="sticky top-0 hidden h-screen w-[272px] shrink-0 flex-col overflow-y-auto border-r border-border py-9 lg:flex">
          <Logo size={36} tagline="Mobile design system" />
          <NavList />
          <div className="mt-auto space-y-3 pt-6">{ThemeToggle}</div>
        </aside>

        <main className="min-w-0 flex-1 py-6 lg:py-9">
          <div className="mb-6 flex items-center justify-between gap-4 lg:hidden">
            <Logo size={30} />
            <PhoneButton
              variant="outline"
              size="iconSm"
              aria-label="Open sections"
              onClick={() => setNavOpen(true)}
            >
              <Menu />
            </PhoneButton>
          </div>

          <div className="space-y-16 pb-20">
            <Outlet />
          </div>

          {prev || next ? (
            <nav className="flex flex-wrap items-stretch justify-between gap-4 border-t border-border pb-10 pt-8">
              {prev ? (
                <NavLink
                  to={prev.to}
                  className="flex min-w-[210px] flex-1 items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-tile transition-colors hover:bg-muted/60"
                >
                  <ArrowLeft className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span>
                    <span className="block text-caption text-muted-foreground">Previous</span>
                    <span className="mt-0.5 block text-label font-bold text-foreground">{prev.label}</span>
                  </span>
                </NavLink>
              ) : (
                <span className="flex-1" />
              )}
              {next ? (
                <NavLink
                  to={next.to}
                  className="flex min-w-[210px] flex-1 items-center justify-end gap-3 rounded-2xl border border-border bg-card p-4 text-right shadow-tile transition-colors hover:bg-muted/60"
                >
                  <span>
                    <span className="block text-caption text-muted-foreground">Next</span>
                    <span className="mt-0.5 block text-label font-bold text-foreground">{next.label}</span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </NavLink>
              ) : null}
            </nav>
          ) : null}
        </main>
      </div>

      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" className="w-[290px] overflow-y-auto p-5">
          <SheetTitle className="sr-only">Deliverables</SheetTitle>
          <Logo size={32} tagline="Mobile design system" />
          <NavList onNavigate={() => setNavOpen(false)} />
          <div className="mt-6">{ThemeToggle}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
