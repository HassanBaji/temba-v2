import { View } from "react-native";

import { Avatar } from "../primitives/avatar";
import { Hatch } from "../primitives/hatch";

const OPEN_SEAT_SIZE = 40;
const OVERLAP = -10;

export function TeamAvatars({
  people,
  openSeats,
}: {
  people: { name: string; image?: string | null }[];
  openSeats: number;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {people.map((person, index) => (
        <View
          key={`${person.name}-${index}`}
          style={{ marginLeft: index === 0 ? 0 : OVERLAP }}
        >
          <Avatar name={person.name} uri={person.image} size="lg" />
        </View>
      ))}
      {Array.from({ length: openSeats }, (_, index) => (
        <View
          key={`open-${index}`}
          style={{
            width: OPEN_SEAT_SIZE,
            height: OPEN_SEAT_SIZE,
            marginLeft: people.length + index === 0 ? 0 : OVERLAP,
          }}
        >
          <Hatch radius={OPEN_SEAT_SIZE / 2} />
        </View>
      ))}
    </View>
  );
}
