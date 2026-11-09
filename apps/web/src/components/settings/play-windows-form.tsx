"use client";

import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { useMessages } from "~/components/locale-provider";
import {
  SETTINGS_PATH,
  SettingsScreen,
} from "~/components/settings/settings-screen";
import { Button } from "~/components/ui/button";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { Skeleton } from "~/components/ui/skeleton";
import { Switch } from "~/components/ui/switch";
import { globalFormErrorMessage } from "~/lib/form-mutation-error";
import { cn } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";
import { OWN_ERROR_UI } from "~/trpc/query-client";
import {
  PLAY_WINDOW_DAYS,
  PLAY_WINDOW_PARTS,
  playWindow,
  type PlayWindow,
} from "@repo/domain/profile-details";

type Details = RouterOutputs["users"]["profileDetails"];

function Form({ details }: { details: Details }) {
  const m = useMessages();
  const copy = m.you.playWindows;
  const router = useRouter();
  const utils = api.useUtils();
  const [windows, setWindows] = React.useState<PlayWindow[]>(
    details.playWindows,
  );
  const [seatAlerts, setSeatAlerts] = React.useState(details.seatAlerts);
  const save = api.users.setPlayWindows.useMutation({
    meta: OWN_ERROR_UI,
    onSuccess: async () => {
      toast.success(copy.saved);
      await utils.users.profileDetails.invalidate();
      router.push(SETTINGS_PATH);
    },
  });
  const pending = save.isPending || save.isSuccess;

  function toggle(value: PlayWindow) {
    setWindows((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  return (
    <form
      className="flex flex-col gap-7"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (!pending) {
          save.mutate({ playWindows: windows, seatAlerts });
        }
      }}
    >
      <div className="flex flex-col gap-2.5">
        <h2 className="font-expanded text-h1 text-ink leading-[1.05]">
          {copy.heading}
        </h2>
        <p className="text-body text-muted-foreground leading-[1.5]">
          {copy.body}
        </p>
      </div>

      <FormErrorSummary message={globalFormErrorMessage(save.error)} />

      <div className="flex flex-col gap-3.5">
        <div
          role="group"
          aria-label={copy.title}
          className="grid grid-cols-[72px_repeat(3,minmax(0,1fr))] items-center gap-1.5"
        >
          <span />
          {PLAY_WINDOW_PARTS.map((part) => (
            <span
              key={part}
              aria-hidden="true"
              className="text-muted-foreground text-center font-mono text-[11px] uppercase"
            >
              {copy.parts[part]}
            </span>
          ))}
          {PLAY_WINDOW_DAYS.map((day) => (
            <React.Fragment key={day}>
              <span
                aria-hidden="true"
                className="text-meta text-muted-foreground"
              >
                {copy.days[day]}
              </span>
              {PLAY_WINDOW_PARTS.map((part) => {
                const value = playWindow(day, part);
                const on = windows.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    aria-label={copy.cellSpoken(
                      copy.days[day],
                      copy.parts[part],
                    )}
                    disabled={pending}
                    onClick={() => toggle(value)}
                    className={cn(
                      "focus-visible:ring-ring/50 flex h-[52px] items-center justify-center rounded-[10px] border outline-none focus-visible:ring-[3px] disabled:opacity-60",
                      on
                        ? "border-ink bg-control text-on-control"
                        : "border-rule bg-paper hover:bg-wash",
                    )}
                  >
                    {on ? (
                      <Check aria-hidden="true" className="size-4" />
                    ) : null}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
        <p className="text-eyebrow text-muted-foreground leading-[1.5]">
          {copy.note}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3.5">
        <div className="min-w-0 flex-1">
          <p id="play-windows-alerts" className="text-body text-ink">
            {copy.seatAlerts}
          </p>
          <p
            id="play-windows-alerts-note"
            className="text-eyebrow text-muted-foreground leading-[1.5]"
          >
            {copy.seatAlertsNote}
          </p>
        </div>
        <Switch
          aria-labelledby="play-windows-alerts"
          aria-describedby="play-windows-alerts-note"
          checked={seatAlerts}
          onCheckedChange={setSeatAlerts}
          disabled={pending}
        />
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full font-semibold"
        pending={pending}
        pendingLabel={m.common.saving}
      >
        {copy.save}
      </Button>
    </form>
  );
}

/** When you play: weekday and weekend by morning, afternoon, evening. */
export function PlayWindowsScreen() {
  const m = useMessages();
  const details = api.users.profileDetails.useQuery();

  return (
    <SettingsScreen title={m.you.playWindows.title} backHref={SETTINGS_PATH}>
      {details.data ? (
        <Form details={details.data} />
      ) : (
        <div aria-busy="true" className="flex flex-col gap-6">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-[130px] w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      )}
    </SettingsScreen>
  );
}
