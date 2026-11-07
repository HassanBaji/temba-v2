export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
};

/**
 * `off` means no provider is configured, so nothing left and nothing may be
 * stamped. `rejected` is the provider's definitive answer (a 4xx) and is never
 * retried; network errors and 5xx are thrown so the Job retries (ADR-0030).
 */
export type EmailSendResult =
  | { kind: "sent"; messageId: string }
  | { kind: "rejected"; reason: string }
  | { kind: "off" };

export interface EmailSender {
  send(message: EmailMessage): Promise<EmailSendResult>;
}
