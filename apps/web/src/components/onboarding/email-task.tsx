"use client";

import { useUser } from "@clerk/nextjs";
import { Lock, Mail, Receipt, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { AuthLoading } from "~/components/auth/auth-loading";
import { AuthScreen } from "~/components/auth/auth-screen";
import { VerifyCodeForm } from "~/components/auth/verify-code-form";
import { useLocale, useMessages } from "~/components/locale-provider";
import { NotNowLink, TaskActions } from "~/components/onboarding/task-actions";
import { Button } from "~/components/ui/button";
import { Field, FieldError, FieldLabel } from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { Input } from "~/components/ui/input";
import type { SplitFormError } from "~/lib/form-mutation-error";
import { splitClerkAuthError } from "@repo/domain/clerk-auth-error";

const FIELD_IDS = {
  email: "profile-email",
  code: "profile-email-code",
};

type Step = "email" | "code";

type EmailAddressLike = {
  id: string;
  emailAddress: string;
  verification: { status: string | null };
  prepareVerification: (params: { strategy: "email_code" }) => Promise<unknown>;
  attemptVerification: (params: { code: string }) => Promise<unknown>;
};

type UserLike = {
  emailAddresses: EmailAddressLike[];
  createEmailAddress: (params: { email: string }) => Promise<EmailAddressLike>;
  update: (params: { primaryEmailAddressId: string }) => Promise<unknown>;
};

const BENEFIT_ICONS = {
  receipts: Receipt,
  recovery: Mail,
  private: Lock,
} as const satisfies Record<string, LucideIcon>;

/** An address already on the account but never verified picks up where it left off. */
function unverifiedAddress(user: UserLike) {
  return user.emailAddresses.find(
    (address) => address.verification.status !== "verified",
  );
}

function Steps({ user, backHref }: { user: UserLike; backHref: string }) {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.webAuth.onboarding.email;
  const router = useRouter();
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const [step, setStep] = React.useState<Step>("email");
  const [email, setEmail] = React.useState(
    () => unverifiedAddress(user)?.emailAddress ?? "",
  );
  const [address, setAddress] = React.useState<EmailAddressLike | null>(null);
  const [code, setCode] = React.useState("");
  const [startedAt, setStartedAt] = React.useState(() => Date.now());
  const [pending, setPending] = React.useState(false);
  const [split, setSplit] = React.useState<SplitFormError | null>(null);

  React.useEffect(() => {
    if (split?.globalMessage) {
      summaryRef.current?.focus();
    } else if (split?.fieldErrors.email_address) {
      document.getElementById(FIELD_IDS.email)?.focus();
    }
  }, [split]);

  React.useEffect(() => {
    if (step === "code") {
      document.getElementById("auth-screen-heading")?.focus();
    }
  }, [step]);

  async function onSendCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) {
      return;
    }
    const trimmed = email.trim();
    if (trimmed.length === 0) {
      setSplit({
        fieldErrors: { email_address: copy.enterYourEmail },
        globalMessage: null,
      });
      return;
    }
    setPending(true);
    setSplit(null);
    try {
      const existing = user.emailAddresses.find(
        (item) => item.emailAddress.toLowerCase() === trimmed.toLowerCase(),
      );
      const target =
        existing ?? (await user.createEmailAddress({ email: trimmed }));
      await target.prepareVerification({ strategy: "email_code" });
      setAddress(target);
      setCode("");
      setStartedAt(Date.now());
      setStep("code");
      setPending(false);
    } catch (err) {
      setSplit(splitClerkAuthError(err, locale));
      setPending(false);
    }
  }

  async function onVerify() {
    if (pending || !address) {
      return;
    }
    setPending(true);
    setSplit(null);
    try {
      await address.attemptVerification({ code });
      await user.update({ primaryEmailAddressId: address.id });
      router.replace(backHref);
    } catch (err) {
      setSplit(splitClerkAuthError(err, locale));
      setPending(false);
    }
  }

  async function onResend() {
    if (pending || !address) {
      return;
    }
    setPending(true);
    try {
      await address.prepareVerification({ strategy: "email_code" });
      setStartedAt(Date.now());
      setPending(false);
    } catch (err) {
      setSplit(splitClerkAuthError(err, locale));
      setPending(false);
    }
  }

  function changeEmail() {
    setStep("email");
    setSplit(null);
    setCode("");
  }

  if (step === "code" && address) {
    return (
      <AuthScreen
        onBack={changeEmail}
        backLabel={m.common.back}
        eyebrow={m.webAuth.onboarding.eyebrow.email}
        title={copy.checkYourInbox}
        footer={
          <p className="text-eyebrow text-muted-foreground leading-[1.5]">
            {copy.unverifiedNote}
          </p>
        }
      >
        <VerifyCodeForm
          destination={address.emailAddress}
          changeLabel={m.webAuth.signUpContinue.changeEmail}
          onChangeIdentifier={changeEmail}
          code={code}
          onCodeChange={setCode}
          onVerify={() => {
            void onVerify();
          }}
          onResend={() => {
            void onResend();
          }}
          startedAt={startedAt}
          pending={pending}
          globalMessage={split?.globalMessage ?? null}
          codeError={split?.fieldErrors.code}
          codeInputId={FIELD_IDS.code}
          summaryRef={summaryRef}
          verifyLabel={copy.verifyEmail}
          helper={copy.spamHelper}
        />
      </AuthScreen>
    );
  }

  const emailError =
    split?.fieldErrors.email_address ?? split?.fieldErrors.emailAddress;

  return (
    <AuthScreen
      backHref={backHref}
      backLabel={m.common.back}
      eyebrow={m.webAuth.onboarding.eyebrow.email}
      title={copy.title}
      description={copy.description}
    >
      <form
        className="flex flex-col gap-[18px]"
        onSubmit={onSendCode}
        noValidate
      >
        <FormErrorSummary ref={summaryRef} message={split?.globalMessage} />
        <Field>
          <FieldLabel
            htmlFor={FIELD_IDS.email}
            className="text-meta text-muted-foreground"
          >
            {copy.emailLabel}
          </FieldLabel>
          <Input
            id={FIELD_IDS.email}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(emailError)}
            aria-describedby={
              emailError ? `${FIELD_IDS.email}-error` : undefined
            }
            size="lg"
            disabled={pending}
          />
          {emailError ? (
            <FieldError id={`${FIELD_IDS.email}-error`}>
              {emailError}
            </FieldError>
          ) : null}
        </Field>
        <Button
          type="submit"
          size="lg"
          pending={pending}
          pendingLabel={copy.sendingCode}
          className="w-full font-semibold"
        >
          {copy.sendCode}
        </Button>
        <ul className="flex flex-col gap-3 pt-2">
          {(Object.keys(BENEFIT_ICONS) as (keyof typeof BENEFIT_ICONS)[]).map(
            (key) => {
              const Icon = BENEFIT_ICONS[key];
              const { lead, rest } = copy.benefits[key];
              return (
                <li key={key} className="flex items-start gap-3">
                  <Icon
                    aria-hidden="true"
                    className="text-muted-foreground mt-0.5 size-4 shrink-0"
                  />
                  <p className="text-meta text-muted-foreground">
                    <span className="text-ink font-semibold">{lead}</span>{" "}
                    {rest}
                  </p>
                </li>
              );
            },
          )}
        </ul>
        <TaskActions>
          <NotNowLink href={backHref} disabled={pending} />
        </TaskActions>
      </form>
    </AuthScreen>
  );
}

/** The "Add and verify your email" Profile task: address, code, then primary. */
export function EmailTask({ backHref }: { backHref: string }) {
  const { user, isLoaded } = useUser();

  if (!isLoaded || !user) {
    return (
      <AuthScreen brand>
        <AuthLoading />
      </AuthScreen>
    );
  }

  return <Steps user={user} backHref={backHref} />;
}
