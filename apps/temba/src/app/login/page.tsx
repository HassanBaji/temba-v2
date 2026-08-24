import { SignIn } from "@clerk/nextjs";

import { AuthShell } from "~/components/auth/auth-shell";

export default function LoginPage() {
  return (
    <AuthShell>
      <SignIn routing="path" path="/login" signUpUrl="/signup" />
    </AuthShell>
  );
}
