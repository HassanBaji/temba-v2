import type { EmailSender } from "./sender";

export const noneSender: EmailSender = {
  send: () => Promise.resolve({ kind: "off" }),
};
