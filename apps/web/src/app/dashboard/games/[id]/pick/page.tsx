import { redirect } from "next/navigation";

// The Pick room is not on the web App yet, so its Notifications land on the Game.
export default async function PickRoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/games/${id}`);
}
