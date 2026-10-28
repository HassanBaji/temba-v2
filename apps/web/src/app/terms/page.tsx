import { type Metadata } from "next";
import Link from "next/link";

import { AuthScreen } from "~/components/auth/auth-screen";
import { Button } from "~/components/ui/button";
import { authCrossLinkUrl } from "~/lib/auth-redirect";
import { safeInternalRedirect } from "@repo/domain/safe-internal-redirect";
import {
  TERMS_SECTIONS,
  TERMS_UPDATED,
  type TermsClause,
} from "@repo/domain/terms";

export const metadata: Metadata = {
  title: "Terms and Conditions",
};

function Clause({ clause }: { clause: TermsClause }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-body text-muted-foreground leading-[1.55]">
        {clause.label ? (
          <span className="text-ink font-semibold">{clause.label} </span>
        ) : null}
        {clause.text}
      </p>
      {clause.bullets ? (
        <ul className="text-body text-muted-foreground list-disc space-y-1 pl-5 leading-[1.55]">
          {clause.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default async function TermsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; redirect_url?: string }>;
}) {
  const params = await searchParams;
  const fromSignUp = params.from === "signup";
  const redirectUrl = safeInternalRedirect(params.redirect_url);
  const signUpHref = authCrossLinkUrl("/signup", redirectUrl);

  return (
    <AuthScreen
      wide
      backHref={fromSignUp ? signUpHref : "/"}
      backLabel="Back"
      eyebrow={`Last updated ${TERMS_UPDATED}`}
      title="Terms and Conditions"
      description="What you agree to when you create an account or use Temba."
      footer={
        fromSignUp ? (
          <Button asChild size="lg" className="w-full font-semibold">
            <Link
              href={`${signUpHref}${signUpHref.includes("?") ? "&" : "?"}terms=accepted`}
            >
              Agree and continue
            </Link>
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-7">
        {TERMS_SECTIONS.map((section) => (
          <section key={section.number} className="flex flex-col gap-2.5">
            <h2 className="text-lead font-semibold">
              {section.number}. {section.title}
            </h2>
            {section.clauses.map((clause, index) => (
              <Clause key={clause.label ?? index} clause={clause} />
            ))}
          </section>
        ))}
      </div>
    </AuthScreen>
  );
}
