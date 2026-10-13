# YearbookHub — Frontend Mockup (P2)

The complete YearbookHub app UI on mock data: all 6 screens, sheets, dialogs,
states, dark mode and seven clickable prototype flows. No backend, Clerk, or
Supabase is required — everything runs against an in-memory store seeded with
relative deadlines so countdowns stay truthful.

Built with Vite + React + TypeScript + Tailwind CSS (shadcn/ui primitives),
react-router, TanStack Query and i18next.

## Run it

From the repository root:

```bash
npm install
npm run dev --workspace web        # http://localhost:8080
```

Or from this folder:

```bash
npm run dev        # http://localhost:8080
npm run build      # production build to dist/
npm run lint
npm run typecheck
```

## Where things live

| Path                                   | Purpose                                                                                       |
| -------------------------------------- | --------------------------------------------------------------------------------------------- |
| `src/prototype/screens/`               | The 6 full screens: Sign In, Home, Upload, My Photos, Review, Events                          |
| `src/prototype/sheets/`                | Bottom sheets and overlays (event detail, filters, reject reason, profile, removal, …)        |
| `src/prototype/overlays/`              | Sheet host, dialog and toast primitives                                                      |
| `src/prototype/data.ts`                | In-memory fixtures: people, events, photos, notifications, copy                               |
| `src/prototype/store.tsx` + `reducer.ts` | Mock session and app state                                                                  |
| `src/pages/`                           | Design-shell pages: style guide, component library, states, dark mode, flows                 |
| `src/components/ui/`                   | shadcn/ui scaffolding (vendor-style, ignored by ESLint)                                       |
| `public/photos/`                       | Bundled mock photos and avatars (free-licensed / generated sample content, no real students)  |
| `screenshots/`                         | Design screenshots used to compare each screen (P2D review)                                   |

## Notes

- The mock data model mirrors `docs/specification.md` and `docs/technical/api.md`:
  student views never expose review status, deadlines are enforced as
  `is_open AND now() < deadline`, and every count in the UI is derived from fixtures.
- Analytics is the Enter.pro SDK and is a **no-op** without `VITE_ENTER_ANALYTICS_*`
  env vars (see `.env.example`); no tracking is configured in this repo.
- Swapping to the real backend later means replacing the prototype store with an
  `ApiClient` implementation (P6 in `docs/phases.md`).
