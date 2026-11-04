import { type Metadata } from "next";

import { AuthScreen } from "~/components/auth/auth-screen";
import { getRequestLocale, getRequestMessages } from "~/lib/request-locale";
import {
  TERMS_SECTIONS,
  TERMS_UPDATED,
  type TermsClause,
} from "@repo/domain/terms";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getRequestMessages();
  return { title: m.webAuth.legal.termsTitle };
}

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
        <ul className="text-body text-muted-foreground list-disc space-y-1 ps-5 leading-[1.55]">
          {clause.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default async function TermsPage() {
  const m = await getRequestMessages();
  const locale = await getRequestLocale();
  return (
    <AuthScreen
      wide
      backHref="/"
      backLabel={m.common.back}
      eyebrow={m.webAuth.legal.lastUpdated(TERMS_UPDATED)}
      title={m.webAuth.legal.termsTitle}
      description={m.webAuth.legal.termsDescription}
    >
      {locale === "en" ? null : (
        <p className="text-body text-ink mb-7 font-semibold">
          {m.webAuth.legal.englishGoverns}
        </p>
      )}
      <div lang="en" dir="ltr" className="flex flex-col gap-7">
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
