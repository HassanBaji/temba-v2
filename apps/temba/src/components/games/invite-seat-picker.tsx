import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

export type InviteVacantSeat = {
  sideIndex: number;
  position: "left" | "right";
};

export function seatKey(seat: InviteVacantSeat) {
  return `${seat.sideIndex}:${seat.position}`;
}

export function parseSeatKey(value: string): InviteVacantSeat | null {
  const [side, position] = value.split(":");
  const sideIndex = Number(side);
  if (
    !Number.isInteger(sideIndex) ||
    (position !== "left" && position !== "right")
  ) {
    return null;
  }
  return { sideIndex, position };
}

export function InviteSeatPicker({
  vacantSeats,
  value,
  onChange,
  id = "invite-seat",
}: {
  vacantSeats: InviteVacantSeat[];
  value: string;
  onChange: (value: string) => void;
  id?: string;
}) {
  if (vacantSeats.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No vacant Position. Accept to join the waitlist.
      </p>
    );
  }
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id}>
        <SelectValue placeholder="Pick a vacant Position" />
      </SelectTrigger>
      <SelectContent>
        {vacantSeats.map((seat) => (
          <SelectItem key={seatKey(seat)} value={seatKey(seat)}>
            Slot {seat.sideIndex} {seat.position}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
