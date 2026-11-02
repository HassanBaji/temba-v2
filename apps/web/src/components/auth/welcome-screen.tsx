import { Phone } from "lucide-react";
import Link from "next/link";

import { AuthScreen } from "~/components/auth/auth-screen";
import { AuthTermsNote } from "~/components/auth/auth-terms-note";
import { OauthButtons } from "~/components/auth/oauth-buttons";
import { SportGlyph } from "~/components/temba/sport-glyph";
import { Button } from "~/components/ui/button";
import { TembaWordmark } from "~/components/ui/temba-wordmark";
import { authCrossLinkUrl } from "~/lib/auth-redirect";
import { SPORTS, SPORT_LABELS } from "@repo/domain/sport";

export function WelcomeScreen({ redirectUrl }: { redirectUrl: string | null }) {
  const phoneHref = authCrossLinkUrl("/login", redirectUrl);

  return (
    <AuthScreen padContent={false} variant="welcome">
      <header className="px-[26px] pt-[30px]">
        <TembaWordmark surface="ink" />
      </header>

      <div className="mt-24 px-[26px]">
        <h1 className="text-hero font-bold leading-[0.96] tracking-[-0.035em] [font-variation-settings:'wdth'_112,'wght'_700]">
          Find a game,
          <br />
          fill the court,
          <br />
          keep the score.
        </h1>
        <p className="text-body text-dim mt-5 max-w-[300px] leading-[1.5]">
          Open padel and football games near you, your regular Groups, and a
          Level that follows your results.
        </p>
      </div>

      <ul aria-label="Sports" className="mt-8 flex gap-2 px-[26px]">
        {SPORTS.map((sport) => (
          <li
            key={sport}
            className="border-dimrule bg-raised text-meta flex h-9 items-center gap-2 rounded-md border px-3.5 font-medium"
          >
            <SportGlyph sport={sport} className="size-4" />
            {SPORT_LABELS[sport]}
          </li>
        ))}
      </ul>

      <div className="mt-auto flex flex-col gap-2.5 p-[26px]">
        <Button
          asChild
          className="w-full font-semibold"
          size="lg"
          variant="inverse"
        >
          <Link href={phoneHref}>
            <Phone aria-hidden="true" />
            Continue with phone
          </Link>
        </Button>
        <OauthButtons flow="sign-in" redirectUrl={redirectUrl} surface="ink" />
        <AuthTermsNote surface="ink" className="mt-2" />
      </div>
    </AuthScreen>
  );
}
