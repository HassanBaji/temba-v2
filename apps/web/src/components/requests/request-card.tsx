"use client";

import { Check, Users } from "lucide-react";
import Link from "next/link";

import { UserAvatar } from "~/components/common/user-avatar";
import { useLocale, useMessages } from "~/components/locale-provider";
import { SportGlyph } from "~/components/temba/sport-glyph";
import { Button } from "~/components/ui/button";
import { Surface } from "~/components/ui/surface";
import { useNow } from "~/hooks/use-now";
import { cn } from "~/lib/utils";
import {
  waitingRequestCard,
  waitingRequestDoneText,
  type RequestRow,
  type WaitingRequest,
} from "@repo/domain/waiting-requests";

import { useRequestAnswers } from "./request-answers-provider";

const MONOGRAM =
  "border-rule rounded-lg border text-meta font-semibold [&_[data-slot=avatar-fallback]]:rounded-[inherit] [&_[data-slot=avatar-fallback]]:bg-paper [&_[data-slot=avatar-fallback]]:text-ink";

function SeatIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M12 5v14" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

/** Design 1d: who asks, what they want, why it reached you, and the answer in one tap. */
export function RequestCard({
  request,
  onApprove,
  onDecline,
  nameHref,
  extra,
}: {
  request: WaitingRequest;
  onApprove: () => void;
  onDecline: () => void;
  nameHref?: string;
  extra?: React.ReactNode;
}) {
  const m = useMessages();
  const locale = useLocale();
  const now = useNow();
  const card = waitingRequestCard(request, locale, now);
  const WantIcon = card.wantIcon === "seat" ? SeatIcon : Users;
  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-start gap-3">
        <UserAvatar
          name={card.name}
          image={card.image}
          size="lg"
          className={MONOGRAM}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {nameHref ? (
              <Link
                href={nameHref}
                dir="auto"
                className="text-body focus-visible:ring-ring/50 min-w-0 truncate rounded-sm font-semibold outline-none hover:underline focus-visible:ring-[3px]"
              >
                {card.name}
              </Link>
            ) : (
              <span
                dir="auto"
                className="text-body min-w-0 truncate font-semibold"
              >
                {card.name}
              </span>
            )}
            {card.level ? (
              <span className="text-muted-foreground inline-flex shrink-0 items-center gap-1">
                <SportGlyph sport={card.sport} className="size-3.5" />
                <span dir="ltr" className="font-expanded text-meta">
                  {card.level}
                </span>
              </span>
            ) : null}
            <span className="ms-auto flex shrink-0 items-baseline gap-1.5 ps-1.5">
              <span className="text-eyebrow text-muted-foreground">
                {card.clock.label}
              </span>
              <span className="text-meta whitespace-nowrap font-semibold">
                {card.clock.value}
              </span>
            </span>
          </div>
          <p className="mt-1 flex items-start gap-2">
            <WantIcon
              aria-hidden="true"
              className="mt-[3px] size-[15px] shrink-0"
            />
            <span dir="auto" className="min-w-0">
              {card.want}
            </span>
          </p>
          <p
            dir="auto"
            className="text-eyebrow text-muted-foreground mt-1 leading-[1.45]"
          >
            {card.context}
          </p>
          {card.note ? (
            <p
              dir="auto"
              className="bg-wash text-meta mt-2 rounded-md px-3 py-2"
            >
              {card.note}
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          className="flex-1 rounded-lg font-semibold"
          aria-label={m.requests.approveName(card.name)}
          onClick={onApprove}
        >
          {m.requests.approve}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="border-rule bg-paper rounded-lg px-5 font-semibold shadow-none"
          aria-label={m.requests.declineName(card.name)}
          onClick={onDecline}
        >
          {m.requests.decline}
        </Button>
      </div>
      {extra}
    </div>
  );
}

/** What an answered request leaves behind, with Undo until the answer is sent. */
export function RequestDoneLine({
  row,
  onUndo,
}: {
  row: RequestRow & { answer: NonNullable<RequestRow["answer"]> };
  onUndo: () => void;
}) {
  const m = useMessages();
  const locale = useLocale();
  const name = waitingRequestCard(row.request, locale).name;
  return (
    <div className="flex min-h-[50px] items-center gap-2.5 px-4 py-2">
      <span
        aria-hidden="true"
        className="bg-wash flex size-[26px] shrink-0 items-center justify-center rounded-md"
      >
        <Check className="size-3.5" />
      </span>
      <p role="status" className="text-meta min-w-0 flex-1">
        <span dir="auto" className="font-semibold">
          {name}
        </span>{" "}
        <span className="text-muted-foreground">
          {waitingRequestDoneText(row.request, row.answer.decision, locale)}
        </span>
      </p>
      {row.answer.committed ? null : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-me-2 shrink-0 font-semibold"
          aria-label={m.requests.undoName(name)}
          onClick={onUndo}
        >
          {m.requests.undo}
        </Button>
      )}
    </div>
  );
}

/** One request wherever it shows: the card while it waits, the done line once answered. */
export function RequestRowItem({
  row,
  nameHref,
  extra,
}: {
  row: RequestRow;
  nameHref?: string;
  extra?: React.ReactNode;
}) {
  const { answer, undo } = useRequestAnswers();
  const { request } = row;
  if (row.answer) {
    return (
      <RequestDoneLine
        row={{ request, answer: row.answer }}
        onUndo={() => undo(request.id)}
      />
    );
  }
  return (
    <RequestCard
      request={request}
      nameHref={nameHref}
      extra={extra}
      onApprove={() => answer(request, "approve")}
      onDecline={() => answer(request, "decline")}
    />
  );
}

/** The bordered list requests sit in, one hairline between rows. */
export function RequestList({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Surface
      radius="card"
      className={cn(
        "border-rule divide-rule divide-y overflow-hidden border",
        className,
      )}
    >
      {children}
    </Surface>
  );
}

export function RequestsFootnote({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-eyebrow text-muted-foreground leading-[1.45]">
      {children}
    </p>
  );
}
