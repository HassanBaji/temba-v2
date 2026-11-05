import { useUser } from "@clerk/expo";
import { splitClerkAuthError } from "@repo/domain/clerk-auth-error";
import { useState } from "react";

import { fieldError } from "../auth/clerk-forms";
import { FormErrorSummary } from "../auth/form-error-summary";
import { PasswordField } from "../auth/password-field";
import { passwordMeetsMinimum } from "../auth/password-strength";
import { useLocale, useMessages } from "../i18n/locale-provider";
import type { SplitFormError } from "../lib/form-error";
import { Button } from "../primitives/button";
import { Screen } from "../primitives/screen";
import { ScreenHeader, useLeaveScreen } from "../primitives/screen-header";
import { useToast } from "../primitives/toast";

/**
 * Changes the signed-in User's Clerk password. An account that signed up
 * with a code has no password yet, so it only asks for the new one.
 */
export function PasswordScreen() {
  const m = useMessages();
  const locale = useLocale();
  const toast = useToast();
  const leave = useLeaveScreen("/profile/settings");
  const { user } = useUser();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [pending, setPending] = useState(false);
  const [split, setSplit] = useState<SplitFormError | null>(null);
  const hasPassword = user?.passwordEnabled ?? false;
  const ready =
    passwordMeetsMinimum(next) && (!hasPassword || current.length > 0);

  async function onSave() {
    if (!user || pending || !ready) {
      return;
    }
    setPending(true);
    setSplit(null);
    try {
      await user.updatePassword({
        newPassword: next,
        currentPassword: hasPassword ? current : undefined,
        signOutOfOtherSessions: true,
      });
      toast.show(m.mobileYou.password.saved);
      leave();
    } catch (error) {
      setSplit(splitClerkAuthError(error, locale));
      setPending(false);
    }
  }

  return (
    <Screen>
      <ScreenHeader
        nav="back"
        fallback="/profile/settings"
        title={m.you.settings.passwordSub}
      />
      <FormErrorSummary message={split?.globalMessage} />
      {hasPassword ? (
        <PasswordField
          label={m.mobileYou.password.current}
          autoComplete="current-password"
          textContentType="password"
          value={current}
          onChangeText={setCurrent}
          editable={!pending}
          error={fieldError(split, "current_password", "currentPassword")}
        />
      ) : null}
      <PasswordField
        label={m.mobileHome.fields.newPassword}
        autoComplete="new-password"
        textContentType="newPassword"
        strength
        value={next}
        onChangeText={setNext}
        onSubmitEditing={() => void onSave()}
        editable={!pending}
        error={fieldError(split, "new_password", "password", "newPassword")}
      />
      <Button
        label={m.mobileYou.password.save}
        size="lg"
        pending={pending}
        disabled={!ready}
        onPress={() => void onSave()}
      />
    </Screen>
  );
}
