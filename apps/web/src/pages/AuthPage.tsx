import { Lock, MailX, ShieldAlert, TimerOff } from "lucide-react";

import { GoogleMark } from "@/components/brand/GoogleMark";
import { Card, Bullets, Block, DoDont, SectionIntro, SpecTable, Pill } from "@/components/shell/Docs";
import { FrameStage, FrameStageItem, ScaledFrame } from "@/components/shell/FrameStage";
import { PhoneShell } from "@/prototype/PhoneShell";

export const AuthPage = () => (
  <>
    <SectionIntro
      index="03"
      kicker="Deliverable three"
      title="Sign in"
      lede="One screen, one provider, one gate. Google is the only way in: no email field, no password, no register toggle, no forgot-password flow, no verification code. The consent checkbox decides whether the button works at all."
      meta={
        <>
          <Pill tone="brand">Google only</Pill>
          <Pill>Consent gates the CTA</Pill>
          <Pill>Privacy Notice sheet</Pill>
          <Pill tone="admin">No self-assigned admin</Pill>
        </>
      }
    />

    <Block
      eyebrow="Screen 1 of 6"
      title="The sign-in screen, live"
      lede="Scroll it, tick the box, press the button. The sheet that follows is the first-time setup, which appears once ever."
    >
      <FrameStage>
        <FrameStageItem>
          <PhoneShell
            role="student"
            initial={{ screen: "signin", signedIn: false, consentChecked: false, firstTimeSetupDone: false }}
            caption="Sign in — untouched"
            description="Continue with Google is disabled until the privacy checkbox is ticked. Use your school Google account."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="student"
            initial={{ screen: "signin", signedIn: false, consentChecked: true, firstTimeSetupDone: false }}
            caption="Consent given — the CTA is live"
            description="Ticking the box also unlocks the Privacy Notice link, which is the first thing a cautious student will open."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="student"
            initial={{
              screen: "signin",
              signedIn: false,
              consentChecked: false,
              overlays: [{ id: "privacy" }],
            }}
            caption="Privacy Notice — opened from the link"
            description="Six short sections, the Data Privacy Act of 2012 (RA 10173) reference, and the removal path."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="student"
            initial={{ screen: "signin", signedIn: false, consentChecked: true, firstTimeSetupDone: false }}
            script={[{ type: "googleSignIn" }]}
            caption="First-Time Setup — after the first sign-in only"
            description="Name prefilled from Google, club optional. This sheet never appears again on this device."
          />
        </FrameStageItem>
      </FrameStage>
    </Block>

    <Block
      eyebrow="Failure"
      title="Sign-in states"
      lede="Four ways the sign-in can go sideways, each with its own copy and no dead ends."
    >
      <FrameStage>
        <FrameStageItem>
          <PhoneShell
            role="student"
            initial={{
              screen: "signin",
              signedIn: false,
              consentChecked: true,
              authIssue: "cancelled",
            }}
            caption="Google sheet dismissed"
            description="“Sign-in cancelled” with a retry instruction — never a silent failure."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="student"
            initial={{
              screen: "signin",
              signedIn: false,
              consentChecked: true,
              authIssue: "nonSchool",
            }}
            caption="Personal Gmail account"
            description="Blocked with the reason and the domain the school actually uses."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="student"
            initial={{
              screen: "signin",
              signedIn: false,
              consentChecked: true,
              authIssue: "expired",
            }}
            caption="Session expired"
            description="Says exactly what to do: sign in with Google again."
          />
        </FrameStageItem>
        <FrameStageItem>
          <PhoneShell
            role="student"
            initial={{ screen: "signin", signedIn: false, authIssue: "maintenance" }}
            caption="Maintenance window"
            description="Full-screen takeover that promises drafts are safe and offers a retry."
          />
        </FrameStageItem>
      </FrameStage>
    </Block>

    <Block
      eyebrow="Rules"
      title="What the auth screen is not allowed to do"
      lede="Every one of these was in the original brief as an explicit exclusion."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Excluded by design" note="If it is not here, it does not exist in the build.">
          <div className="grid gap-2.5 sm:grid-cols-2">
            {["Email + password", "Register / sign-up toggle", "Forgot password", "Verification code", "Magic link", "Anonymous browsing"].map(
              (item) => (
                <span
                  key={item}
                  className="flex items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2 text-label font-semibold text-muted-foreground"
                >
                  <Lock className="size-4 shrink-0" aria-hidden="true" />
                  {item}
                </span>
              ),
            )}
          </div>
        </Card>
        <Card title="Roles are never chosen" note="The role comes from the account the adviser added to the committee list.">
          <Bullets
            items={[
              "The sign-in screen has no role picker, no “I am a committee member” toggle.",
              "A student account that reaches the committee area gets the access-denied state, never a form.",
              "First-Time Setup asks for a name and an optional club — nothing else.",
              "Committee members see the same sign-in screen and land on Review instead of Home.",
            ]}
          />
        </Card>
      </div>

      <div className="mt-4">
        <SpecTable
          head={["Element", "Copy", "State rule"]}
          rows={[
            [
              "Logo + tagline",
              "YearbookHub · Every moment, one yearbook.",
              "Always present, never animated on load",
            ],
            [
              "Primary button",
              "Continue with Google",
              "Disabled until the consent checkbox is ticked",
            ],
            [
              "Consent",
              "I agree to the Privacy Notice and understand photos may be published in the yearbook.",
              "Privacy Notice is an inline link that opens the sheet",
            ],
            ["Helper", "Use your school Google account.", "Static, always visible"],
            [
              "School domain",
              "student.stmichaels.edu.ph",
              "Shown in the non-school-account error, not pre-filled anywhere",
            ],
          ]}
        />
      </div>

      <div className="mt-6">
        <DoDont
          dos={[
            "keep the consent sentence as one readable line, not fine print",
            "explain a blocked sign-in with the exact domain to use",
            "return focus to the button after the sheet closes",
          ]}
          donts={[
            "pre-tick the consent box",
            "hide the school-account requirement until after failure",
            "offer email sign-up as a fallback",
          ]}
        />
      </div>
    </Block>

    <Block
      eyebrow="Detail"
      title="Provider mark and trusted copy"
      lede="The Google mark is the one place where hard-coded brand colour is correct — an identity mark keeps its own palette."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Button composition" note="18px mark, 8px gap, 48px tall, full width, pill radius.">
          <span className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-subhead font-semibold text-primary-foreground shadow-glow">
            <GoogleMark />
            Continue with Google
          </span>
        </Card>
        <Card title="Non-school account" note="Names the problem and the fix in one line each.">
          <div className="rounded-2xl border border-status-rejected/30 bg-status-rejected-soft p-3.5">
            <p className="flex items-center gap-2 text-label font-bold text-status-rejected-foreground">
              <MailX className="size-4" aria-hidden="true" />
              Please use your school Google account.
            </p>
            <p className="mt-1 text-caption text-status-rejected-foreground/90">
              The account you picked is not a St. Michael's Academy account. Accounts end in
              @student.stmichaels.edu.ph.
            </p>
          </div>
        </Card>
        <Card title="Maintenance" note="Never a blank screen: says what is happening and offers a retry.">
          <div className="flex flex-col items-center rounded-2xl bg-muted/60 p-4 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-status-pending-soft text-status-pending-foreground">
              <TimerOff className="size-5" aria-hidden="true" />
            </span>
            <p className="mt-3 text-subhead font-bold text-foreground">Down for maintenance</p>
            <p className="mt-1 text-caption text-muted-foreground">
              Your drafts are safe on this device.
            </p>
          </div>
        </Card>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Committee access denied" note="Reached only by an account without committee rights. Exists as a state, not a screen.">
          <div className="flex flex-col items-center rounded-2xl border border-admin-border bg-admin-surface p-5 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-background text-admin">
              <ShieldAlert className="size-5" aria-hidden="true" />
            </span>
            <p className="mt-3 text-subhead font-bold text-admin-ink">Committee access only</p>
            <p className="mt-1.5 text-caption leading-[17px] text-admin-ink/80">
              Access is assigned by the committee — it can never be self-selected.
            </p>
          </div>
        </Card>
        <div>
          <ScaledFrame
            scale={0.5}
            role="admin"
            initial={{ screen: "review", signedIn: true, authIssue: "denied" }}
            caption="Same student account, committee tab: blocked with an exit to My Photos"
          />
        </div>
      </div>
      <div className="mt-4">
        <SpecTable
          head={["State", "Icon", "Title", "Body"]}
          rows={[
            ["Cancelled", "LogIn", "Sign-in cancelled", "No account was connected. Tap Continue with Google to try again."],
            ["Non-school email", "ShieldAlert", "Please use your school Google account.", "Accounts end in @student.stmichaels.edu.ph."],
            ["Expired", "TimerOff", "Session expired", "Sign in with Google again to continue where you left off."],
            ["Maintenance", "TriangleAlert", "Down for maintenance", "Your drafts are safe on this device."],
            ["Denied", "ShieldAlert", "Committee access only", "Access is assigned by the committee."],
          ]}
        />
      </div>
    </Block>
  </>
);

export default AuthPage;
