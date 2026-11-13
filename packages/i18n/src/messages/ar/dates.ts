import { plural } from "../../plural";
import type { dates as source } from "../en/dates";

export const dates = {
  tonight: "الليلة",
  tonightInSentence: "الليلة",
  thisAfternoon: "بعد ظهر اليوم",
  tomorrowInSentence: "غدًا",
  minutesCompact: (minutes: string) => `${minutes} د`,
  minutes: (n: number) => `${n} د`,
  windowDuration: (n: number) =>
    plural("ar", n, {
      one: "دقيقة واحدة",
      two: "دقيقتان",
      few: "{n} دقائق",
      many: "{n} دقيقة",
      other: "{n} دقيقة",
    }),
  playedToday: "لُعبت اليوم",
  playedDaysAgo: (n: number) =>
    plural("ar", n, {
      one: "لُعبت قبل يوم",
      two: "لُعبت قبل يومين",
      few: "لُعبت قبل {n} أيام",
      many: "لُعبت قبل {n} يومًا",
      other: "لُعبت قبل {n} يوم",
    }),
  gameStart: (day: string, clock: string) => `${day}، ${clock}`,
  timeWindow: (start: string, end: string) => `${start} - ${end}`,
  countdown: {
    inDays: (n: number) =>
      plural("ar", n, {
        one: "بعد يوم",
        two: "بعد يومين",
        few: "بعد {n} أيام",
        many: "بعد {n} يومًا",
        other: "بعد {n} يوم",
      }),
    inMinutes: (minutes: number) => `بعد ${minutes} د`,
    inHoursMinutes: (hours: number, minutes: number) =>
      `بعد ${hours} س ${minutes} د`,
    startsIn: (countdown: string) => `تبدأ ${countdown}`,
    liveNow: "جارية الآن",
    endedEnterScore: "انتهت، أدخل النتيجة",
    until: (clock: string) => `حتى ${clock}`,
    meridiemUntil: (
      meridiem: string,
      end: { clock: string; meridiem: string },
    ) => `${meridiem} حتى ${end.clock} ${end.meridiem}`.trimEnd(),
  },
} satisfies typeof source;
