"use client";

import { use } from "react";

import { RatingSettingsPage } from "~/components/groups/rating-settings-page";

export default function GroupRatingSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <RatingSettingsPage groupId={id} />;
}
