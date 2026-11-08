import { AuthScreen } from "~/components/auth/auth-screen";
import { LanguageToggle } from "~/components/common/language-toggle";
import { TembaWordmark } from "~/components/ui/temba-wordmark";

export function InviteShell({
  children,
  wide = false,
  tone = "paper",
}: {
  children: React.ReactNode;
  wide?: boolean;
  /** A Game link reads as the Game itself, on the ink page (design "Join via link" 3a). */
  tone?: "paper" | "ink";
}) {
  if (tone === "ink") {
    return (
      <AuthScreen variant="welcome" padContent={false}>
        <div className="max-w-column mx-auto flex w-full flex-1 flex-col px-[26px]">
          <header className="flex items-center justify-between pb-5 pt-[22px]">
            <TembaWordmark surface="ink" />
            <LanguageToggle />
          </header>
          {children}
        </div>
      </AuthScreen>
    );
  }
  return (
    <AuthScreen brand wide={wide}>
      {children}
    </AuthScreen>
  );
}
