import { useUser } from "@clerk/expo";
import { splitClerkAuthError } from "@repo/domain/clerk-auth-error";
import { validateUserNames } from "@repo/domain/user-display-name";
import { useState } from "react";

import { AuthLoading } from "../auth/auth-loading";
import { AuthScreen } from "../auth/auth-screen";
import { fieldError } from "../auth/clerk-forms";
import { FormErrorSummary } from "../auth/form-error-summary";
import { useLocale, useMessages } from "../i18n/locale-provider";
import { splitTrpcFormError, type SplitFormError } from "../lib/form-error";
import { Button } from "../primitives/button";
import { TextField } from "../primitives/text-field";
import { api } from "../trpc/react";
import { backToChecklist } from "./task-navigation";

export function NameTaskScreen() {
  const m = useMessages();
  const locale = useLocale();
  const { user, isLoaded } = useUser();
  const utils = api.useUtils();
  const setName = api.users.setName.useMutation();
  const [firstName, setFirstName] = useState(() => user?.firstName ?? "");
  const [lastName, setLastName] = useState(() => user?.lastName ?? "");
  const [pending, setPending] = useState(false);
  const [split, setSplit] = useState<SplitFormError | null>(null);

  async function onSave() {
    if (pending || !user) {
      return;
    }
    const names = validateUserNames({ firstName, lastName }, locale);
    if (!names.ok) {
      setSplit({ fieldErrors: names.fieldErrors, globalMessage: null });
      return;
    }
    setPending(true);
    setSplit(null);
    try {
      await user.update({
        firstName: names.firstName,
        lastName: names.lastName,
      });
    } catch (err) {
      setSplit(splitClerkAuthError(err, locale));
      setPending(false);
      return;
    }
    try {
      await setName.mutateAsync(names);
      await Promise.all([
        utils.users.onboardingState.invalidate(),
        utils.users.home.invalidate(),
      ]);
      backToChecklist();
    } catch (err) {
      setSplit(
        splitTrpcFormError(
          err instanceof Error ? err : new Error(m.common.somethingWentWrong),
        ),
      );
      setPending(false);
    }
  }

  if (!isLoaded) {
    return <AuthLoading />;
  }

  return (
    <AuthScreen
      onBack={backToChecklist}
      meta={m.mobileHome.nameTask.meta}
      title={m.mobileHome.nameForm.title}
      description={m.profile.checklist.tasks.name.description}
      action={
        <Button
          label={m.mobileHome.nameTask.save}
          size="lg"
          pending={pending}
          onPress={() => void onSave()}
        />
      }
    >
      <FormErrorSummary message={split?.globalMessage} />
      <TextField
        label={m.mobileHome.fields.firstName}
        autoComplete="given-name"
        textContentType="givenName"
        autoFocus
        value={firstName}
        onChangeText={setFirstName}
        editable={!pending}
        error={fieldError(split, "firstName", "first_name")}
      />
      <TextField
        label={m.mobileHome.fields.lastName}
        autoComplete="family-name"
        textContentType="familyName"
        value={lastName}
        onChangeText={setLastName}
        onSubmitEditing={() => void onSave()}
        editable={!pending}
        error={fieldError(split, "lastName", "last_name")}
      />
    </AuthScreen>
  );
}
