import type { EmailSender } from "./sender";

const RESEND_API = "https://api.resend.com";

type Transport = (url: string, init: RequestInit) => Promise<Response>;

export type ResendConfig = {
  apiKey: string;
  from: string;
  fetch?: Transport;
};

type ResendResponse = { id?: string; name?: string; message?: string };

export function createResendSender(config: ResendConfig): EmailSender {
  const send: Transport = config.fetch ?? ((url, init) => fetch(url, init));

  return {
    async send(message) {
      const response = await send(`${RESEND_API}/emails`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
          "Idempotency-Key": message.idempotencyKey,
        },
        body: JSON.stringify({
          from: config.from,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
      });
      const json = (await response.json().catch(() => ({}))) as ResendResponse;
      if (response.status >= 500) {
        throw new Error(`Resend send failed with ${response.status}`);
      }
      if (!response.ok) {
        return {
          kind: "rejected",
          reason: `Resend refused the email with ${response.status}${
            json.message ? `: ${json.message}` : ""
          }`,
        };
      }
      if (!json.id) {
        throw new Error("Resend response has no id");
      }
      return { kind: "sent", messageId: json.id };
    },
  };
}
