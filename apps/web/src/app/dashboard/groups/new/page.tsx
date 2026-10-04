"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { DashboardShell } from "~/components/dashboard-shell";
import {
  GroupCreateForm,
  type GroupCreateValues,
} from "~/components/groups/group-create-form";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import {
  GROUP_CREATED_WITHOUT_IMAGE_TOAST,
  entityImageUploadInput,
} from "@repo/domain/entity-image-file";
import {
  GROUP_CREATED_TOAST,
  GROUP_CREATE_LOOSE_DESCRIPTION,
} from "@repo/domain/group-create";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import { api } from "~/trpc/react";

export default function NewLooseGroupPage() {
  const router = useRouter();
  const utils = api.useUtils();

  const createLoosePublic = api.groups.createLoosePublic.useMutation({
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const createLoosePrivate = api.groups.createLoosePrivate.useMutation({
    onError: (error) => {
      toastGlobalFormError(error);
    },
  });

  const uploadImage = api.groups.uploadImage.useMutation();

  const isPending =
    createLoosePublic.isPending ||
    createLoosePrivate.isPending ||
    uploadImage.isPending;
  const submitError = createLoosePublic.error ?? createLoosePrivate.error;

  async function afterCreate(
    group: { id: string },
    image: File | null,
    successMessage: string,
  ) {
    if (image) {
      try {
        const input = await entityImageUploadInput(image);
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

  async function onSubmit(values: GroupCreateValues) {
    try {
      if (values.type === "private") {
        createLoosePublic.reset();
        const group = await createLoosePrivate.mutateAsync({
          name: values.name,
          sport: "padel",
        });
        await afterCreate(group, values.image, GROUP_CREATED_TOAST);
        return;
      }
      createLoosePrivate.reset();
      const group = await createLoosePublic.mutateAsync({
        name: values.name,
        sport: "padel",
        requiresApproval: values.requiresApproval,
      });
      await afterCreate(group, values.image, GROUP_CREATED_TOAST);
    } catch {
      return;
    }
  }

  return (
    <DashboardShell
      title="Create Group"
      description={GROUP_CREATE_LOOSE_DESCRIPTION}
    >
      <Card variant="outlined" className="w-full">
        <GroupCreateForm
          context="loose"
          idPrefix="group"
          pending={isPending}
          error={submitError}
          onSubmit={(values) => {
            void onSubmit(values);
          }}
          secondaryAction={
            <Button variant="outline" asChild>
              <Link href="/dashboard/groups">Cancel</Link>
            </Button>
          }
        />
      </Card>
    </DashboardShell>
  );
}
