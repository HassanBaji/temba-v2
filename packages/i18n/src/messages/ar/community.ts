import { plural } from "../../plural";
import type { community as source } from "../en/community";

export const community = {
  title: "المجتمعات",
  fallbackName: "المجتمع",
  errorTitle: "تعذّر تحميل المجتمعات",
  communityErrorTitle: "تعذّر تحميل المجتمع",
  notFound: {
    title: "المجتمع غير موجود",
    description: "ربما أُزيل، أو ليس لديك صلاحية الوصول إليه.",
  },
  start: {
    title: "ابدأ مجتمعًا",
    description: "تنظّم المجتمعات المجموعات النادوية حول نادٍ.",
    action: "إنشاء مجتمع",
  },
  noGroups: "لا مجموعات بعد",
  create: {
    title: "إنشاء مجتمع",
    description: "تصبح المالك. المجموعات اختيارية.",
    publicHelp:
      "يطلب من لديه رابط المجتمع الانضمام. المجتمع غير مدرج في أي مكان بعد.",
    privateHelp: "لا ينضم إلا من تدعوه.",
    submit: "إنشاء مجتمع",
    notAvailable: {
      title: "الإنشاء محدود",
      description: "يُعدّ فريق Temba المجتمعات الجديدة.",
    },
  },
  type: {
    public: "عام",
    private: "خاص",
  },
  role: {
    owner: "المالك",
    admin: "المشرف",
    member: "عضو",
  },
  tab: {
    groups: "المجموعات",
    teams: "الفرق",
    members: "الأعضاء",
    requests: "الطلبات",
    withCount: (label: string, n: number) => `${label} (${n})`,
  },
  toast: {
    created: "تم إنشاء المجتمع",
    joinRequested: "أُرسل طلب الانضمام",
    requestApproved: "تمت الموافقة على الطلب",
    requestRejected: "رُفض الطلب",
    teamLinked: "تم ربط الفريق",
    teamLinkRejected: "رُفض طلب الربط",
    venueLinkRequested: "طُلب ربط النادي",
    venueUnlinked: "تم فك ارتباط النادي",
    left: "غادرت المجتمع ومجموعاته النادوية",
    archived: "تمت أرشفة المجتمع",
    unarchived: "أُلغيت أرشفة المجتمع",
    clubGroupCreated: "تم إنشاء المجموعة النادوية",
    roleUpdated: (role: string) => `تغيّر الدور إلى ${role}`,
  },
  action: {
    requestJoin: "طلب الانضمام",
    createClubGroup: "إنشاء مجموعة نادوية",
    manageInvites: "إدارة الدعوات",
    unarchive: "إلغاء الأرشفة",
    leave: "مغادرة المجتمع",
    softArchive: "أرشفة",
    linkVenue: "ربط نادٍ",
    unlinkVenue: "فك ارتباط النادي",
  },
  startClubGroup: {
    title: "ابدأ مجموعة نادوية",
    description: "تبقى المجموعات النادوية داخل هذا المجتمع.",
  },
  createClubGroupDescription: "مجموعة داخل هذا المجتمع.",
  noGroupsEmpty: {
    title: "لا مجموعات بعد",
    description: "لا مجموعات في هذا المجتمع بعد.",
  },
  noTeamsEmpty: {
    title: "لا فرق مرتبطة",
    description: "لا فرق مرتبطة بهذا المجتمع بعد.",
  },
  noMembersEmpty: {
    title: "لا أعضاء بعد",
    description: "يظهر هنا من ينضم إلى هذا المجتمع.",
  },
  membersNoMatch: "لا أعضاء بهذا الاسم.",
  inviteBlock: {
    title: "دعوة لاعبين",
    description: "ادعُ لاعبين إلى هذا المجتمع ومجموعاته النادوية.",
    action: "مشاركة رابط الدعوة",
  },
  lookupNote: "يمكن للمالكين والمشرفين دعوة الأشخاص. الدعوات لا تنتهي.",
  requestsEmpty: {
    title: "لا طلبات معلّقة",
    description: "تظهر هنا طلبات الانضمام إلى المجتمع وطلبات ربط الفرق.",
  },
  joinRequestsTitle: "طلبات الانضمام",
  joinRequestsErrorTitle: "تعذّر تحميل طلبات الانضمام",
  teamLinkRequestsTitle: "طلبات ربط الفرق",
  teamLinkRequestsErrorTitle: "تعذّر تحميل طلبات ربط الفرق",
  membersErrorTitle: "تعذّر تحميل الأعضاء",
  linkVenue: {
    title: "ربط نادٍ",
    description: "ابحث عن النوادي الفعّالة بالاسم أو المدينة أو البلد.",
    searchLabel: "البحث في النوادي",
    none: "لا نوادي فعّالة مطابقة.",
    errorTitle: "تعذّر تحميل النوادي",
    requestLabel: "طلب الربط",
    requestLinkTo: (venue: string) => `طلب الربط بـ${venue}`,
  },
  badge: {
    softArchived: "مؤرشف",
    joinPending: "طلب الانضمام معلّق",
    joinRejected: "طلب الانضمام مرفوض",
  },
  archiveBanner: {
    member: {
      heading: "مؤرشف",
      body: "تبقى المجموعات النادوية مرتبطة. ما زال بإمكانك فتح المجموعات ورؤية السجل والمباريات. الانضمامات والطلبات والدعوات المباشرة وروابط الدعوة متوقفة حتى يلغي مالك أو مشرف الأرشفة.",
    },
    visitor: {
      heading: "هذا المجتمع مؤرشف",
      body: "غير مفتوح للانضمام أو الطلبات أو الدعوات. ما زال بإمكان الأعضاء فتح السجل والمباريات. هذه ليست صفحة مفقودة.",
    },
  },
  linkedTeamBlocksLeave:
    "لا يمكنك المغادرة ما دمت في فريق مرتبط بهذا المجتمع. فك ارتباط الفريق أو حلّه أولًا.",
  lastOwner:
    "أنت المالك الأخير. رقِّ شخصًا آخر قبل المغادرة أو خفض دورك. المغادرة لا تؤرشف هذا المجتمع.",
  leaveConfirm: {
    title: (name: string) => `مغادرة ${name}؟`,
    description: "ستغادر هذا المجتمع ومجموعاته النادوية.",
  },
  archiveConfirm: {
    title: (name: string) => `أرشفة ${name}؟`,
    description:
      "تتوقف الانضمامات والطلبات والدعوات حتى يلغي مالك أو مشرف الأرشفة.",
  },
  unlinkVenueConfirm: {
    title: (venue: string) => `فك ارتباط ${venue}؟`,
    titleGeneric: "فك ارتباط النادي؟",
    description: "لن يبقى هذا المجتمع مرتبطًا بذلك النادي.",
  },
  venue: {
    location: (city: string, country: string) => `${city}، ${country}`,
    requestPending: (where: string) => `طلب ربط النادي معلّق لـ${where}.`,
    requestRejected: (venue: string) =>
      `رُفض آخر طلب لربط النادي ${venue}. يمكنك الطلب مجددًا.`,
    noVenue: "هذا المجتمع غير مرتبط بنادٍ.",
    noCourts: "لا ملاعب.",
    count: (n: number) =>
      plural("ar", n, {
        one: "نادٍ واحد",
        two: "ناديان",
        few: "{n} نوادٍ",
        many: "{n} ناديًا",
        other: "{n} نادٍ",
      }),
  },
  joined: "منضم",
  memberFallback: "عضو",
  userFallback: "مستخدم",
  from: (name: string) => `من ${name}`,
  meta: {
    youAreRole: (role: string) => `أنت ${role}`,
    twoSports: (first: string, second: string) => `${first} و${second}`,
  },
  roleChange: {
    selfTitle: (role: string) => `تغيير دورك إلى ${role}؟`,
    selfDescription:
      "لن تتمكن بعدها من تغيير أدوار المجتمع. لا يمكن إلا لمالك آخر أن يجعلك مالكًا مجددًا.",
    becomeRole: (role: string) => `أصبح ${role}`,
    makeOwnerTitle: (name: string) => `جعل ${name} مالكًا؟`,
    makeOwnerDescription: "يمكن للمالكين تغيير دور كل عضو، بما في ذلك دورك.",
    makeOwnerLabel: "جعله مالكًا",
  },
  sports: {
    title: "الرياضات",
    description:
      "يمكن للمجموعات النادوية والفرق في هذا المجتمع استخدام هذه الرياضات.",
    addedToast: "أُضيفت الرياضة",
    removedToast: "أُزيلت الرياضة",
    createLabel: "الرياضات",
    createHelp: "اختر واحدة على الأقل.",
  },
} satisfies typeof source;
