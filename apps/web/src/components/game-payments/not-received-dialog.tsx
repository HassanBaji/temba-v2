"use client";

import {
  GAME_PAYMENT_NOTE_MAX_LENGTH,
  GAME_PAYMENT_RETURN_REASONS,
  type GamePaymentReturnReason,
} from "@repo/domain/game-payments";
import * as React from "react";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { useMessages } from "~/components/locale-provider";
import { ChoiceChip } from "~/components/temba/choice-chip";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

import { PaymentBox } from "./payment-card";
import { PaymentMarkIcon } from "./payment-mark";
import { PlayerTile } from "./player-tile";

export type NotReceivedTarget = {
  userId: string;
  name: string;
  image: string | null;
  claimedLine: string;
  price: string;
};

/** A short note goes back to the player (design Payments 2b). */
export function NotReceivedDialog({
  target,
  pending,
  onClose,
  onSubmit,
}: {
  target: NotReceivedTarget | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (args: {
    reason: GamePaymentReturnReason | null;
    note: string;
  }) => void;
}) {
  const m = useMessages().gamePayments.notReceivedSheet;
  const [reason, setReason] = React.useState<GamePaymentReturnReason | null>(
    "nothing_arrived",
  );
  const [note, setNote] = React.useState("");

  React.useEffect(() => {
    if (target) {
      setReason("nothing_arrived");
      setNote("");
    }
  }, [target]);

  return (
    <ResponsiveDialog
      open={target != null}
      onOpenChange={(open) => {
        if (!open && !pending) {
          onClose();
        }
      }}
    >
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{m.title}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {target?.claimedLine}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <div className="flex flex-col gap-4 px-4 md:px-0">
          {target ? (
            <PaymentBox>
              <div className="flex items-center gap-3 px-4 py-3">
                <PlayerTile name={target.name} image={target.image} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{target.name}</p>
                  <p className="text-eyebrow text-muted-foreground tabular-nums">
                    {target.price}
                  </p>
                </div>
                <PaymentMarkIcon mark="claimed" />
              </div>
            </PaymentBox>
          ) : null}
          <div className="flex flex-col gap-2">
            <p
              id="not-received-why"
              className="text-meta text-muted-foreground"
            >
              {m.why}
            </p>
            <div
              role="radiogroup"
              aria-labelledby="not-received-why"
              className="flex flex-wrap gap-1.5"
            >
              {GAME_PAYMENT_RETURN_REASONS.map((value) => {
                const selected = reason === value;
                return (
                  <ChoiceChip
                    key={value}
                    role="radio"
                    selected={selected}
                    onClick={() => setReason(selected ? null : value)}
                  >
                    {m.reasons[value]}
                  </ChoiceChip>
                );
              })}
            </div>
            <Label htmlFor="not-received-note" className="sr-only">
              {m.noteLabel}
            </Label>
            <Input
              id="not-received-note"
              placeholder={m.noteLabel}
              value={note}
              maxLength={GAME_PAYMENT_NOTE_MAX_LENGTH}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
        </div>
        <ResponsiveDialogFooter>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={pending}
            onClick={onClose}
          >
            {m.cancel}
          </Button>
          <Button
            type="button"
            className="min-h-11"
            disabled={pending}
            aria-busy={pending}
            onClick={() => onSubmit({ reason, note })}
          >
            {m.submit}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
