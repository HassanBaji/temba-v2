import { SignUp } from "@clerk/nextjs";

import { AuthShell } from "~/components/auth/auth-shell";

export default function SignupPage() {
  return (
    <AuthShell>
      <SignUp routing="path" path="/signup" signInUrl="/login" />
    </AuthShell>
  );
}
