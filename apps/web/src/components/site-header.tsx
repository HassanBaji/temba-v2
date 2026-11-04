"use client";

import { useMessages } from "~/components/locale-provider";
import { Separator } from "~/components/ui/separator";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { AuthHeaderControls } from "~/components/auth-header-controls";

export function SiteHeader({ title }: { title?: string }) {
  const m = useMessages();
  return (
    <header className="h-(--header-height) group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) flex shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ms-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-lead font-medium">{title ?? m.common.home}</h1>
        <div className="ms-auto flex items-center gap-2">
          <AuthHeaderControls />
        </div>
      </div>
    </header>
  );
}
