import { Moon, Sun } from "lucide-react";
import type { ReactNode } from "react";

import { Block, Bullets, Card, Pill, SectionIntro, SpecTable } from "@/components/shell/Docs";
import { ScaledFrame } from "@/components/shell/FrameStage";
import { PHOTOS } from "@/prototype/data";
import { uploadQueue } from "@/prototype/flows";

const student = { signedIn: true, notificationsAsked: true } as const;
const admin = { signedIn: true, role: "admin" as const, notificationsAsked: true };

const DarkStage = ({ children }: { children: ReactNode }) => (
  <div className="rounded-[28px] border border-border bg-foreground/[0.06] p-6">
    <div className="flex flex-wrap gap-7">{children}</div>
  </div>
);

export const DarkModePage = () => (
  <>
    <SectionIntro
      index="08"
      kicker="Deliverable eight"
      title="Dark mode"
      lede="Not an inversion. The dark theme desaturates the neutrals, lifts the indigo so it still passes contrast on a near-black surface, flips the committee plum to a light tint, and keeps photography as the brightest thing on screen."
      meta={
        <>
          <Pill tone="brand">7 required surfaces</Pill>
          <Pill>Token-level switch</Pill>
          <Pill>No pure black</Pill>
          <Pill tone="admin">Committee flips light</Pill>
        </>
      }
    />

    <Block
      eyebrow="The seven"
      title="Every required surface in dark"
      lede="Each frame reads the same components as its light counterpart. Only the tokens differ — no component has a dark-mode branch."
    >
      <DarkStage>
        <ScaledFrame
          scale={0.5}
          forceTheme="dark"
          role="student"
          initial={{ screen: "signin", signedIn: false, consentChecked: true, firstTimeSetupDone: false }}
          caption="1 · Sign In"
        />
        <ScaledFrame
          scale={0.5}
          forceTheme="dark"
          role="student"
          initial={{ ...student, screen: "home" }}
          caption="2 · Home"
        />
        <ScaledFrame
          scale={0.5}
          forceTheme="dark"
          role="student"
          initial={{ ...student, screen: "upload" }}
          caption="3 · Upload"
        />
        <ScaledFrame
          scale={0.5}
          forceTheme="dark"
          role="student"
          initial={{ ...student, screen: "myPhotos" }}
          caption="4 · My Photos"
        />
        <ScaledFrame
          scale={0.5}
          forceTheme="dark"
          role="student"
          initial={{
            ...student,
            screen: "myPhotos",
            overlays: [{ id: "photoViewer", photoId: "p-caps-tossed" }],
          }}
          caption="9 · Photo Viewer"
        />
        <ScaledFrame
          scale={0.5}
          forceTheme="dark"
          role="admin"
          initial={{ ...admin, screen: "review", allPhotosMode: "review" }}
          caption="5 · Admin Review"
        />
        <ScaledFrame
          scale={0.5}
          forceTheme="dark"
          role="admin"
          initial={{ ...admin, screen: "review", overlays: [{ id: "rejectReason", photoId: "p-robotics-build" }] }}
          caption="12 · Reject Reason"
        />
      </DarkStage>
    </Block>

    <Block
      eyebrow="Comparison"
      title="Same composition, different tokens"
      lede="Three side-by-side pairs. Note what does not change: spacing, hierarchy, icon sizes, and the fact that status is still a word plus a symbol."
    >
      <div className="space-y-8">
        <div>
          <div className="mb-3 flex items-center gap-4">
            <span className="flex items-center gap-2 text-label font-bold text-foreground">
              <Sun className="size-4 text-primary" aria-hidden="true" />
              Light
            </span>
            <span className="flex items-center gap-2 text-label font-bold text-foreground">
              <Moon className="size-4 text-primary" aria-hidden="true" />
              Dark
            </span>
          </div>
          <div className="flex flex-wrap gap-7">
            <ScaledFrame
              scale={0.5}
              forceTheme="light"
              role="student"
              initial={{ screen: "signin", signedIn: false, consentChecked: true, firstTimeSetupDone: false }}
              caption="Sign In"
            />
            <ScaledFrame
              scale={0.5}
              forceTheme="dark"
              role="student"
              initial={{ screen: "signin", signedIn: false, consentChecked: true, firstTimeSetupDone: false }}
              caption="Sign In"
            />
            <ScaledFrame scale={0.5} forceTheme="light" role="student" initial={{ ...student, screen: "home" }} caption="Home" />
            <ScaledFrame scale={0.5} forceTheme="dark" role="student" initial={{ ...student, screen: "home" }} caption="Home" />
          </div>
        </div>

        <div>
          <div className="flex flex-wrap gap-7">
            <ScaledFrame
              scale={0.5}
              forceTheme="light"
              role="admin"
              initial={{ ...admin, screen: "review", allPhotosMode: "review" }}
              caption="Admin Review — light"
            />
            <ScaledFrame
              scale={0.5}
              forceTheme="dark"
              role="admin"
              initial={{ ...admin, screen: "review", allPhotosMode: "review" }}
              caption="Admin Review — dark"
            />
            <ScaledFrame
              scale={0.5}
              forceTheme="light"
              role="admin"
              initial={{ ...admin, screen: "review", allPhotosMode: "all" }}
              caption="All photos — light"
            />
            <ScaledFrame
              scale={0.5}
              forceTheme="dark"
              role="admin"
              initial={{ ...admin, screen: "review", allPhotosMode: "all" }}
              caption="All photos — dark"
            />
          </div>
        </div>

        <div>
          <div className="flex flex-wrap gap-7">
            <ScaledFrame
              scale={0.5}
              forceTheme="light"
              role="student"
              initial={{ ...student, screen: "upload", overlays: [{ id: "photoViewer", photoId: "p-foundation-parade" }] }}
              caption="Photo Viewer — light"
            />
            <ScaledFrame
              scale={0.5}
              forceTheme="dark"
              role="student"
              initial={{ ...student, screen: "upload", overlays: [{ id: "photoViewer", photoId: "p-foundation-parade" }] }}
              caption="Photo Viewer — dark"
            />
            <ScaledFrame
              scale={0.5}
              forceTheme="light"
              role="student"
              initial={{
                ...student,
                screen: "upload",
                uploadPhase: "running",
                upload: {
                  eventId: "intramurals-2026",
                  category: "Sports",
                  club: "Robotics Club",
                  consent: true,
                  items: uploadQueue(["done", "failed", "uploading", "waiting"], ["", "Bench reaction after the buzzer beater."]),
                },
                overlays: [{ id: "uploadProgress" }],
              }}
              animate={false}
              caption="Upload Progress — light"
            />
            <ScaledFrame
              scale={0.5}
              forceTheme="dark"
              role="student"
              initial={{
                ...student,
                screen: "upload",
                uploadPhase: "running",
                upload: {
                  eventId: "intramurals-2026",
                  category: "Sports",
                  club: "Robotics Club",
                  consent: true,
                  items: uploadQueue(["done", "failed", "uploading", "waiting"], ["", "Bench reaction after the buzzer beater."]),
                },
                overlays: [{ id: "uploadProgress" }],
              }}
              animate={false}
              caption="Upload Progress — dark"
            />
          </div>
        </div>
      </div>
    </Block>

    <Block
      eyebrow="Rules"
      title="What changes, and what must not"
      lede="Dark mode is a token swap, not a redesign. These rules keep it that way as the app grows."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Surfaces" note="Never pure black, never flat grey.">
          <div className="space-y-2">
            {[
              ["background", "hsl(250 16% 7%)"],
              ["card", "hsl(250 14% 10%)"],
              ["popover", "hsl(250 14% 9%)"],
              ["muted", "hsl(250 12% 16%)"],
              ["border", "hsl(250 12% 20%)"],
            ].map(([token, value]) => (
              <div key={token} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2">
                <span className="font-mono text-caption text-foreground">{token}</span>
                <span className="font-mono text-caption text-muted-foreground">{value}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Accent and status" note="Lifted, not swapped for a different hue.">
          <Bullets
            tone="compact"
            items={[
              "primary moves from 57% to 70% lightness so it passes on dark.",
              "Every status hue keeps its family and gains lightness.",
              "Soft status fills become 14–17% lightness surfaces with light foreground text.",
              "The on-photo layer is identical in both themes — it sits on photography, not on the UI.",
            ]}
          />
        </Card>
        <Card title="Photography" note="The photo must stay the brightest element.">
          <Bullets
            tone="compact"
            items={[
              "No filters, no dimming, no dark overlays on the image itself.",
              "Grid gaps become a single hairline so the mosaic still reads as one surface.",
              "Viewer chrome sits on the scrim, never on a bare photo.",
              "Committee plum flips to a light tint so the role difference survives the theme change.",
            ]}
          />
        </Card>
      </div>

      <div className="mt-6">
        <SpecTable
          head={["Surface", "Light", "Dark", "Kept identical"]}
          rows={[
            ["Sign In", "Paper white, photo collage", "Near-black, same collage", "Layout, collage geometry, disabled state"],
            ["Home", "White cards on paper", "Card 10% on 7% base", "Countdown wording, no status anywhere"],
            ["Upload", "White surfaces, indigo CTA", "Same order, lifted indigo", "Guard copy, sticky footer, 48px inputs"],
            ["My Photos", "3-column square grid", "Same grid, hairline gaps", "Two stats only, event chips"],
            ["Photo Viewer", "Black scrim, paper info card", "Identical scrim treatment", "Zoom affordance, overflow menu"],
            ["Admin Review", "Plum bar, white text", "Light plum bar, dark ink", "Icon + label status, deck mechanics"],
            ["Reject Reason", "Paper sheet", "Elevated dark sheet", "Preset chips, required-note rule"],
          ]}
        />
      </div>

      <div className="mt-6">
        <Card
          title="Status stays readable in the dark"
          note="The samples below are the exact dark tokens; the label is always present, so nothing depends on the tint."
        >
          <div className="dark rounded-2xl bg-background p-5">
            <div className="flex flex-wrap gap-2">
              {["pending", "approved", "rejected", "reported"].map((tone) => (
                <span
                  key={tone}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-caption font-semibold ${
                    tone === "pending"
                      ? "bg-status-pending-soft text-status-pending-foreground"
                      : tone === "approved"
                        ? "bg-status-approved-soft text-status-approved-foreground"
                        : tone === "rejected"
                          ? "bg-status-rejected-soft text-status-rejected-foreground"
                          : "bg-status-reported-soft text-status-reported-foreground"
                  }`}
                >
                  {tone[0].toUpperCase() + tone.slice(1)}
                </span>
              ))}
            </div>
            <div className="mt-4 flex gap-1.5">
              {PHOTOS.slice(0, 4).map((photo) => (
                <img
                  key={photo.id}
                  src={photo.src}
                  alt=""
                  crossOrigin="anonymous"
                  className="size-16 rounded-tile object-cover"
                />
              ))}
            </div>
          </div>
        </Card>
      </div>
    </Block>
  </>
);

export default DarkModePage;
