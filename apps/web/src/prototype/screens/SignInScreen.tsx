import { LogIn, ShieldAlert } from "lucide-react";

import { GoogleMark } from "@/components/brand/GoogleMark";
import { Logo } from "@/components/brand/Logo";
import { InlineBanner, MaintenanceState } from "@/components/app/Feedback";
import { PhoneButton } from "@/components/app/PhoneButton";
import { Checkbox } from "@/components/ui/checkbox";
import { SCHOOL_DOMAIN, SCHOOL_NAME } from "@/prototype/data";
import { StatusBar } from "@/prototype/StatusBar";
import { useMockApp } from "@/prototype/store";

const HERO_PRIMARY = "/photos/cover-graduation.jpg";
const HERO_TOP = "/photos/photo-caps-tossed.jpg";
const HERO_BOTTOM = "/photos/photo-cultural-dance.jpg";

/** Screen 1 — Sign in. Google only: no email, password, or register toggle. */
export const SignInScreen = () => {
  const { state, dispatch, open } = useMockApp();

  if (state.authIssue === "maintenance") {
    return (
      <div className="flex h-full flex-col bg-background">
        <StatusBar />
        <div className="flex-1">
          <MaintenanceState onRetry={() => dispatch({ type: "authIssue", issue: "none" })} />
        </div>
      </div>
    );
  }

  const canContinue = state.consentChecked;

  return (
    <div className="flex h-full flex-col bg-background">
      <StatusBar />

      <div className="no-scrollbar flex-1 overflow-y-auto px-5">
        <div className="grid grid-cols-2 gap-2.5">
          <img
            src={HERO_PRIMARY}
            alt=""
            crossOrigin="anonymous"
            className="h-full w-full rounded-[22px] object-cover"
          />
          <div className="flex flex-col gap-2.5">
            <img
              src={HERO_TOP}
              alt=""
              crossOrigin="anonymous"
              className="aspect-[4/3] w-full rounded-[18px] object-cover"
            />
            <img
              src={HERO_BOTTOM}
              alt=""
              crossOrigin="anonymous"
              className="aspect-[4/3] w-full rounded-[18px] object-cover"
            />
          </div>
        </div>

        <Logo size={42} className="mt-7" />
        <h1 className="mt-4 text-title font-extrabold leading-[33px] tracking-[-0.025em] text-foreground">
          Every moment, one yearbook.
        </h1>
        <p className="mt-2.5 text-label leading-[21px] text-muted-foreground">
          Upload your photos from school events, tag them, and the yearbook committee takes it from
          there. Your submissions stay private to you and the committee.
        </p>
      </div>

      <div className="shrink-0 px-5 pb-7 pt-3">
        {state.authIssue === "cancelled" ? (
          <InlineBanner
            className="mb-3"
            tone="warning"
            icon={LogIn}
            title="Sign-in cancelled"
            message="No account was connected. Tap Continue with Google to try again."
          />
        ) : null}

        {state.authIssue === "nonSchool" ? (
          <InlineBanner
            className="mb-3"
            tone="error"
            icon={ShieldAlert}
            title={`Please use your school Google account.`}
            message={`The account you picked is not a ${SCHOOL_NAME} account. Accounts end in @${SCHOOL_DOMAIN}.`}
          />
        ) : null}

        {state.authIssue === "expired" ? (
          <InlineBanner
            className="mb-3"
            tone="warning"
            title="Session expired"
            message="Sign in with Google again to continue where you left off."
          />
        ) : null}

        <div className="flex cursor-pointer items-start gap-3">
          <Checkbox
            id="consent"
            checked={state.consentChecked}
            onCheckedChange={(value) => dispatch({ type: "setConsent", value: value === true })}
            className="mt-[1px] size-[22px] rounded-[7px]"
          />
          <span className="text-label leading-[19px] text-muted-foreground">
            <button
              type="button"
              onClick={() => dispatch({ type: "setConsent", value: !state.consentChecked })}
              className="text-left"
            >
              I agree to the{" "}
            </button>
            <button
              type="button"
              onClick={() => open("privacy")}
              className="font-semibold text-primary underline underline-offset-2"
            >
              Privacy Notice
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: "setConsent", value: !state.consentChecked })}
              className="text-left"
            >
              {" "}
              and understand photos may be published in the yearbook.
            </button>
          </span>
        </div>

        <PhoneButton
          block
          size="lg"
          className="mt-4"
          disabled={!canContinue}
          onClick={() => dispatch({ type: "googleSignIn" })}
        >
          <GoogleMark />
          Continue with Google
        </PhoneButton>

        <p className="mt-3 text-center text-caption font-medium text-muted-foreground">
          Use your school Google account.
        </p>
      </div>
    </div>
  );
};
