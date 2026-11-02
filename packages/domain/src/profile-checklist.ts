/**
 * The Profile checklist: what a User can still add after sign-up. Phone and
 * name are done at sign-up (the name row only appears for an account that
 * predates the required name), the rest are optional Profile tasks. Each task
 * saves on its own; the list never blocks anything (ADR-0049).
 */
export type ProfileTaskId = "name" | "photo" | "email" | "sports";

export type ProfileTask = {
  id: ProfileTaskId;
  title: string;
  description: string;
  /** Rough time the design promises for the task. */
  time: string;
  done: boolean;
  /** A required task stays visible after Skip for now. */
  required: boolean;
};

export type ProfileChecklistInput = {
  hasName: boolean;
  hasPhoto: boolean;
  hasVerifiedEmail: boolean;
  sportsDone: boolean;
};

export type ProfileChecklist = {
  tasks: ProfileTask[];
  /** Open tasks, required ones first, in the design's order. */
  open: ProfileTask[];
  /** Count shown as "done OF total": phone and name count as the first two. */
  done: number;
  total: number;
  complete: boolean;
};

/** Phone and name: finished at sign-up for every new account. */
const SIGN_UP_STEPS = 2;

export function profileChecklist(
  input: ProfileChecklistInput,
): ProfileChecklist {
  const optional: ProfileTask[] = [
    {
      id: "photo",
      title: "Add a profile photo",
      description: "So organizers can spot you at the court.",
      time: "1 min",
      done: input.hasPhoto,
      required: false,
    },
    {
      id: "email",
      title: "Add and verify your email",
      description: "Receipts, and a way back in if you change number.",
      time: "1 min",
      done: input.hasVerifiedEmail,
      required: false,
    },
    {
      id: "sports",
      title: "Pick your sports and level",
      description: "Unlocks matched games and a rating.",
      time: "2 min",
      done: input.sportsDone,
      required: false,
    },
  ];
  const tasks: ProfileTask[] = input.hasName
    ? optional
    : [
        {
          id: "name",
          title: "Add your name",
          description: "Shown to organizers and the people you play with.",
          time: "30 sec",
          done: false,
          required: true,
        },
        ...optional,
      ];
  const open = tasks.filter((task) => !task.done);
  const total = SIGN_UP_STEPS + optional.length;
  const done =
    (input.hasName ? SIGN_UP_STEPS : SIGN_UP_STEPS - 1) +
    optional.filter((task) => task.done).length;
  return { tasks, open, done, total, complete: open.length === 0 };
}

export function checklistCountLabel(
  list: Pick<ProfileChecklist, "done" | "total">,
) {
  return `${list.done} OF ${list.total}`;
}

/** The checklist screen's sub-heading, by how much is left. */
export function checklistBlurb(list: ProfileChecklist): string {
  const left = list.open.length;
  if (left === 0) {
    return "All done. Organizers see a full profile and your games are matched to your level.";
  }
  if (left === list.tasks.length) {
    return `${left === 3 ? "Three" : String(left)} short tasks, any order. Each one unlocks something.`;
  }
  return `${left === 1 ? "1 task left." : `${left} tasks left.`} Any order, each one saves on its own.`;
}

export function checklistCta(list: ProfileChecklist): string {
  return list.complete ? "Find games" : "Continue to games";
}

/** The Home card shows at most this many rows; the rest fold into "N more tasks". */
export const HOME_CHECKLIST_ROWS = 3;

export function homeChecklistRows(list: ProfileChecklist) {
  const shown = list.open.slice(0, HOME_CHECKLIST_ROWS);
  const extra = list.open.length - shown.length;
  return {
    shown,
    more:
      extra > 0
        ? `${extra} more ${extra === 1 ? "task" : "tasks"}`
        : "All tasks",
  };
}

/**
 * What Home shows after Skip for now: optional rows fold into a chip, a
 * required task (the missing name) stays as a row.
 */
export function homeChecklistAfterSkip(list: ProfileChecklist) {
  return list.open.filter((task) => task.required);
}

export function youAreInTitle(firstName: string | null): string {
  return firstName ? `You're in, ${firstName}.` : "You're in.";
}
