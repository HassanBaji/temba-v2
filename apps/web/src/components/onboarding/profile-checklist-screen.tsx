"use client";

import { useUser } from "@clerk/nextjs";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { AuthLoading } from "~/components/auth/auth-loading";
import { AuthScreen } from "~/components/auth/auth-screen";
import { useLocale, useMessages } from "~/components/locale-provider";
import {
  OnboardingStateGate,
  type ReadyOnboardingState,
} from "~/components/onboarding/onboarding-state-gate";
import { TaskMarker } from "~/components/onboarding/task-marker";
import { Button } from "~/components/ui/button";
import { profileTaskHref } from "~/lib/onboarding-step";
import { profileChecklistInputFrom } from "~/lib/profile-checklist-input";
import { cn } from "~/lib/utils";
import { initials } from "@repo/domain/initials";
import { displayPhone } from "@repo/domain/phone-number";
import {
  checklistBlurb,
  checklistCountLabel,
  checklistCta,
  profileChecklist,
  youAreInTitle,
  type ProfileChecklist,
  type ProfileTask,
} from "@repo/domain/profile-checklist";
import { userDisplayName } from "@repo/domain/user-display-name";

const FOCUS_RING =
  "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px] focus-visible:ring-inset";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-eyebrow text-muted-foreground font-mono uppercase">
      {children}
    </h2>
  );
}

function DoneRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <li className="flex min-h-[52px] items-center gap-3.5 px-4 py-3">
      <TaskMarker done />
      <span className="min-w-0 flex-1">
        <span className="text-meta text-muted-foreground block">{label}</span>
        <span className="text-body block truncate font-semibold">{value}</span>
      </span>
    </li>
  );
}

function TaskRow({
  task,
  redirectUrl,
  showTime = false,
}: {
  task: ProfileTask;
  redirectUrl: string | null;
  showTime?: boolean;
}) {
  const m = useMessages();
  const body = (
    <>
      <TaskMarker done={task.done} />
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "text-body block font-semibold",
            task.done && "text-muted-foreground line-through",
          )}
        >
          {task.title}
        </span>
        {showTime ? null : (
          <span className="text-meta text-muted-foreground block">
            {task.description}
          </span>
        )}
      </span>
      {task.done ? (
        <span className="sr-only">{m.common.done}</span>
      ) : showTime ? (
        <span className="text-eyebrow text-muted-foreground shrink-0 font-mono uppercase">
          {task.time}
        </span>
      ) : (
        <ChevronRight
          aria-hidden="true"
          className="text-muted-foreground size-4 shrink-0 rtl:-scale-x-100"
        />
      )}
    </>
  );
  if (task.done) {
    return (
      <li className="flex min-h-[52px] items-center gap-3.5 px-4 py-3">
        {body}
      </li>
    );
  }
  return (
    <li>
      <Link
        href={profileTaskHref(task.id, redirectUrl)}
        className={cn(
          "hover:bg-wash flex min-h-[52px] items-center gap-3.5 px-4 py-3 transition-colors",
          FOCUS_RING,
        )}
      >
        {body}
      </Link>
    </li>
  );
}

function Segments({ list }: { list: ProfileChecklist }) {
  return (
    <div aria-hidden="true" className="flex gap-1.5">
      {Array.from({ length: list.total }, (_, index) => (
        <span
          key={index}
          className={cn(
            "h-[3px] flex-1 rounded-full",
            index < list.done ? "bg-ink" : "bg-rule",
          )}
        />
      ))}
    </div>
  );
}

function YouAreIn({
  firstName,
  list,
  redirectUrl,
  redirectTo,
  onCompleteProfile,
}: {
  firstName: string | null;
  list: ProfileChecklist;
  redirectUrl: string | null;
  redirectTo: string;
  onCompleteProfile: () => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.webAuth.onboarding.checklist;
  return (
    <AuthScreen
      crossLink={{ href: redirectTo, label: copy.skip }}
      title={youAreInTitle(firstName, locale)}
      description={checklistBlurb(list, locale)}
    >
      <div className="flex flex-col gap-5">
        <span
          aria-hidden="true"
          className="bg-control text-on-control text-lead flex size-14 items-center justify-center rounded-xl font-semibold"
        >
          {firstName ? initials(firstName) : "?"}
        </span>
        <div className="flex flex-col gap-2.5">
          <div className="text-meta text-muted-foreground flex items-baseline justify-between">
            <span>{copy.profile}</span>
            <span className="text-eyebrow font-mono uppercase">
              {checklistCountLabel(list, locale)}
            </span>
          </div>
          <Segments list={list} />
        </div>
        <ul
          aria-label={copy.tasksLabel}
          className="border-rule divide-rule divide-y overflow-hidden rounded-[14px] border"
        >
          {list.tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              redirectUrl={redirectUrl}
              showTime
            />
          ))}
        </ul>
      </div>
      <div className="mt-auto flex flex-col gap-2.5 pt-6">
        <Button
          type="button"
          size="lg"
          className="w-full font-semibold"
          onClick={onCompleteProfile}
        >
          {copy.completeProfile}
        </Button>
        <Button
          asChild
          size="lg"
          variant="outline"
          className="border-rule bg-paper hover:bg-wash w-full font-semibold"
        >
          <Link href={redirectTo}>{copy.laterShowGames}</Link>
        </Button>
      </div>
    </AuthScreen>
  );
}

