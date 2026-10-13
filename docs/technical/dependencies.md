# Dependencies

**Pin policy:** at scaffold time install the latest stable of each, then **pin exact versions** (no `^`) in `package.json`; commit the lockfile. Do not upgrade Expo SDK / Next / Clerk mid-project. Use `npx expo install <pkg>` for Expo-managed libraries so versions match the SDK. Check each library's current docs when installing because APIs change.

## Mobile (`apps/mobile`)

| Package                                                                                                                                                 | Purpose                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `expo`, `expo-router`, `expo-dev-client`, `expo-constants`, `expo-linking`, `expo-splash-screen`, `expo-status-bar`, `expo-build-properties`            | Framework, routing, dev client           |
| `react-native`, `react-native-gesture-handler`, `react-native-reanimated`, `react-native-safe-area-context`, `react-native-screens`, `react-native-svg` | Core UI/gestures/animation               |
| `@gorhom/bottom-sheet`                                                                                                                                  | Bottom sheets                            |
| `@clerk/clerk-expo`, `expo-secure-store`, `expo-auth-session`, `expo-web-browser`                                                                       | Auth                                     |
| `@tanstack/react-query`                                                                                                                                 | Server state                             |
| `zustand`                                                                                                                                               | Client state (upload queue, undo, theme) |
| `zod`, `react-hook-form`, `@hookform/resolvers`                                                                                                         | Validation and forms                     |
| `expo-image`                                                                                                                                            | Cached images (`cacheKey`)               |
| `expo-image-picker`, `expo-image-manipulator`, `expo-file-system`                                                                                       | Camera/gallery, compression, uploads     |
| `expo-notifications`, `expo-device`                                                                                                                     | Push                                     |
| `@react-native-community/netinfo`                                                                                                                       | Connectivity                             |
| `@react-native-community/datetimepicker`                                                                                                                | Event deadline pickers                   |
| `lucide-react-native`                                                                                                                                   | Icons                                    |
| `@expo-google-fonts/plus-jakarta-sans`, `expo-font`                                                                                                     | Typeface (Inter fallback)                |
| `expo-haptics`                                                                                                                                          | Feedback on approve/reject               |
| Dev: `typescript`, `jest-expo`, `@testing-library/react-native`, `eslint`, `eslint-config-expo`, `prettier`.                                            |

## API (`apps/api`)

| Package                                                                  | Purpose                           |
| ------------------------------------------------------------------------ | --------------------------------- |
| `next`, `react`, `react-dom`                                             | Route handlers (App Router)       |
| `@clerk/nextjs`                                                          | Token verification, Clerk Backend |
| `postgres`                                                               | SQL client (postgres.js)          |
| `@supabase/supabase-js`                                                  | Storage only                      |
| `zod`                                                                    | Validation                        |
| `pino` (or console JSON logger)                                          | Logging                           |
| Dev: `typescript`, `vitest`, `eslint`, `eslint-config-next`, `prettier`. |

## Shared (`packages/shared`)

`zod`; dev: `typescript`, `vitest`.

## Tooling

`eas-cli`, `supabase` CLI, `postman` (manual), GitHub Actions.

## Rules

- No unmaintained libraries; prefer Expo-supported ones.
- Adding a dependency requires a note in the PR (purpose, size, native module yes/no — native modules need a new dev build).
- Run `npm audit --omit=dev` before release (`testing/qa-checklist.md`).
