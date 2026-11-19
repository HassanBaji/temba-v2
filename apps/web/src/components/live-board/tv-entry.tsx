"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import {
  LIVE_BOARD_TV_NAME_MAX,
  parseBoardCode,
} from "@repo/domain/live-board";

import { AuthScreen } from "~/components/auth/auth-screen";
import { useMessages } from "~/components/locale-provider";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

import { readTvName, writeTvName } from "./tv-storage";

export type TvEntryNotice =
  | "stopped"
  | "disconnected"
  | "closed"
  | "not_found"
  | "failed";

/**
 * Where a TV starts: the six-digit Board code from the Organizer's phone,
 * and a name for the screen if the room has more than one.
 */
export function TvEntry({
  initialCode,
  notice,
}: {
  initialCode?: string;
  notice?: TvEntryNotice;
}) {
  const m = useMessages().liveBoard.tv;
  const router = useRouter();
  const [code, setCode] = React.useState(initialCode ?? "");
  const [name, setName] = React.useState("");
  const [invalid, setInvalid] = React.useState(false);
  const [opening, setOpening] = React.useState(false);

  React.useEffect(() => setName(readTvName()), []);

  const noticeText =
    notice === "not_found"
      ? m.notFound
      : notice === "failed"
        ? m.failed
        : notice
          ? m.ended[notice]
          : null;
  const error = invalid ? m.invalid : null;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = parseBoardCode(code);
    if (!parsed) {
      setInvalid(true);
      return;
    }
    writeTvName(name.trim());
    setOpening(true);
    router.push(`/tv/${parsed}`);
  }

  return (
    <AuthScreen
      brand
      description={
        notice && notice !== "not_found" && notice !== "failed"
          ? m.endedLead
          : m.lead
      }
      title={m.title}
    >
      <form className="flex flex-col gap-5" noValidate onSubmit={submit}>
        {noticeText ? (
          <p
            className="border-rule text-body rounded-lg border px-4 py-3"
            role="status"
          >
            {noticeText}
          </p>
        ) : null}
        <div className="flex flex-col gap-2">
          <Label htmlFor="tv-code">{m.codeLabel}</Label>
          <Input
            aria-describedby={error ? "tv-code-error" : undefined}
            aria-invalid={error ? true : undefined}
            autoComplete="off"
            autoFocus
            className="font-expanded text-h1 h-16 text-center tracking-[0.12em]"
            dir="ltr"
            id="tv-code"
            inputMode="numeric"
            maxLength={12}
            onChange={(event) => {
              setCode(event.target.value);
              setInvalid(false);
            }}
            placeholder="000 000"
            size="lg"
            value={code}
          />
          {error ? (
            <p className="text-destructive text-meta" id="tv-code-error">
              {error}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="tv-name">{m.nameLabel}</Label>
          <Input
            autoComplete="off"
            id="tv-name"
            maxLength={LIVE_BOARD_TV_NAME_MAX}
            onChange={(event) => setName(event.target.value)}
            placeholder={m.namePlaceholder}
            size="lg"
            value={name}
          />
        </div>
        <Button
          pending={opening}
          pendingLabel={m.opening}
          size="lg"
          type="submit"
        >
          {m.open}
        </Button>
      </form>
    </AuthScreen>
  );
}
