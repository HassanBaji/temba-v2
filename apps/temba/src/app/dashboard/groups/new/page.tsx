"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { DashboardShell } from "~/components/dashboard-shell";
import { GroupImageField } from "~/components/groups/group-image-field";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  fieldErrorMessage,
  focusFormFailure,
  globalFormErrorMessage,
  toastGlobalFormError,
} from "~/lib/form-mutation-error";
import {
  GROUP_CREATED_WITHOUT_IMAGE_TOAST,
  groupImageFileError,
  groupImageUploadInput,
} from "~/lib/group-image-file";
import { api, type RouterOutputs } from "~/trpc/react";

type GroupType = NonNullable<RouterOutputs["groups"]["byId"]["type"]>;

const FIELD_IDS = { name: "group-name", visibility: "group-type" };

export default function NewLooseGroupPage() {
  const router = useRouter();
  const utils = api.useUtils();
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const [name, setName] = React.useState("");
  const [visibility, setVisibility] = React.useState<GroupType>("public");
  const [requiresApproval, setRequiresApproval] = React.useState(false);
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imageError, setImageError] = React.useState<string | null>(null);

  const createLoosePublic = api.groups.createLoosePublic.useMutation({
    onError: (error) => {
      toastGlobalFormError(error);
      focusFormFailure(error, FIELD_IDS, summaryRef.current);
    },
  });

  const createLoosePrivate = api.groups.createLoosePrivate.useMutation({
    onError: (error) => {
      toastGlobalFormError(error);
      focusFormFailure(error, FIELD_IDS, summaryRef.current);
    },
  });

  const uploadImage = api.groups.uploadImage.useMutation();

  const isPending =
    createLoosePublic.isPending ||
    createLoosePrivate.isPending ||
    uploadImage.isPending;
  const submitError = createLoosePublic.error ?? createLoosePrivate.error;
  const nameError = fieldErrorMessage(submitError, "name");

  async function afterCreate(group: { id: string }, successMessage: string) {
    if (imageFile) {
      try {
        const input = await groupImageUploadInput(imageFile);
        await uploadImage.mutateAsync({
          groupId: group.id,
          contentType: input.contentType,
          dataBase64: input.dataBase64,
        });
      } catch {
        toast.success(GROUP_CREATED_WITHOUT_IMAGE_TOAST);
        await utils.groups.mine.invalidate();
        router.push(`/dashboard/groups/${group.id}`);
        return;
      }
    }
    toast.success(successMessage);
    await utils.groups.mine.invalidate();
    router.push(`/dashboard/groups/${group.id}`);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) {
      return;
    }
    if (imageFile) {
      const pickedError = groupImageFileError(imageFile);
      if (pickedError) {
        setImageError(pickedError);
        return;
      }
    }
    try {
      if (visibility === "private") {
        const group = await createLoosePrivate.mutateAsync({
          name,
          sport: "padel",
        });
        await afterCreate(group, "Group Private created");
        return;
      }
      const group = await createLoosePublic.mutateAsync({
        name,
        sport: "padel",
        requiresApproval,
      });
      await afterCreate(group, "Group created");
    } catch {
      return;
    }
  }

  return (
    <DashboardShell
      title="Create Group"
      description="A squad outside any Community. Public joins via the Group URL unless you require approval; Private uses Lookup invites and 6-hour Invite links. You become a Group member."
    >
      <Card variant="outlined" className="w-full">
        <form onSubmit={onSubmit} className="space-y-6">
          <FormErrorSummary
            ref={summaryRef}
            message={globalFormErrorMessage(submitError)}
          />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="group-name">Name</FieldLabel>
              <Input
                id="group-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={255}
                aria-invalid={nameError ? true : undefined}
                aria-describedby={nameError ? "group-name-error" : undefined}
              />
              <FieldError id="group-name-error">{nameError}</FieldError>
            </Field>

            <Field>
              <FieldLabel htmlFor="group-type">Type</FieldLabel>
              <Select
                value={visibility}
                onValueChange={(value) => {
                  const next = value as GroupType;
                  setVisibility(next);
                  if (next === "private") {
                    setRequiresApproval(false);
                  }
                }}
              >
                <SelectTrigger id="group-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    Public (open-with-link)
                  </SelectItem>
                  <SelectItem value="private">
                    Private (Lookup invite + Invite link)
                  </SelectItem>
                </SelectContent>
              </Select>
              <FieldDescription>
                {visibility === "private"
                  ? "Only you can send Lookup invites and copy Invite links."
                  : "Share the Group URL. Anyone with the link can join, or request if you require approval."}
              </FieldDescription>
            </Field>

            {visibility === "public" ? (
              <Field>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="requires-approval"
                    checked={requiresApproval}
                    onCheckedChange={(checked) =>
                      setRequiresApproval(checked === true)
                    }
                  />
                  <FieldLabel htmlFor="requires-approval">
                    Require approval
                  </FieldLabel>
                </div>
                <FieldDescription>
                  People request to join. You approve or reject them on Group
                  home.
                </FieldDescription>
              </Field>
            ) : null}

            <GroupImageField
              id="group-image"
              file={imageFile}
              error={imageError}
              disabled={isPending}
              onFileChange={setImageFile}
              onError={setImageError}
            />
          </FieldGroup>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating…" : "Create Group"}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/groups">Cancel</Link>
            </Button>
          </div>
        </form>
      </Card>
    </DashboardShell>
  );
}
