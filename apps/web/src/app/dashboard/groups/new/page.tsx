"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { DashboardShell } from "~/components/dashboard-shell";
import { useLocale, useMessages } from "~/components/locale-provider";
import {
  GroupCreateForm,
  type GroupCreateValues,
} from "~/components/groups/group-create-form";
import { PageTitle } from "~/components/layout/page-title";
import { BackButton } from "~/components/ui/nav-icon-button";
import { entityImageUploadInput } from "@repo/domain/entity-image-file";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import { api } from "~/trpc/react";

/** Design "Group create and edit flow" 01. */
export default function NewLooseGroupPage() {
  const m = useMessages();
  const locale = useLocale();
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
        const input = await entityImageUploadInput(image, locale);
        await uploadImage.mutateAsync({
          groupId: group.id,
          contentType: input.contentType,
          dataBase64: input.dataBase64,
        });
      } catch {
        toast.success(m.createGame.image.groupCreatedWithoutImage);
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
        await afterCreate(group, values.image, m.group.create.createdToast);
        return;
      }
      createLoosePrivate.reset();
      const group = await createLoosePublic.mutateAsync({
        name: values.name,
        sport: values.sport,
        requiresApproval: values.requiresApproval,
      });
      await afterCreate(group, values.image, m.group.create.createdToast);
    } catch {
      return;
    }
  }

  return (
    <DashboardShell
      title={m.group.create.screen.title}
      hidePageHeader
      hideMobileTopBar
    >
      <div className="mx-auto flex w-full max-w-[560px] flex-col gap-[26px] pb-6">
        <header className="mt-6 flex flex-col gap-[18px] lg:mt-2">
          <div className="flex items-center justify-between gap-3">
            <BackButton
              variant="boxed"
              href="/dashboard/groups"
              label={m.group.home.backToGroups}
            />
            <Link
              href="/dashboard/groups"
              aria-disabled={isPending || undefined}
              className="text-body text-muted-foreground hover:text-ink inline-flex min-h-11 items-center px-1.5"
            >
              {m.common.cancel}
            </Link>
          </div>
          <div className="flex flex-col gap-1.5">
            <PageTitle variant="hero" className="text-ink text-[30px]">
              {m.group.create.screen.title}
            </PageTitle>
            <p className="text-body text-muted-foreground">
              {m.group.create.screen.description}
            </p>
          </div>
        </header>
        <GroupCreateForm
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
