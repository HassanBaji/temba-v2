export type TeamAvatarMember = {
  name: string;
  image?: string | null;
};

export function teamAvatarPeople(members: TeamAvatarMember[]) {
  return members.map((member) => ({
    name: member.name.length > 0 ? member.name : "Member",
    image: member.image ?? null,
  }));
}
