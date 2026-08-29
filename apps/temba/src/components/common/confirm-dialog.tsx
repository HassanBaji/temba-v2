"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { Button } from "~/components/ui/button";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  variant = "destructive",
  pending = false,
  onConfirm,
  restoreFocusRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: "destructive" | "default";
  pending?: boolean;
  onConfirm: () => void | Promise<void>;
  restoreFocusRef?: React.RefObject<HTMLElement | null>;
}) {
  const [submitting, setSubmitting] = React.useState(false);
  const busy = pending || submitting;

  async function handleConfirm() {
    if (busy) {
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        if (busy && !next) {
          return;
        }
        onOpenChange(next);
      }}
    >
      <ResponsiveDialogContent
        restoreFocusRef={restoreFocusRef}
        showCloseButton={false}
      >
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>
          {description ? (
            <ResponsiveDialogDescription>
              {description}
            </ResponsiveDialogDescription>
          ) : null}
        </ResponsiveDialogHeader>
        <ResponsiveDialogFooter>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === "destructive" ? "destructive" : "default"}
            className="min-h-11"
            disabled={busy}
            aria-busy={busy}
            onClick={() => {
              void handleConfirm();
            }}
          >
            {busy ? `${confirmLabel}…` : confirmLabel}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
