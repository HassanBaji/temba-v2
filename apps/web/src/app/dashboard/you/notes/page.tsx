import { type Metadata } from "next";

import { MyNotesScreen } from "~/components/game-album/my-notes-screen";
import { getRequestMessages } from "~/lib/request-locale";

export async function generateMetadata(): Promise<Metadata> {
  const m = await getRequestMessages();
  return { title: m.gameAlbum.myNotes.title };
}

export default function MyNotesPage() {
  return <MyNotesScreen />;
}
