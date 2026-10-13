# Roadmap

## Now — MVP (weeks 3–8)

All P0 and P1 items in `requirements.md`: Google sign-in, upload pipeline, private gallery, review, browse/filter, events/deadlines, removal requests, push notifications, dark mode.

## Next — v1.1 (after the defense / first real use)

| Item                                                                              | Why                                                                                 |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Approved gallery per event (students see only approved photos from closed events) | Student engagement; needs stronger consent copy and RLS-equivalent rules in the API |
| ZIP export of approved photos grouped by event                                    | Hand-off to the layout team                                                         |
| Persistent offline upload queue (survives app restart)                            | Poor signal at events                                                               |
| Push receipts handling and retry                                                  | Reliability                                                                         |
| Sentry (mobile + API)                                                             | Observability                                                                       |
| Admin dashboard stats (per-event totals, oldest pending)                          | Committee insight                                                                   |
| Replacement grace period after deadline                                           | Avoid manual deadline extension (BR-06)                                             |

## Later

| Item                                      | Notes                              |
| ----------------------------------------- | ---------------------------------- |
| In-app admin/role management              | Today: SQL / `admin_emails`        |
| Keep higher-resolution originals (2–4 MB) | Needs paid storage                 |
| Tag people / mark cover candidates        | Layout workflow                    |
| Web admin dashboard (Next.js)             | Large-screen review                |
| Multi-school tenancy                      | Out of current scope               |
| Localization (Filipino)                   | After English stabilizes           |
| iOS distribution                          | Requires Apple developer account   |
| Automated layout suggestions              | Out of scope for a student project |
