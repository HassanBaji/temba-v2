"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { DashboardShell } from "~/components/dashboard-shell";
import {
  GroupCreateForm,
  type GroupCreateValues,
} from "~/components/groups/group-create-form";
import { PageTitle } from "~/components/layout/page-title";
import { BackButton } from "~/components/ui/nav-icon-button";
import {
  GROUP_CREATED_WITHOUT_IMAGE_TOAST,
  entityImageUploadInput,
} from "@repo/domain/entity-image-file";
import {
  GROUP_CREATED_TOAST,
  GROUP_CREATE_SCREEN,
} from "@repo/domain/group-create";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import { api } from "~/trpc/react";

/** Design "Group create and edit flow" 01. */
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
          sport: values.sport,
        });
        await afterCreate(group, values.image, GROUP_CREATED_TOAST);
        return;
      }
      createLoosePrivate.reset();
      const group = await createLoosePublic.mutateAsync({
        name: values.name,
        sport: values.sport,
        requiresApproval: values.requiresApproval,
      });
      await afterCreate(group, values.image, GROUP_CREATED_TOAST);
    } catch {
      return;
    }
  }

  return (
    <DashboardShell
      title={GROUP_CREATE_SCREEN.title}
      hidePageHeader
      hideMobileTopBar
    >
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-[26px] pb-6">
        <header className="mt-6 flex flex-col gap-[18px] lg:mt-2">
          <div className="flex items-center justify-between gap-3">
            <BackButton
              variant="boxed"
              href="/dashboard/groups"
              label="Back to Groups"
            />
            <Link
              href="/dashboard/groups"
              aria-disabled={isPending || undefined}
              className="text-body text-muted-foreground hover:text-ink inline-flex min-h-11 items-center px-1.5"
            >
              {GROUP_CREATE_SCREEN.cancel}
            </Link>
          </div>
          <div className="flex flex-col gap-1.5">
            <PageTitle variant="hero" className="text-ink text-[30px]">
              {GROUP_CREATE_SCREEN.title}
            </PageTitle>
            <p className="text-body text-muted-foreground">
              {GROUP_CREATE_SCREEN.description.loose}
            </p>
          </div>
        </header>
        <GroupCreateForm
          context="loose"
          idPrefix="group"
          pending={isPending}
          error={submitError}
          onSubmit={(values) => {
            void onSubmit(values);
          }}
        />
      </div>
    </DashboardShell>
  );
}
