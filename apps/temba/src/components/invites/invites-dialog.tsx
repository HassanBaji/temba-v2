"use client";

import type { ComponentProps, ReactNode, RefObject } from "react";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { InviteLinkPanel } from "~/components/invites/invite-link-panel";
import { LookupInvitePanel } from "~/components/invites/lookup-invite-panel";

export const INVITES_DIALOG_DESCRIPTION =
  "Send a Lookup invite to an existing User, or copy an Invite link. Invitees accept on Invites.";

function InviteSection({
  title,
  note,
  children,
}: {
  title: string;
  note?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h3 className="text-title font-semibold">{title}</h3>
        {note ? (
          <p className="text-meta text-muted-foreground">{note}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

type LookupSectionProps = ComponentProps<typeof LookupInvitePanel> & {
  note?: ReactNode;
};

function LookupSection({ note, ...panel }: LookupSectionProps) {
  return (
    <InviteSection title="Lookup invite" note={note}>
      <LookupInvitePanel {...panel} />
    </InviteSection>
  );
}

export function InvitesDialog({
  open,
  onOpenChange,
  restoreFocusRef,
  title = "Invite",
  description = INVITES_DIALOG_DESCRIPTION,
  lookup,
  link,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restoreFocusRef?: RefObject<HTMLElement | null>;
  title?: string;
  description?: ReactNode;
  /** `note` says who may Lookup whom here. Omit to hide the section. */
  lookup?: LookupSectionProps | null;
  /** Pass the short URL when the context has one. Omit to hide the section. */
  link?: ComponentProps<typeof InviteLinkPanel> | null;
}) {
  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent restoreFocusRef={restoreFocusRef}>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {description}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-6 px-4 pb-4 md:px-0 md:pb-0">
          {lookup ? <LookupSection {...lookup} /> : null}

          {link ? (
            <InviteSection title="Invite link">
              <InviteLinkPanel {...link} />
            </InviteSection>
          ) : null}
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