function Checklist({
  list,
  name,
  phone,
  redirectUrl,
  redirectTo,
}: {
  list: ProfileChecklist;
  name: string | null;
  phone: string | null;
  redirectUrl: string | null;
  redirectTo: string;
}) {
  const m = useMessages();
  const locale = useLocale();
  const copy = m.webAuth.onboarding.checklist;
  const doneAtSignUp = (
    [
      name ? { label: copy.nameLabel, value: name } : null,
      phone
        ? { label: copy.mobileNumberLabel, value: <bdi dir="ltr">{phone}</bdi> }
        : null,
    ] satisfies ({ label: string; value: React.ReactNode } | null)[]
  ).filter((row) => row !== null);

  return (
    <AuthScreen
      backHref={redirectTo}
      backLabel={m.common.back}
      progress={{
        step: list.done,
        total: list.total,
        label: copy.countDone(checklistCountLabel(list, locale)),
      }}
      title={copy.title}
      description={checklistBlurb(list, locale)}
    >
      <div className="flex flex-col gap-6">
        {doneAtSignUp.length > 0 ? (
          <section className="flex flex-col gap-2.5">
            <SectionHeading>{copy.doneAtSignUp}</SectionHeading>
            <ul className="border-rule divide-rule divide-y overflow-hidden rounded-[14px] border">
              {doneAtSignUp.map((row) => (
                <DoneRow key={row.label} label={row.label} value={row.value} />
              ))}
            </ul>
          </section>
        ) : null}
        <section className="flex flex-col gap-2.5">
          <SectionHeading>{copy.tasks}</SectionHeading>
          <ul className="border-rule divide-rule divide-y overflow-hidden rounded-[14px] border">
            {list.tasks.map((task) => (
              <TaskRow key={task.id} task={task} redirectUrl={redirectUrl} />
            ))}
          </ul>
        </section>
      </div>
      <div className="mt-auto flex flex-col gap-2.5 pt-6">
        <Button asChild size="lg" className="w-full font-semibold">
          <Link href={redirectTo}>{checklistCta(list, locale)}</Link>
        </Button>
      </div>
    </AuthScreen>
  );
}

function LoadedChecklist({
  state,
  fresh,
  redirectUrl,
  redirectTo,
}: {
  state: ReadyOnboardingState;
  fresh: boolean;
  redirectUrl: string | null;
  redirectTo: string;
}) {
  const locale = useLocale();
  const { user, isLoaded } = useUser();
  const [showList, setShowList] = React.useState(!fresh);

  React.useEffect(() => {
    if (showList && fresh) {
      document.getElementById("auth-screen-heading")?.focus();
    }
  }, [fresh, showList]);

  if (!isLoaded || !user) {
    return (
      <AuthScreen brand>
        <AuthLoading />
      </AuthScreen>
    );
  }

  const list = profileChecklist(
    profileChecklistInputFrom(user, state.onboardingCompletedAt),
    locale,
  );
  const name = userDisplayName(user);

  if (!showList) {
    return (
      <YouAreIn
        firstName={user.firstName}
        list={list}
        redirectUrl={redirectUrl}
        redirectTo={redirectTo}
        onCompleteProfile={() => setShowList(true)}
      />
    );
  }

  return (
    <Checklist
      list={list}
      name={name}
      phone={
        user.primaryPhoneNumber?.phoneNumber
          ? displayPhone(user.primaryPhoneNumber.phoneNumber)
          : null
      }
      redirectUrl={redirectUrl}
      redirectTo={redirectTo}
    />
  );
}

/**
 * The Profile checklist at `/onboarding`: the "You're in" screen straight
 * after sign-up (`fresh`), and the task list otherwise. Nothing here blocks
 * the product; every task saves on its own and comes back here (ADR-0049).
 */
export function ProfileChecklistScreen({
  fresh,
  redirectUrl,
  redirectTo,
}: {
  fresh: boolean;
  /** The raw `redirect_url`, carried through to every task. */
  redirectUrl: string | null;
  /** Where "Later" and "Continue to games" land. */
  redirectTo: string;
}) {
  return (
    <OnboardingStateGate>
      {(state) => (
        <LoadedChecklist
          state={state}
          fresh={fresh}
          redirectUrl={redirectUrl}
          redirectTo={redirectTo}
        />
      )}
    </OnboardingStateGate>
  );
}
