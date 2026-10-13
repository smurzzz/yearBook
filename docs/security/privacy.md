# Privacy

> Drafted for a Philippine school context (Data Privacy Act of 2012, RA 10173). This is **not legal advice**; have the school's Data Protection Officer (DPO) review it (OQ-3).

## 1. Principles applied

Transparency (clear notice + consent) · Legitimate purpose (yearbook production only) · Proportionality (collect only what is needed) · Security (see `security.md`).

## 2. Data inventory

| Data                                                                                                   | Source                       | Purpose                            | Visible to                     | Retention                             |
| ------------------------------------------------------------------------------------------------------ | ---------------------------- | ---------------------------------- | ------------------------------ | ------------------------------------- |
| Name, school email, Google avatar                                                                      | Google via Clerk, user input | Identify uploaders; show on review | Self, admins                   | Until account deletion / purge        |
| Club (optional)                                                                                        | User                         | Tagging                            | Self, admins                   | Same                                  |
| Photos (may show students/minors)                                                                      | User upload                  | Yearbook content                   | Uploader, admins               | Until removal / purge (§6)            |
| Photo captions, tags                                                                                   | User                         | Organization                       | Uploader, admins               | With photo                            |
| Consent timestamp + version                                                                            | App                          | Proof of consent                   | Admins (DB)                    | With account                          |
| Review decisions, rejection reasons                                                                    | Admin                        | Feedback                           | Uploader (reason only), admins | With photo                            |
| Removal requests                                                                                       | Student                      | Data subject request               | Reporter (outcome), admins     | Kept as audit record after resolution |
| Push tokens                                                                                            | Device                       | Notifications                      | Server only                    | Until logout/uninstall/purge          |
| Logs                                                                                                   | Server                       | Operations                         | Developers                     | ≤ 30 days (provider default), no PII  |
| Not collected: location (EXIF removed), contacts, device identifiers beyond push token, analytics/ads. |

## 3. Legal basis

Consent (checkbox at sign-in for the privacy notice; checkbox at each upload that the uploader has permission and the people in the photos agree to publication). For minors, the school's policy/parental consent applies; confirm with the DPO how consent is collected (OQ-3). The app records consent text version and time.

## 4. Data subject rights and how the app supports them

| Right                     | Support                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| Informed                  | Privacy Notice sheet (Sign In, Profile)                                                     |
| Access                    | Students see all their own photos in My Photos; data export on request to the committee/DPO |
| Rectification             | Edit name/club/captions/tags (while allowed)                                                |
| Erasure / blocking        | Request removal (per photo); Delete account (all data)                                      |
| Object / withdraw consent | Delete account; contact DPO                                                                 |
| Complaint                 | Contact DPO / National Privacy Commission                                                   |

## 5. Third-party processors

| Processor                                                                                                                                              | Data                               | Notes                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- | --------------------------------------------------------- |
| Google                                                                                                                                                 | Sign-in identity                   | Via Clerk SSO                                             |
| Clerk                                                                                                                                                  | Auth identity, email, name, avatar | US-hosted                                                 |
| Supabase                                                                                                                                               | Database + photos                  | Region chosen near PH; may be outside PH                  |
| Vercel                                                                                                                                                 | API processing (transient)         |                                                           |
| Expo / Firebase (FCM)                                                                                                                                  | Push tokens, notification text     | Notification text may include event name and reason label |
| Disclose in the Privacy Notice that data may be processed on servers outside the Philippines; execute data-processing terms as required by the school. |

## 6. Retention & deletion

- Keep until the yearbook is published + 90 days (OQ-4), then purge (`deployment/backup-recovery.md` §5).
- Removal requests resolved within **7 days** (committee policy; target).
- Account deletion removes profile + photos immediately (storage first).
- Backups containing deleted data expire per backup policy (delete old dumps within 30 days after purge).

## 7. Breach response

1. Contain (rotate keys, maintenance mode). 2. Assess scope with logs/DB. 3. Notify the DPO immediately. 4. The school/controller assesses mandatory notification to the National Privacy Commission and affected data subjects (generally within 72 hours of knowledge for qualifying breaches — verify current NPC rules with the DPO). 5. Document the incident and remediation.

## 8. Privacy log (fill in during operation)

| Date | Event (consent text change, purge, breach, request) | Action | By  |
| ---- | --------------------------------------------------- | ------ | --- |
|      |                                                     |        |     |

## 9. Draft texts (used verbatim in the app; DPO to approve)

### 9.1 Sign-in consent checkbox

"I agree to the Privacy Notice and understand photos may be published in the yearbook."

### 9.2 Upload consent checkbox

"I have permission to share these photos and the people in them agree to be published."

### 9.3 Privacy Notice sheet text (version `2026-10-v1`)

**YearbookHub Privacy Notice**

- **What we collect:** your name, school email and profile picture from your Google account, your club (optional), and the photos and captions you upload.
- **Why:** to collect, review, and organize photos for the school yearbook. We do not use your data for advertising.
- **Who can see your photos:** only you and the yearbook committee. Other students cannot see your photos.
- **Publication:** photos approved by the committee may be published in the school yearbook.
- **Your choices:** you can edit or delete photos that are not yet approved, ask the committee to remove any of your photos (open the photo, tap ⋮, then Request removal), or delete your account to remove your data.
- **Storage and security:** photos are stored securely and are only available through temporary links. Our service providers may process data on servers outside the Philippines.
- **Your rights:** under the Data Privacy Act of 2012 (RA 10173) you may ask to access, correct, or erase your data. Contact the school's Data Protection Officer: {DPO contact — fill in}.
- **How long:** until the yearbook is published and a short retention period ends, or until you delete your data.

### 9.4 Help text on removal

"Open the photo, tap ⋮, then Request removal. The committee will review your request."
