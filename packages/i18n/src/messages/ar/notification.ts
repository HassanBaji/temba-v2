import type {
  NotificationTitlePart,
  notification as source,
} from "../en/notification";
import { isolate } from "../../bidi";
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
    gameMovedToWaitlist: (actor: string, game: string) => [
      plain("خفّض "),
      strong(actor),
      plain(" عدد اللاعبين في "),
      strong(game),
      plain(". أنت الآن في قائمة الانتظار وتستعيد مكانك حين يتوفر"),
    ],
    matchScoreToConfirm: (actor: string, game: string) => [
      plain("أدخل "),
      strong(actor),
      plain(" نتيجتك في "),
      strong(game),
      plain(". أكّدها أو صحّحها"),
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
    levelCalibrated: (actor: string, venue: string, level: string) => [
      plain("عاير "),
      strong(actor),
      plain(" ("),
      strong(venue),
      plain(") مستواك عند "),
      strong(level),
    ],
    tierPointsAdjusted: (actor: string, group: string) => [
      plain("عدّل "),
      strong(actor),
      plain(" نقاط فئتك في "),
      strong(group),
    ],
    tierBandChanged: (band: string, group: string) => [
      plain("صرت الآن "),
      strong(band),
      plain(" في "),
      strong(group),
    ],
    levelConfirmed: (sport: string) => [
      plain("تأكّد مستواك في "),
      strong(sport),
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
    performanceRatingsOpen: (game: string) => [
      plain("قيّم لاعبي "),
      strong(game),
    ],
    performanceRatingsClosed: (game: string) => [
      plain("صدرت تقييمات "),
      strong(game),
    ],
    matchDisputeRaised: (actor: string, game: string) => [
      plain("اعترض "),
      strong(actor),
      plain(" على نتيجة "),
      strong(game),
    ],
    matchDisputeUpheld: (game: string) => [
      plain("قبل Temba اعتراضك على "),
      strong(game),
    ],
    matchDisputeUpheldFor: (actor: string, game: string) => [
      plain("قبل Temba اعتراض "),
      strong(actor),
      plain(" على "),
      strong(game),
    ],
    matchDisputeDismissed: (game: string) => [
      plain("رفض Temba اعتراضك على "),
      strong(game),
    ],
    matchDisputeDismissedFor: (actor: string, game: string) => [
      plain("رفض Temba اعتراض "),
      strong(actor),
      plain(" على "),
      strong(game),
    ],
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
    teamInviteReceived: (actor: string, team: string) => [
      plain("دعاك "),
      strong(actor),
      plain(" إلى "),
      strong(team),
    ],
    teamInviteReceivedUnnamed: (actor: string) => [
      plain("دعاك "),
      strong(actor),
      plain(" إلى فريقه"),
    ],
    challengeExpired: (team: string) => [
      plain("انتهت مدة تحدي "),
      strong(team),
    ],
    challengeExpiredUnnamed: [plain("انتهت مدة تحدي فريقك")],
    challengeProposalReceived: (team: string) => [
      strong(team),
      plain(" اقترح وقتًا لتحديك"),
    ],
    challengeProposalReceivedUnnamed: [plain("اقترح فريق وقتًا لتحديك")],
    challengeProposalDeclined: (team: string) => [
      strong(team),
      plain(" طلب وقتًا آخر"),
    ],
    challengeProposalDeclinedUnnamed: [plain("رُفض عرضك: وقت آخر")],
    challengeProposalExpired: (team: string) => [
      plain("انتهت مدة عرضك إلى "),
      strong(team),
    ],
    challengeProposalExpiredUnnamed: [plain("انتهت مدة عرض فريقك")],
    challengeProposalConfirmed: (team: string) => [
      plain("صارت مباراة: تلعبون ضد "),
      strong(team),
    ],
    challengeProposalConfirmedUnnamed: [plain("صار تحديك مباراة")],
    challengeProposalPassedOver: (team: string) => [
      strong(team),
      plain(" أكّد عرضًا آخر"),
    ],
    challengeProposalPassedOverUnnamed: [plain("تأكّد عرض آخر")],
    challengeSquadDue: (team: string) => [
      plain("سمِّ تشكيلتك للمباراة ضد "),
      strong(team),
    ],
    challengeSquadDueUnnamed: [plain("سمِّ تشكيلتك للمباراة")],
    challengeSquadNamed: (team: string) => [
      plain("أنت في التشكيلة للعب ضد "),
      strong(team),
    ],
    challengeSquadNamedUnnamed: [plain("أنت في تشكيلة تحدٍّ")],
    challengeRematchNudge: (team: string) => [
      strong(team),
      plain(" يتحداكم في مباراة إعادة"),
    ],
    challengeRematchNudgeUnnamed: [
      plain("فريق لعبتم ضده يتحداكم في مباراة إعادة"),
    ],
  },
  subline: {
    everyMatchIn: "كل المباريات مسجّلة.",
    seeYourResults: "اطّلع على نتائجك.",
    marksOpen: (when: string) => `امنح أوسمتك قبل ${when}.`,
    decideOnGame: "وافق أو ارفض من صفحة المباراة.",
    decideOnGroup: "وافق أو ارفض من صفحة المجموعة.",
    takeYourSeat: "يمكنك الانضمام إلى المباراة الآن.",
    acceptInTeams: "اقبلها أو ارفضها من صفحة الفرق.",
    postAgain: "لم يصل أي عرض. انشر من جديد من التحديات.",
    confirmOrAnotherTime: "أكّده أو اطلب وقتًا آخر خلال 48 ساعة.",
    proposeAgain: "أرسل عرضًا جديدًا ما دام التحدي مفتوحًا.",
    bothPairsSeated: "الزوجان في مقاعدهما. اطّلع على المباراة.",
    nameYourSquad: "سمِّ تشكيلتك من قائمة الفريق.",
    findAnother: "ابحث عن تحدٍّ آخر في لوحة التحديات المفتوحة.",
    kickOffTomorrow: "تنطلق المباراة بعد 24 ساعة.",
    seeWhoIsNamed: "اطّلع على المباراة ومن سُمّي معك.",
    acceptRematch: "اقبله لتقترح وقتًا وملعبًا.",
    tierAdjusted: (reason: string, from: string, to: string) =>
      `${reason}. من ${isolate(from)} إلى ${isolate(to)}.`,
    tierAdjustedWithNote: (
      reason: string,
      note: string,
      from: string,
      to: string,
    ) => `${reason}: «${note}» من ${isolate(from)} إلى ${isolate(to)}.`,
    ratingsOpen:
      "امنح كل لاعب من 1 إلى 10 خلال 24 ساعة. تتحرّك النقاط حين ترسلها.",
    ratingsOpenEveryone:
      "قيّم زملاءك، والخصوم إن أردت، خلال 24 ساعة. لا أحد يرى من أعطى ماذا.",
    tierPlaces: "الفئات مراكز، فحين يتحرّك لاعب يتحرّك غيره في الاتجاه الآخر.",
    levelConfirmed: "لم يعد المسار مخطّطًا. يواصل التحرّك في المباريات الموثّقة.",
    ratingsClosed: (rating: string, delta: string, points: string) =>
      `تقييمك ${isolate(rating)}. نقاط الفئة ${isolate(delta)}، والآن ${isolate(points)}.`,
    ratingsClosedResultOnly: (delta: string, points: string) =>
      `لا تقييم لك هذه المرة. نقاط الفئة ${isolate(delta)} على النتيجة، والآن ${isolate(points)}.`,
    disputeUpheld: "النتيجة مفتوحة من جديد. أدخل النتيجة الصحيحة.",
    disputeDismissed: "تبقى النتيجة.",
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
