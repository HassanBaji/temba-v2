"use client";

import { useEffect, useState } from "react";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { Button } from "~/components/ui/button";
import { FORM_INPUT } from "~/components/groups/group-form-parts";
import { useLocale } from "~/components/locale-provider";
import {
  groupDeleteNameMatches,
  groupDeleteSheetCopy,
} from "@repo/domain/group-settings";

/** Design "Group create and edit flow" 04: type the name, then delete. */
export function DeleteGroupSheet({
  open,
  name,
  gameCount,
  memberCount,
  seasonCount,
  pending,
  error,
  onDelete,
  onOpenChange,
  restoreFocusRef,
}: {
  open: boolean;
  name: string | null;
  gameCount: number;
  memberCount: number;
  seasonCount: number;
  pending: boolean;
  error?: string | null;
  onDelete: () => void;
  onOpenChange: (open: boolean) => void;
  restoreFocusRef?: React.RefObject<HTMLElement | null>;
}) {
  const locale = useLocale();
  const [typed, setTyped] = useState("");
  useEffect(() => {
    if (open) {
      setTyped("");
    }
  }, [open]);
  const copy = groupDeleteSheetCopy({
    name,
    gameCount,
    memberCount,
    seasonCount,
    locale,
  });
  const matches = groupDeleteNameMatches(name, typed, locale);

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        if (pending && !next) {
          return;
        }
        onOpenChange(next);
      }}
    >
      <ResponsiveDialogContent
        showCloseButton={false}
        restoreFocusRef={restoreFocusRef}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (matches && !pending) {
              onDelete();
            }
          }}
          className="flex flex-col gap-[18px]"
        >
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{copy.title}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {copy.description}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <div className="flex flex-col gap-[18px] px-4 md:px-0">
            <dl className="border-rule divide-rule grid grid-cols-3 divide-x overflow-hidden rounded-[12px] border">
              {copy.stats.map((stat) => (
                <div
                  key={stat.label}
                  className="flex flex-col gap-0.5 px-3.5 py-3"
                >
                  <dd className="font-expanded text-h2 leading-none tracking-[-0.03em]">
                    {stat.value}
                  </dd>
                  <dt className="text-eyebrow text-muted-foreground">
                    {stat.label}
                  </dt>
                </div>
              ))}
            </dl>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="delete-group-confirm"
                className="text-meta text-muted-foreground"
              >
                {copy.confirmPrompt}
              </label>
              <input
                id="delete-group-confirm"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                placeholder={copy.confirmPlaceholder}
                autoComplete="off"
                autoCapitalize="off"
                disabled={pending}
                className={FORM_INPUT}
              />
            </div>
            {error ? (
              <p role="alert" className="text-meta font-medium">
                {error}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 px-4 pb-4 md:px-0 md:pb-0">
            <Button
              type="submit"
              size="lg"
              variant="destructive"
              pending={pending}
              disabled={!matches}
              className="w-full font-semibold"
            >
              {copy.deleteLabel}
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              disabled={pending}
              onClick={() => onOpenChange(false)}
              className="w-full font-semibold"
            >
              {copy.keepLabel}
            </Button>
          </div>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
