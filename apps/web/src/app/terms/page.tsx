import { type Metadata } from "next";

import { AuthScreen } from "~/components/auth/auth-screen";
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
        <ul className="text-body text-muted-foreground list-disc space-y-1 ps-5 leading-[1.55]">
          {clause.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default function TermsPage() {
  return (
    <AuthScreen
      wide
      backHref="/"
      backLabel="Back"
      eyebrow={`Last updated ${TERMS_UPDATED}`}
      title="Terms and Conditions"
      description="What you agree to when you create an account or use Temba."
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
