import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

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
  locale: Locale,
): ProfileChecklist {
  const m = messagesFor(locale).profile.checklist.tasks;
  const optional: ProfileTask[] = [
    {
      id: "photo",
      title: m.photo.title,
      description: m.photo.description,
      time: m.photo.time,
      done: input.hasPhoto,
      required: false,
    },
    {
      id: "email",
      title: m.email.title,
      description: m.email.description,
      time: m.email.time,
      done: input.hasVerifiedEmail,
      required: false,
    },
    {
      id: "sports",
      title: m.sports.title,
      description: m.sports.description,
      time: m.sports.time,
      done: input.sportsDone,
      required: false,
    },
  ];
  const tasks: ProfileTask[] = input.hasName
    ? optional
    : [
        {
          id: "name",
          title: m.name.title,
          description: m.name.description,
          time: m.name.time,
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
  locale: Locale,
) {
  return messagesFor(locale).profile.checklist.countOf(list.done, list.total);
}

/** The checklist screen's sub-heading, by how much is left. */
export function checklistBlurb(list: ProfileChecklist, locale: Locale): string {
  const m = messagesFor(locale).profile.checklist;
  const left = list.open.length;
  if (left === 0) {
    return m.allDone;
  }
  if (left === list.tasks.length) {
    return m.shortTasks(left);
  }
  return m.tasksLeft(left);
}

export function checklistCta(list: ProfileChecklist, locale: Locale): string {
  const m = messagesFor(locale).profile.checklist;
  return list.complete ? m.findGames : m.continueToGames;
}

/** The Home card shows at most this many rows; the rest fold into "N more tasks". */
export const HOME_CHECKLIST_ROWS = 3;

export function homeChecklistRows(list: ProfileChecklist, locale: Locale) {
  const m = messagesFor(locale).profile.checklist;
  const shown = list.open.slice(0, HOME_CHECKLIST_ROWS);
  const extra = list.open.length - shown.length;
  return {
    shown,
    more: extra > 0 ? m.moreTasks(extra) : m.allTasks,
  };
}

/**
 * What Home shows after Skip for now: optional rows fold into a chip, a
 * required task (the missing name) stays as a row.
 */
export function homeChecklistAfterSkip(list: ProfileChecklist) {
  return list.open.filter((task) => task.required);
}

export function youAreInTitle(
  firstName: string | null,
  locale: Locale,
): string {
  const m = messagesFor(locale).profile.checklist;
  return firstName ? m.youAreIn(firstName) : m.youAreInPlain;
}
