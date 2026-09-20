export function SettingsFooter({
  displayName,
  phoneNumber,
  onSignOut,
}: {
  displayName: string;
  phoneNumber?: string | null;
  onSignOut: () => void;
}) {
  const identity =
    phoneNumber != null && phoneNumber !== ""
      ? `${displayName} · ${phoneNumber}`
      : displayName;

  return (
    <div className="border-rule mt-auto flex flex-col gap-2.5 border-t pb-[26px] pt-5">
      <button
        type="button"
        className="border-rule bg-paper text-ink hover:bg-wash focus-visible:ring-ring/50 h-[52px] w-full rounded-lg border text-[15px] font-medium outline-none focus-visible:ring-[3px]"
        onClick={onSignOut}
      >
        Sign out
      </button>
      <p className="text-muted-foreground text-center font-mono text-[11px] uppercase">
        {identity}
      </p>
    </div>
  );
}
