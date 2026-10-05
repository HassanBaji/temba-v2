import type {
  CreateGroupOption,
  CreateVenuePicker,
} from "@repo/domain/create-game-flow";

import type { Slot } from "../home/home-model";
import type { CreateAction, CreateState, FieldErrors } from "./create-model";

export type StepProps = {
  state: CreateState;
  now: Date;
  errors: FieldErrors;
  dispatch: (action: CreateAction) => void;
};

export type WhereData = {
  groups: CreateGroupOption[];
  picker: Slot<CreateVenuePicker> | null;
};
