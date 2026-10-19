/** Design sizes the shadcn primitives do not carry: 40px buttons, 36px controls, 14px dialogs, no shadows. */
export const inkButtonClass =
  "rounded-control h-10 min-h-10 px-4 text-sm font-semibold";
export const outlineButtonClass =
  "rounded-control border-border hover:bg-wash h-10 min-h-10 px-4 text-meta shadow-none";
export const controlClass =
  "rounded-block border-border focus-visible:border-ink text-meta h-9 min-h-9 px-2.5 shadow-none focus-visible:ring-0 md:text-meta";
export const dialogClass = "rounded-card border-border gap-5 shadow-none";
export const linkButtonClass =
  "text-meta text-muted-foreground hover:text-ink underline underline-offset-2 disabled:opacity-50";
