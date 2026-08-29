"use client";

import * as React from "react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/drawer";
import { useIsMobile } from "~/hooks/use-mobile";
import { cn } from "~/lib/utils";

const ResponsiveDialogContext = React.createContext<{
  isMobile: boolean;
}>({ isMobile: false });

function useResponsiveDialog() {
  return React.useContext(ResponsiveDialogContext);
}

export function ResponsiveDialog({
  children,
  ...props
}: React.ComponentProps<typeof Dialog>) {
  const isMobile = useIsMobile();
  const Root = isMobile ? Drawer : Dialog;

  return (
    <ResponsiveDialogContext.Provider value={{ isMobile }}>
      <Root data-slot="responsive-dialog" {...props}>
        {children}
      </Root>
    </ResponsiveDialogContext.Provider>
  );
}

export function ResponsiveDialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogTrigger>) {
  const { isMobile } = useResponsiveDialog();
  const Trigger = isMobile ? DrawerTrigger : DialogTrigger;
  return <Trigger data-slot="responsive-dialog-trigger" {...props} />;
}

export function ResponsiveDialogClose({
  ...props
}: React.ComponentProps<typeof DialogClose>) {
  const { isMobile } = useResponsiveDialog();
  const Close = isMobile ? DrawerClose : DialogClose;
  return <Close data-slot="responsive-dialog-close" {...props} />;
}

export function ResponsiveDialogContent({
  className,
  children,
  restoreFocusRef,
  onCloseAutoFocus,
  showCloseButton,
  ...props
}: React.ComponentProps<typeof DialogContent> & {
  restoreFocusRef?: React.RefObject<HTMLElement | null>;
}) {
  const { isMobile } = useResponsiveDialog();

  function handleCloseAutoFocus(event: Event) {
    if (restoreFocusRef?.current) {
      event.preventDefault();
      restoreFocusRef.current.focus();
    }
    onCloseAutoFocus?.(event);
  }

  if (isMobile) {
    return (
      <DrawerContent
        data-slot="responsive-dialog-content"
        className={cn(
          "motion-reduce:transition-opacity motion-reduce:duration-100",
          className,
        )}
        {...props}
      >
        {children}
      </DrawerContent>
    );
  }

  return (
    <DialogContent
      data-slot="responsive-dialog-content"
      className={className}
      showCloseButton={showCloseButton}
      onCloseAutoFocus={handleCloseAutoFocus}
      {...props}
    >
      {children}
    </DialogContent>
  );
}

export function ResponsiveDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { isMobile } = useResponsiveDialog();
  const Header = isMobile ? DrawerHeader : DialogHeader;
  return (
    <Header
      data-slot="responsive-dialog-header"
      className={className}
      {...props}
    />
  );
}

export function ResponsiveDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { isMobile } = useResponsiveDialog();
  const Footer = isMobile ? DrawerFooter : DialogFooter;
  return (
    <Footer
      data-slot="responsive-dialog-footer"
      className={className}
      {...props}
    />
  );
}

export function ResponsiveDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogTitle>) {
  const { isMobile } = useResponsiveDialog();
  const Title = isMobile ? DrawerTitle : DialogTitle;
  return (
    <Title
      data-slot="responsive-dialog-title"
      className={className}
      {...props}
    />
  );
}

export function ResponsiveDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogDescription>) {
  const { isMobile } = useResponsiveDialog();
  const Description = isMobile ? DrawerDescription : DialogDescription;
  return (
    <Description
      data-slot="responsive-dialog-description"
      className={className}
      {...props}
    />
  );
}
