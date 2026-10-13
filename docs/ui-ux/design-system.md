# Design System

> **Source of truth for visuals = the design files / generated screens.** Values below were derived from the admin screens generated so far and are **approximate**; sample exact colors and spacing from the design file before finalizing `theme/tokens.ts`. Student-side screens were not available when this was written; they follow the same tokens. Behavior never comes from this file (see `specification.md`).

## 1. Look & feel

Modern, photo-first campus app. Deep purple primary, white cards, rounded pills, calm neutrals. Photos carry the color. Admin areas use a solid purple header band with an uppercase overline ("YEARBOOK COMMITTEE").

## 2. Color tokens (light)

| Token                                                                                                                                                                                                                             | Approx. value                  | Use                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------ |
| `primary`                                                                                                                                                                                                                         | `#5E3291` (sample from design) | Buttons, active tab, header band, selected chips |
| `onPrimary`                                                                                                                                                                                                                       | `#FFFFFF`                      | **Text/icons on primary (always white)**         |
| `primarySoft`                                                                                                                                                                                                                     | `#EFE9F7`                      | Soft highlights, info icon bg                    |
| `bg`                                                                                                                                                                                                                              | `#FCFCFA`                      | Screen background                                |
| `surface`                                                                                                                                                                                                                         | `#FFFFFF`                      | Cards, sheets, inputs                            |
| `surfaceAlt`                                                                                                                                                                                                                      | `#F1F1F5`                      | Chips, skeletons, icon circles                   |
| `border`                                                                                                                                                                                                                          | `#E4E4EC`                      | Card/input borders                               |
| `text`                                                                                                                                                                                                                            | `#14141B`                      | Primary text                                     |
| `textMuted`                                                                                                                                                                                                                       | `#6B6B7B`                      | Secondary text                                   |
| `success` / `successBg`                                                                                                                                                                                                           | `#1F8A5B` / `#E3F5EC`          | Approved, Open, Consent confirmed                |
| `warning` / `warningBg`                                                                                                                                                                                                           | `#C2650A` / `#FDF0DC`          | Pending, deadline < 72 h                         |
| `danger` / `dangerBg`                                                                                                                                                                                                             | `#D3203B` / `#FDE8EB`          | Rejected, Closed, destructive buttons            |
| `info`                                                                                                                                                                                                                            | `#0B72C9`                      | Reported badge, info cards                       |
| `overlay`                                                                                                                                                                                                                         | `rgba(10,10,20,0.45)`          | Sheet/dialog scrim                               |
| Dark mode: `bg #0B0B12`, `surface #16161F`, `surfaceAlt #20202B`, `border #2C2C3A`, `text #F4F4F8`, `textMuted #A0A0B2`, `primary` lightened to keep ≥ 4.5:1 with white text (e.g. `#7A4BB8`), status backgrounds darkened ~20 %. |
| **Rule:** one primary color everywhere (including empty-state buttons). White text on primary.                                                                                                                                    |

## 3. Typography

Plus Jakarta Sans (Inter fallback). Weights 400/500/600/700/800.

| Style      | Size/line                           | Weight | Use                  |
| ---------- | ----------------------------------- | ------ | -------------------- |
| title      | 28/34                               | 700    | Screen/sheet titles  |
| heading    | 20/26                               | 600    | Section headings     |
| subheading | 17/24                               | 600    | Card titles          |
| body       | 16/24                               | 400    | Text                 |
| caption    | 13/18                               | 400    | Metadata             |
| overline   | 12/16 uppercase, letter-spacing 1.5 | 600    | "YEARBOOK COMMITTEE" |
| button     | 16/20                               | 600    | Buttons              |

## 4. Spacing, radius, elevation

- 4 pt grid: 4, 8, 12, 16, 20, 24, 32. Screen side padding 20. Section gap 24.
- Radius: pill/buttons 999, card 20, sheet top 28, input 14, chip 999, photo tile 12, hero image 0 (full-bleed in sheets).
- Elevation: cards use a 1 px border + very soft shadow (`0 4 12 rgba(20,20,40,.06)`); sheets use a larger soft shadow; avoid heavy shadows.
- Touch targets ≥ 44 × 44. Tab bar height ≈ 72 plus safe area.

## 5. Iconography

Lucide line icons, 24 px (20 px inside chips/badges), stroke 1.75. Status icons: Approved = `check`, Pending = `clock`, Rejected = `x`, Reported = `flag`, Consent = `shield-check`, Stack = `layers`, Closed = `x`, Open = `check`. Tabs: Review = `clipboard-check`, Events = `calendar-days`, Home = `home`, Upload = `plus-circle` (center, highlighted), My Photos = `image`/`grid`.

## 6. Components visual notes

- **Primary button:** pill, full width in sheets (56 px), `primary` bg, white text; pressed = darker 8 %; disabled = 40 % opacity; loading = spinner replacing icon.
- **Outline button:** border `border`, text `text`. **Destructive:** `danger` bg + white text, or outline with danger text (Reject).
- **Chips:** `surfaceAlt` bg, `text`; selected = `primary` bg + white text; scrolling rows fade out on the right edge.
- **Badges:** status = bg tint + icon + label (e.g. ✓ Approved). Tile status = small filled circle with icon (top-left); Reported = blue pill with flag (top-right).
- **Cards:** white, border, radius 20, padding 16–20.
- **Bottom sheet:** top radius 28, drag handle, close ✕ (circle `surfaceAlt`) top-right, sticky footer with top hairline.
- **Dialog:** centered card radius 28, icon in tinted circle, title, body, two pill buttons side by side.
- **Tab bar:** white, top hairline, icon above label; active = primary; badge = primary circle with white count.
- **Skeleton:** `surfaceAlt` blocks with subtle shimmer.

## 7. Motion

Sheets slide up 250 ms ease-out; dialogs fade/scale 200 ms; toasts slide from bottom 200 ms; success check animation 400 ms; swipe transitions follow the finger (Reanimated); respect "reduce motion".

## 8. Accessibility rules (must hold regardless of visuals)

- Contrast ≥ 4.5:1 (check white on `primary` in light and dark).
- Status = icon + label, never color alone.
- Icon-only buttons have `accessibilityLabel`; dynamic type up to 130 % without clipping.
- Badges/overlays on tiles never overlap each other.
- Sticky footers must not hide form fields (scroll padding ≥ footer height).
- Horizontally scrolling chip rows show a right-edge fade.

## 9. Assets

Event cover presets `assets/covers/{sports,festival,graduation,science}.jpg` (≥ 800 px wide, < 150 KB each); app icon/splash with the YearbookHub logo (use the logo in headers instead of a generic icon); Plus Jakarta Sans via `@expo-google-fonts`.

## 10. Token file

`apps/mobile/src/theme/tokens.ts` exports `lightTheme`, `darkTheme` objects with the keys above plus `spacing`, `radius`, `typography`. Components read colors only via `useTheme()`; no hex literals in components.
