"use client";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { CloseButton } from "~/components/ui/nav-icon-button";

/** A drawer on phones and a dialog from `sm` up: title, its line, close, a scrolling body and a footer. */
export function AlbumSheet({
  open,
  onClose,
  title,
  subtitle,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string | null;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
    >
      <ResponsiveDialogContent
        className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[460px]"
        showCloseButton={false}
      >
        <div className="flex items-start justify-between gap-4 px-[22px] pt-[22px]">
          <ResponsiveDialogHeader className="min-w-0 p-0 text-start group-data-[vaul-drawer-direction=bottom]/drawer-content:text-start">
            <ResponsiveDialogTitle className="font-expanded text-h1 leading-none tracking-[-0.03em]">
              {title}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription
              className={subtitle ? "text-meta leading-relaxed" : "sr-only"}
            >
              {subtitle ?? title}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <CloseButton variant="boxed" onClick={onClose} />
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-[22px] py-5">
          {children}
        </div>
        {footer ? (
          <div className="mt-auto flex shrink-0 flex-col gap-2.5 px-[22px] pb-[max(22px,env(safe-area-inset-bottom))] pt-1">
            {footer}
          </div>
        ) : null}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
