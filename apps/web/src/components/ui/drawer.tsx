"use client";

import * as React from "react";
import { XIcon } from "lucide-react";
import { Drawer as DrawerPrimitive } from "vaul";

import { useMessages } from "~/components/locale-provider";
import { cn } from "~/lib/utils";

function Drawer({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  return <DrawerPrimitive.Root data-slot="drawer" {...props} />;
}

function DrawerTrigger({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerClose({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      data-slot="drawer-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 bg-ink/45 fixed inset-0 z-[60]",
        "motion-reduce:animate-none motion-reduce:transition-opacity motion-reduce:duration-100",
        className,
      )}
      {...props}
    />
  );
}

/**
 * The bottom sheet every action opens in on a phone (design "Group create
 * and edit flow" 02): a scrim, a grabber, then the sheet's own rows.
 */
function DrawerContent({
  className,
  children,
  showCloseButton = false,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content> & {
  showCloseButton?: boolean;
}) {
  const m = useMessages();
  return (
    <DrawerPortal data-slot="drawer-portal">
      <DrawerOverlay />
      <DrawerPrimitive.Content
        data-slot="drawer-content"
        className={cn(
          "group/drawer-content bg-background fixed z-[60] flex h-auto flex-col",
          "data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80vh] data-[vaul-drawer-direction=top]:rounded-b-[20px]",
          "data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[90vh] data-[vaul-drawer-direction=bottom]:rounded-t-[20px] data-[vaul-drawer-direction=bottom]:pb-[max(28px,env(safe-area-inset-bottom))]",
          "data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:end-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:border-s data-[vaul-drawer-direction=right]:sm:max-w-sm",
          "data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:start-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:border-e data-[vaul-drawer-direction=left]:sm:max-w-sm",
          className,
        )}
        {...props}
      >
        <div
          aria-hidden="true"
          className="bg-rule mx-auto mb-1.5 mt-2.5 hidden h-1 w-9 shrink-0 rounded-full group-data-[vaul-drawer-direction=bottom]/drawer-content:block"
        />
        {children}
        {showCloseButton ? (
          <DrawerPrimitive.Close
            data-slot="drawer-close"
            className="bg-wash text-ink focus-visible:ring-ring/50 absolute end-4 top-4 inline-flex size-9 items-center justify-center rounded-full outline-none focus-visible:ring-[3px]"
          >
            <XIcon aria-hidden="true" className="size-4" />
            <span className="sr-only">{m.common.close}</span>
          </DrawerPrimitive.Close>
        ) : null}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn("flex flex-col gap-2 p-4 text-start", className)}
      {...props}
    />
  );
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  );
}

function DrawerTitle({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn(
        "font-expanded text-foreground text-h2 leading-none tracking-[-0.03em]",
        className,
      )}
      {...props}
    />
  );
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-muted-foreground text-body", className)}
      {...props}
    />
  );
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
