import { AuthScreen } from "~/components/auth/auth-screen";

export function InviteShell({
  children,
  wide = false,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <AuthScreen brand wide={wide}>
      {children}
    </AuthScreen>
  );
}
