const RETENTION_DAYS = 90;

export function notificationRetentionCutoff(now: Date = new Date()) {
  return new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
}
