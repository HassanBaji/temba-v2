import Link from "next/link";

import { AuthScreen } from "~/components/auth/auth-screen";
import { Button } from "~/components/ui/button";
import { TembaMark } from "~/components/ui/icons/temba-mark";
import { authCrossLinkUrl } from "~/lib/auth-redirect";

const PREVIEW_TILES = [
  { initials: "MK", level: "C+" },
  { initials: "SL", level: "C" },
  { initials: "JB", level: "C+" },
] as const;

export function WelcomeScreen({ redirectUrl }: { redirectUrl: string | null }) {
  const signUpHref = authCrossLinkUrl("/signup", redirectUrl);
  const signInHref = authCrossLinkUrl("/login", redirectUrl);

  return (
    <AuthScreen padContent={false} variant="welcome">
      <header className="flex items-center gap-[11px] px-[26px] pt-[30px]">
        <TembaMark height={26} variant="reversed" width={26} />
        <p className="font-display text-title tracking-[0.2em]">TEMBA</p>
      </header>

      <div className="mt-24 px-[26px]">
        <h1 className="text-hero font-bold leading-[0.96] tracking-[-0.035em] [font-variation-settings:'wdth'_112,'wght'_700]">
          Every match counts
          <br />
          fill the court,
          <br />
          keep the score.
        </h1>
        <p className="text-body text-dim mt-5 max-w-[300px] leading-[1.5]">
          Open games near you, your regular groups, and a level that follows
          your results.
        </p>
      </div>

      <div aria-hidden="true" className="mt-[52px] px-[26px]">
        <p className="text-eyebrow text-dim font-mono">
          TONIGHT, KARBABAD 9:00 PM
        </p>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {PREVIEW_TILES.map((tile) => (
            <div
              key={tile.initials}
              className="bg-raised flex h-[66px] flex-col items-center justify-center gap-1 rounded-md"
            >
              <span className="text-sm font-semibold">{tile.initials}</span>
              <span className="text-eyebrow text-dim">{tile.level}</span>
            </div>
          ))}
          <div className="hatch hatch-on-ink text-eyebrow text-paper border-dimrule flex h-[66px] items-center justify-center rounded-md border">
            1 open
          </div>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-2.5 p-[26px]">
        <Button
          asChild
          className="bg-paper text-ink hover:bg-rule w-full font-semibold"
          size="auth"
        >
          <Link href={signUpHref}>Create account</Link>
        </Button>
        <Button
          asChild
          className="border-dimrule bg-ink text-paper hover:bg-raised w-full border font-semibold"
          size="auth"
          variant="outline"
        >
          <Link href={signInHref}>Sign in</Link>
        </Button>
        <p className="text-eyebrow text-dim mt-2 text-center leading-[1.6]">
          By continuing you agree to the{" "}
          <Link className="text-paper underline" href="/terms">
            Terms
          </Link>{" "}
          and{" "}
          <Link className="text-paper underline" href="/privacy">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </AuthScreen>
  );
}
