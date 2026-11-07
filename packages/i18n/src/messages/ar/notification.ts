import type {
  NotificationTitlePart,
  notification as source,
} from "../en/notification";
import { plural } from "../../plural";

function strong(text: string): NotificationTitlePart {
  return { text, strong: true };
}

function plain(text: string): NotificationTitlePart {
  return { text, strong: false };
}

export const notification = {
  title: {
    pair: (actor: string, partner: string) => [
      strong(actor),
      plain(" و"),
      strong(partner),
    ],
    groupMemberJoined: (actor: string, group: string) => [
      plain("انضم "),
      strong(actor),
      plain(" إلى "),
      strong(group),
    ],
    gamePlayerJoined: (subject: NotificationTitlePart[], game: string) => [
      plain("انضم "),
      ...subject,
      plain(" إلى "),
      strong(game),
    ],
    gamePlayerJoinedViaWaitlist: (
      subject: NotificationTitlePart[],
      game: string,
    ) => [
      plain("انتقل "),
      ...subject,
      plain(" من قائمة الانتظار إلى "),
      strong(game),
    ],
    gamePlayerLeft: (actor: string, game: string) => [
      plain("غادر "),
      strong(actor),
      plain(" "),
      strong(game),
    ],
    gamePlayerLeftWithPartner: (
      actor: string,
      game: string,
      partner: string,
    ) => [
      plain("غادر "),
      strong(actor),
      plain(" "),
      strong(game),
      plain(". وأُزيل "),
      strong(partner),
      plain(" معه"),
    ],
    gameSeatedByOrganizer: (actor: string, game: string) => [
      plain("أضافك "),
      strong(actor),
      plain(" إلى "),
      strong(game),
    ],
    gameSideChanged: (actor: string, game: string) => [
      plain("غيّر "),
      strong(actor),
      plain(" جهتك في "),
      strong(game),
    ],
    historyLinked: (gameCount: number) => [
      plain("ربطنا "),
      strong(
        plural("ar", gameCount, {
          one: "مباراة واحدة",
          two: "مباراتين",
          few: "{n} مباريات",
          many: "{n} مباراة",
          other: "{n} مباراة",
        }),
      ),
      plain(" لُعبت برقمك"),
    ],
    levelSet: (actor: string, level: string) => [
      plain("حدّد "),
      strong(actor),
      plain(" مستواك عند "),
      strong(level),
    ],
    gameFinished: (game: string) => [plain("انتهت "), strong(game)],
    markReceived: (actor: string, kind: string, game: string) => [
      plain("منحك "),
      strong(actor),
      plain(" وسام "),
      strong(kind),
      plain(" في "),
      strong(game),
    ],
    mvpDecided: (mvp: string, game: string) => [
      strong(mvp),
      plain(" نجم مباراة "),
      strong(game),
    ],
    youAreMvp: (game: string) => [plain("أنت نجم مباراة "), strong(game)],
    mvpTieBreak: (game: string) => [
      plain("تعادل في التصويت على "),
      strong(game),
      plain(". اختر نجم المباراة."),
    ],
    groupJoinRequested: (actor: string, group: string) => [
      plain("طلب "),
      strong(actor),
      plain(" الانضمام إلى "),
      strong(group),
    ],
    groupJoinRequestedWithSeat: (
      actor: string,
      group: string,
      game: string,
    ) => [
      plain("طلب "),
      strong(actor),
      plain(" الانضمام إلى "),
      strong(group),
      plain(" وحجز مكان في "),
      strong(game),
    ],
    groupJoinApproved: (actor: string, group: string) => [
      plain("وافق "),
      strong(actor),
      plain(" عليك. أنت الآن في "),
      strong(group),
    ],
    groupJoinApprovedWithSeat: (actor: string, group: string, game: string) => [
      plain("وافق "),
      strong(actor),
      plain(" عليك. أنت في "),
      strong(game),
      plain(" وعضو في "),
      strong(group),
    ],
    groupJoinDeclined: (actor: string, group: string) => [
      plain("رفض "),
      strong(actor),
      plain(" طلبك للانضمام إلى "),
      strong(group),
    ],
    levelRangeRequested: (actor: string, game: string) => [
      plain("طلب "),
      strong(actor),
      plain(" اللعب في "),
      strong(game),
      plain(" خارج نطاق المستوى"),
    ],
    levelRangeApproved: (actor: string, game: string) => [
      plain("وافق "),
      strong(actor),
      plain(" على لعبك في "),
      strong(game),
    ],
    levelRangeDeclined: (actor: string, game: string) => [
      plain("رفض "),
      strong(actor),
      plain(" طلبك للعب في "),
      strong(game),
    ],
  },
  subline: {
    everyMatchIn: "كل المباريات مسجّلة.",
    seeYourResults: "اطّلع على نتائجك.",
    marksOpen: (when: string) => `امنح أوسمتك قبل ${when}.`,
    decideOnGame: "وافق أو ارفض من صفحة المباراة.",
    decideOnGroup: "وافق أو ارفض من صفحة المجموعة.",
    takeYourSeat: "يمكنك الانضمام إلى المباراة الآن.",
  },
  gameNameWithDay: (format: string, day: string) => `${format} · ${day}`,
  metaWithGroup: (time: string, group: string) => `${time} · ${group}`,
  time: {
    justNow: "الآن",
    minutesAgo: (n: number) =>
      plural("ar", n, {
        one: "قبل دقيقة",
        two: "قبل دقيقتين",
        few: "قبل {n} دقائق",
        many: "قبل {n} دقيقة",
        other: "قبل {n} دقيقة",
      }),
    hoursAgo: (n: number) =>
      plural("ar", n, {
        one: "قبل ساعة",
        two: "قبل ساعتين",
        few: "قبل {n} ساعات",
        many: "قبل {n} ساعة",
        other: "قبل {n} ساعة",
      }),
    daysAgo: (n: number) =>
      plural("ar", n, {
        one: "قبل يوم",
        two: "قبل يومين",
        few: "قبل {n} أيام",
        many: "قبل {n} يومًا",
        other: "قبل {n} يوم",
      }),
  },
  invitesWaiting: (n: number) =>
    plural("ar", n, {
      one: "دعوة واحدة بانتظارك",
      two: "دعوتان بانتظارك",
      few: "{n} دعوات بانتظارك",
      many: "{n} دعوة بانتظارك",
      other: "{n} دعوة بانتظارك",
    }),
} satisfies typeof source;
