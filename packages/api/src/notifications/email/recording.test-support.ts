import { afterEach, beforeEach } from "vitest";

import { resetEmailSender, setEmailSender } from "./index";
import type { EmailMessage, EmailSender, EmailSendResult } from "./sender";

export class RecordingEmailSender implements EmailSender {
  readonly sent: EmailMessage[] = [];
  result: EmailSendResult | Error = {
    kind: "sent",
    messageId: "email_recorded",
  };

  send(message: EmailMessage): Promise<EmailSendResult> {
    this.sent.push(message);
    return this.result instanceof Error
      ? Promise.reject(this.result)
      : Promise.resolve(this.result);
  }

  clear(): void {
    this.sent.length = 0;
    this.result = { kind: "sent", messageId: "email_recorded" };
  }
}

/** Installs a fresh recording Email sender for the tests in the calling suite. */
export function recordEmails(): RecordingEmailSender {
  const sender = new RecordingEmailSender();
  beforeEach(() => {
    sender.clear();
    setEmailSender(sender);
  });
  afterEach(() => resetEmailSender());
  return sender;
}
