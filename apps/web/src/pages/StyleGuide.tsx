import {
  Bell,
  CalendarDays,
  Camera,
  Check,
  ClipboardCheck,
  Clock3,
  Flag,
  Images,
  Info,
  Layers,
  Plus,
  Settings,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";

import { Logo, LogoMark } from "@/components/brand/Logo";
import { Chip } from "@/components/app/Chip";
import { Avatar } from "@/components/app/Avatar";
import { PhoneButton } from "@/components/app/PhoneButton";
import { StatusChip, CountdownChip, RoleBadge, StackBadge } from "@/components/app/Indicators";
import { Surface } from "@/components/app/Surface";
import { Block, Bullets, Card, DoDont, Pill, SectionIntro, SpecTable } from "@/components/shell/Docs";import {
  ContrastRow,
  ElevationRow,
  MotionRow,
  RadiusRow,
  SpacingScale,
  SwatchGrid,
  TokenSwatch,
  TypeRow,
} from "@/components/shell/Tokens";
import { EVENTS } from "@/prototype/data";

const LIGHT_SWATCHES = [
  { name: "--background", value: "40 33% 99%", role: "Warm paper base. Photos sit directly on it." },
  { name: "--foreground", value: "240 18% 11%", role: "Ink for all body copy and headings." },
  { name: "--card", value: "0 0% 100%", role: "Cards, sheets, list surfaces." },
  { name: "--muted", value: "240 20% 96%", role: "Recessed surfaces, meta chips, skeletons." },
  { name: "--muted-foreground", value: "240 9% 43%", role: "Secondary text and labels." },
  { name: "--primary", value: "244 72% 57%", role: "Student brand. CTAs, active tab, links." },
  { name: "--primary-glow", value: "252 90% 68%", role: "Gradient partner for glow shadows." },
  { name: "--border", value: "240 16% 90%", role: "Hairlines and card outlines." },
  { name: "--admin", value: "268 52% 38%", role: "Committee plum. Admin surfaces only." },
  { name: "--admin-surface", value: "270 40% 97%", role: "Committee tint block behind filters." },
  { name: "--admin-ink", value: "268 35% 18%", role: "Text on admin tint blocks." },
  { name: "--onimage", value: "0 0% 100%", role: "Content over photography, both themes." },
];

const STATUS_SWATCHES = [
  { name: "--pending", value: "32 95% 40%", role: "Awaiting review (clock)." },
  { name: "--approved", value: "158 72% 30%", role: "Selected for the yearbook (check)." },
  { name: "--rejected", value: "350 78% 47%", role: "Sent back with a reason (x)." },
  { name: "--reported", value: "208 88% 42%", role: "Open removal request (flag)." },
  { name: "--pending-soft", value: "38 100% 94%", role: "Chip fill behind pending." },
  { name: "--approved-soft", value: "155 60% 93%", role: "Chip fill behind approved." },
  { name: "--rejected-soft", value: "352 90% 96%", role: "Chip fill behind rejected." },
  { name: "--reported-soft", value: "208 90% 95%", role: "Chip fill behind reported." },
];

const DARK_SWATCHES = [
  { name: "--background", value: "250 16% 7%", role: "Near-black with a violet cast." },
  { name: "--card", value: "250 14% 10%", role: "Elevated one step, never pure grey." },
  { name: "--popover", value: "250 14% 9%", role: "Menus and sheets above cards." },
  { name: "--foreground", value: "240 24% 96%", role: "Soft white, 13.8:1 on background." },
  { name: "--primary", value: "250 88% 70%", role: "Lifted so it passes on dark." },
  { name: "--admin", value: "270 62% 72%", role: "Committee surface flips to light plum." },
  { name: "--status-pending", value: "36 100% 66%", role: "Amber lifted for contrast." },
  { name: "--status-approved", value: "158 62% 52%", role: "Emerald lifted for contrast." },
];

const SPACING = [4, 8, 12, 16, 20, 24, 32, 40];

const RADII = [
  { token: "radius-tile", px: 10, use: "Photo grid tiles" },
  { token: "radius-lg / 20px", px: 20, use: "Cards, sheet blocks" },
  { token: "radius-sheet", px: 28, use: "Bottom sheet top corners" },
  { token: "radius-full", px: 999, use: "Buttons, chips, avatars" },
  { token: "--radius", px: 20, use: "Design-system base radius" },
  { token: "radius-[10px]", px: 10, use: "Small thumbs, counters" },
];

const MOTION = [
  { name: "sheet-up", duration: "320ms", easing: "cubic-bezier(.2,.8,.2,1)", use: "Bottom sheet enter" },
  { name: "sheet-down", duration: "240ms", easing: "cubic-bezier(.4,0,1,1)", use: "Sheet dismiss (faster out)" },
  { name: "toast-in", duration: "260ms", easing: "cubic-bezier(.2,.8,.2,1)", use: "Undo / success toast" },
  { name: "scale-in", duration: "220ms", easing: "cubic-bezier(.2,.8,.2,1)", use: "Dialogs, dropdowns" },
  { name: "rise-in", duration: "300ms", easing: "cubic-bezier(.2,.8,.2,1)", use: "Inline editors, accordions" },
  { name: "pulse-soft", duration: "2000ms", easing: "ease-in-out, infinite", use: "Urgent deadline dot" },
  { name: "check-pop", duration: "420ms", easing: "cubic-bezier(.2,.8,.2,1)", use: "Upload success checkmark" },
  { name: "press", duration: "150ms", easing: "ease-smooth", use: "active:scale(0.97) on every control" },
];

const ICONS = [
  { icon: Bell, use: "Notifications" },
  { icon: CalendarDays, use: "Events, deadlines" },
  { icon: Camera, use: "Camera source" },
  { icon: Check, use: "Approve, done" },
  { icon: ClipboardCheck, use: "Review queue" },
  { icon: Clock3, use: "Pending" },
  { icon: Flag, use: "Reported, removal" },
  { icon: Images, use: "Gallery, My Photos" },
  { icon: Info, use: "Privacy notes" },
  { icon: Layers, use: "Multi-photo batch" },
  { icon: Plus, use: "Upload action" },
  { icon: Settings, use: "Profile" },
  { icon: ShieldCheck, use: "Consent, committee" },
  { icon: Upload, use: "Uploading" },
  { icon: X, use: "Reject, remove" },
];

export const StyleGuide = () => (
  <>
    <SectionIntro
      index="01"
      kicker="Deliverable one"
      title="Style guide"
      lede="A photo-first system: warm paper neutrals so photography carries the screen, one vivid indigo for action, and a plum committee language that makes the admin app feel like a different tool. Every colour is a semantic token — components never reference raw values."
      meta={
        <>
          <Pill tone="brand">Light + dark</Pill>
          <Pill>Plus Jakarta Sans</Pill>
          <Pill>4-point spacing</Pill>
          <Pill tone="admin">Two role languages</Pill>
        </>
      }
    />

    <Block
      id="brand"
      eyebrow="Identity"
      title="The brand mark"
      lede="An aperture iris inside a yearbook page with a folded corner: photography plus the printed book. One mark, three treatments."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Card title="Primary lockup" note="Sign In, docs header. Mark in brand indigo.">
          <Logo size={40} tagline="Every moment, one yearbook." />
        </Card>
        <Card title="Committee lockup" note="Admin app bar. Plum on plum-with-contrast.">
          <div className="rounded-2xl bg-admin p-4 text-admin-foreground">
            <Logo size={34} tone="admin" tagline="Review workspace" />
          </div>
        </Card>
        <Card title="On photo / mono" note="Over imagery, plus the standalone mark used at 20–48px.">
          <div className="flex items-center gap-4 rounded-2xl bg-canvas p-4">
            <LogoMark size={38} className="text-onimage" />
            <Logo size={26} tone="onImage" className="text-onimage" />
          </div>
        </Card>
      </div>
      <div className="mt-4">
        <Bullets
          items={[
            "The mark never sits on a busy photo without the .photo-scrim gradient behind it.",
            "Minimum size 20px. Below that, use the mark alone without the wordmark.",
            "The wordmark splits colour: “Yearbook” in ink, “Hub” in the accent of the current role.",
          ]}
        />
      </div>
    </Block>

    <Block
      eyebrow="Colour, light"
      title="Light palette"
      lede="Warm paper whites keep the interface from fighting the photographs. Accent colour is reserved for action and identity — never for decoration."
    >
      <SwatchGrid>
        {LIGHT_SWATCHES.map((swatch) => (
          <TokenSwatch key={swatch.name} {...swatch} />
        ))}
      </SwatchGrid>
    </Block>

    <Block
      eyebrow="Colour, dark"
      title="Dark palette"
      lede="Not an inversion: the dark theme desaturates the neutrals, lifts the accent to keep AA contrast, and flips the committee surface to light plum so the admin area stays instantly recognisable."
    >
      <SwatchGrid>
        {DARK_SWATCHES.map((swatch) => (
          <TokenSwatch key={swatch.name} {...swatch} />
        ))}
      </SwatchGrid>
      <div className="mt-4">
        <SpecTable
          head={["Rule", "Light", "Dark"]}
          rows={[
            ["Elevation order", "card is white on paper", "card is one step lighter than background"],
            ["Accent on surface", "--primary on 99% paper", "--primary lifted to 70% lightness"],
            ["Committee surface", "--admin plum, white text", "--admin light plum, dark ink"],
            ["Shadows", "soft indigo tint at 6–18% alpha", "deep violet-black at 40–85% alpha"],
          ]}
        />
      </div>
    </Block>

    <Block
      eyebrow="Status"
      title="Status is never colour alone"
      lede="Every state carries an icon and a text label, so it survives greyscale, colour-blindness and print. Status only ever appears on committee surfaces — no student screen renders it."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="The four states" note="Soft chips inside lists and grids; solid chips only over photography.">
          <div className="flex flex-wrap gap-2">
            <StatusChip tone="pending" size="md" />
            <StatusChip tone="approved" size="md" />
            <StatusChip tone="rejected" size="md" />
            <StatusChip tone="reported" size="md" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusChip tone="pending" size="md" emphasis="solid" />
            <StatusChip tone="approved" size="md" emphasis="solid" />
            <StatusChip tone="rejected" size="md" emphasis="solid" />
            <StatusChip tone="reported" size="md" emphasis="solid" />
          </div>
        </Card>
        <Card title="Deadlines, batches, roles" note="Countdown urgency is a label change, not only a hue change.">
          <div className="flex flex-wrap items-center gap-2">
            <CountdownChip deadline={EVENTS[0].deadline} />
            <CountdownChip deadline={EVENTS[1].deadline} />
            <CountdownChip deadline={EVENTS[3].deadline} />
            <StackBadge count={3} className="bg-canvas" />
            <RoleBadge role="student" />
            <RoleBadge role="admin" />
          </div>
          <p className="mt-3 text-caption leading-[17px] text-muted-foreground">
            Under three days the chip switches to amber and gains a pulsing dot; past the deadline it
            reads “Closed”. The wording changes too, so the meaning never depends on the colour.
          </p>
        </Card>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        {STATUS_SWATCHES.slice(0, 4).map((swatch) => (
          <TokenSwatch key={swatch.name} {...swatch} />
        ))}
      </div>
      <div className="mt-6">
        <DoDont
          dos={[
            "icon + label + tint, together, every time",
            "keep status out of every student surface",
            "use the solid chip only on top of a scrim",
          ]}
          donts={[
            "a bare coloured dot as the only signal",
            "status badges or counts on My Photos",
            "reusing the destructive red for a normal action",
          ]}
        />
      </div>
    </Block>

    <Block
      eyebrow="Type"
      title="Typography"
      lede="One family, Plus Jakarta Sans, in eight steps. Display sizes tighten the tracking; every size is a token, so no component invents its own scale. Numbers that can change (counts, percentages, timers) use tabular figures."
    >
      <div>
        <TypeRow token="text-display" spec="34 / 40 · -0.02em · 800" sample="Every moment, one yearbook." className="text-display font-extrabold" usage="Sign In headline, empty-state heroes" />
        <TypeRow token="text-title" spec="26 / 32 · -0.015em · 800" sample="Upcoming deadlines" className="text-title font-extrabold" usage="Screen titles" />
        <TypeRow token="text-heading" spec="20 / 26 · -0.01em · 700" sample="Foundation Day" className="text-heading font-bold" usage="Section headers, sheet titles" />
        <TypeRow token="text-subhead" spec="17 / 24 · 700" sample="All caught up!" className="text-subhead font-bold" usage="Card names, list titles" />
        <TypeRow token="text-body" spec="15 / 22 · 400–600" sample="Fourth quarter, one-point game — the whole bench was on its feet." className="text-body" usage="Captions, body copy, inputs" />
        <TypeRow token="text-label" spec="13 / 18 · 600" sample="Only you and the yearbook committee can see your photos." className="text-label" usage="Meta, helper text, buttons at md" />
        <TypeRow token="text-caption" spec="12 / 16 · 500–600" sample="2 days left · Sports · Robotics Club" className="text-caption" usage="Chips, counters, timestamps" />
        <TypeRow token="text-eyebrow" spec="11 / 14 · 0.14em · 700" sample="YEARBOOK COMMITTEE" className="text-eyebrow font-bold uppercase" usage="Labels above titles" />
      </div>
    </Block>

    <Block
      eyebrow="Layout"
      title="Spacing, radius, elevation"
      lede="A 4-point grid with 20px screen gutters and 1px grid gaps between photo tiles so the photography reads as a continuous surface."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Spacing scale" note="Base unit 4pt. Screen gutter is always 20px; section gaps step to 24 or 32.">
          <SpacingScale steps={SPACING} />
        </Card>
        <Card title="Photo grid" note="3 columns at 390px: tiles of ~116px with 1px gaps, square crop, no captions.">
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-tile bg-border">
            {["photo-basketball", "photo-track-relay", "photo-volleyball", "photo-caps-tossed", "photo-cultural-dance", "photo-robotics-build"].map(
              (name) => (
                <img
                  key={name}
                  src={`/photos/${name}.jpg`}
                  alt=""
                  crossOrigin="anonymous"
                  className="aspect-square w-full object-cover"
                />
              ),
            )}
          </div>
        </Card>
      </div>
      <div className="mt-4">
        <RadiusRow items={RADII} />
      </div>
      <div className="mt-4">
        <ElevationRow
          items={[
            { token: "shadow-tile", value: "var(--shadow-tile)", use: "Cards, list rows" },
            { token: "shadow-elegant", value: "var(--shadow-elegant)", use: "Device bezel, admin CTA" },
            { token: "shadow-glow", value: "var(--shadow-glow)", use: "Primary CTA, Upload tab" },
            { token: "shadow-sheet", value: "var(--shadow-sheet)", use: "Bottom sheets, menus" },
          ]}
        />
      </div>
    </Block>

    <Block
      eyebrow="Motion"
      title="Motion"
      lede="Motion explains where things came from. Entrances are slower than exits, everything sits between 150ms and 420ms, and nothing loops except the urgent-deadline dot."
    >
      <Surface className="p-5">
        <MotionRow items={MOTION} />
      </Surface>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Card title="Sheets" note="Slide up from the bottom edge, 28px top corners, backdrop dim at 45%.">
          <PhoneButton block variant="outline">
            Try a sheet in section 04
          </PhoneButton>
        </Card>
        <Card title="Press" note="Every control scales to 0.97 on press — the only feedback a photo-first app needs.">
          <PhoneButton block>Press me</PhoneButton>
        </Card>
        <Card title="Stagger" note="Grids fade up with a 20ms per-item stagger on first paint, once per screen.">
          <div className="flex gap-1.5">
            {[0, 1, 2, 3, 4].map((index) => (
              <span
                key={index}
                className="size-8 animate-rise-in rounded-tile bg-primary/25"
                style={{ animationDelay: `${index * 60}ms` }}
              />
            ))}
          </div>
        </Card>
      </div>
    </Block>

    <Block
      eyebrow="Iconography"
      title="Icons"
      lede="Lucide, 1.75–2.5px strokes, sized 14/16/18/20/22. An icon never appears without a label unless it is a well-understood header control with an accessible name."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {ICONS.map(({ icon: Icon, use }) => (
          <div key={use} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-muted text-foreground">
              <Icon className="size-[18px]" aria-hidden="true" />
            </span>
            <span className="text-caption font-semibold text-muted-foreground">{use}</span>
          </div>
        ))}
      </div>
    </Block>

    <Block
      eyebrow="Photography"
      title="Photography treatment"
      lede="Photos are the interface. The system's job is to get out of their way, then guarantee legibility when text has to sit on top."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Cover treatment" note="Event covers are 16:9, centre-cropped, with the name over a gradient scrim.">
          <div className="relative overflow-hidden rounded-2xl">
            <img src="/photos/cover-intramurals.jpg" alt="" crossOrigin="anonymous" className="aspect-video w-full object-cover" />
            <span className="photo-scrim pointer-events-none absolute inset-0" aria-hidden="true" />
            <div className="absolute inset-x-4 bottom-3">
              <span className="rounded-full bg-status-pending-soft px-2 py-[3px] text-caption font-bold text-status-pending-foreground">
                2 days left
              </span>
              <p className="mt-1.5 text-subhead font-bold text-onimage">Intramurals 2026</p>
            </div>
          </div>
        </Card>
        <Card title="Gallery treatment" note="Square crop, newest first, no captions in the grid, stacked icon only on batches.">
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-tile bg-border">
            {["photo-foundation-parade", "photo-diploma", "photo-science-model"].map((name, index) => (
              <div key={name} className="relative aspect-square">
                <img src={`/photos/${name}.jpg`} alt="" crossOrigin="anonymous" className="size-full object-cover" />
                {index === 2 ? (
                  <span className="absolute bottom-1 right-1">
                    <StackBadge />
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
        <Card title="Scrim rule" note="Any text or control over a photo sits on .photo-scrim: 35% ink at 62%, 82% at the base.">
          <div className="space-y-2">
            <ContrastRow pair="onimage on 82% scrim" ratio="12.4:1" />
            <ContrastRow pair="onimage on 35% scrim" ratio="4.9:1" />
            <ContrastRow pair="solid status chip on photo" ratio="5.1:1" />
          </div>
        </Card>
      </div>
    </Block>

    <Block
      eyebrow="Accessibility"
      title="Accessibility contract"
      lede="These are verified targets for this design, not aspirations."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Contrast" note="Measured on the shipped token values.">
          <div className="space-y-2">
            <ContrastRow pair="foreground on background (light)" ratio="14.6:1" />
            <ContrastRow pair="muted-foreground on background (light)" ratio="5.1:1" />
            <ContrastRow pair="foreground on background (dark)" ratio="13.8:1" />
            <ContrastRow pair="primary-foreground on primary (light)" ratio="4.8:1" />
            <ContrastRow pair="admin-foreground on admin (light)" ratio="9.4:1" />
            <ContrastRow pair="status-rejected-foreground on rejected-soft" ratio="7.2:1" />
          </div>
        </Card>
        <Card title="Interaction and semantics" note="Applies to every interactive component in section 02.">
          <Bullets
            items={[
              "Minimum touch target 44 × 44 px; icon buttons are 36px visually with 44px of hit area.",
              "Sheets and dialogs are role=dialog with aria-modal, Escape to dismiss, and focus returned to the trigger.",
              "Status chips expose their label to screen readers even when the visual is icon-led.",
              "Counters announce as sentences: “6 pending photos”, not just the numeral.",
              "Nothing depends on hover. Pull to refresh and swipes all have a visible control equivalent.",
              "Text never sits directly on an unscrimmed photo, in either theme.",
            ]}
          />
        </Card>
      </div>
    </Block>

    <Block
      eyebrow="Voice"
      title="Voice and microcopy"
      lede="Calm, specific, and never blaming. The student is doing the school a favour by sharing photos — the copy should read that way."
    >
      <SpecTable
        head={["Moment", "What we say", "Why"]}
        rows={[
          [
            "Empty gallery",
            "No photos yet. Tap + to upload your first one.",
            "Names the exact next action, no apology.",
          ],
          [
            "Rejection (student)",
            "Needs a new photo: Blurry — with a Replace photo button.",
            "States the fix, never the verdict. The word “rejected” never reaches a student.",
          ],
          [
            "Deadline passed",
            "Submissions are closed. Ask a committee member if you need an extension.",
            "Explains the rule and gives a human route out.",
          ],
          ["Upload failure", "Upload interrupted — Retry.", "Says what happened, offers one action."],
          [
            "Offline",
            "No connection. Your photos are saved and will retry.",
            "Removes the fear of losing work.",
          ],
          [
            "All caught up",
            "All caught up! Nothing is waiting for review.",
            "Rewards the committee for clearing the queue.",
          ],
        ]}
      />
      <div className="mt-6">
        <DoDont
          dos={[
            "“Use your school Google account.”",
            "“Only you and the yearbook committee can see your photos.”",
            "“1 of 6 photos is still uploading.”",
          ]}
          donts={[
            "“Invalid credentials”",
            "“Your photo was rejected.”",
            "“Error 500: upload failed”",
          ]}
        />
      </div>
    </Block>

    <Block
      eyebrow="Components"
      title="Where to go next"
      lede="Section 02 turns every token above into a component with all of its states."
    >
      <div className="flex flex-wrap gap-2">
        <Chip selected>Buttons</Chip>
        <Chip>Status chips</Chip>
        <Chip>Event cards</Chip>
        <Chip>Photo tiles</Chip>
        <Chip>Sheets</Chip>
        <Chip>Toasts</Chip>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Avatar name="Mikaela Reyes" src="/photos/avatar-mikaela.jpg" size="lg" />
        <Avatar name="Daniel Cruz" src="/photos/avatar-daniel.jpg" size="lg" tone="admin" />
        <Avatar name="Joshua Villanueva" size="lg" />
      </div>
    </Block>
  </>
);

export default StyleGuide;
