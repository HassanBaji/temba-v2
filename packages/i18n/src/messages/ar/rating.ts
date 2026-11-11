import { isolate } from "../../bidi";
import { plural } from "../../plural";
import type { rating as source } from "../en/rating";

export const rating = {
  bands: {
    shark: "قرش",
    hamour: "هامور",
    kanaad: "كنعد",
    safi: "صافي",
  },
  provisional: "مبدئي",
  scope: {
    group: "تُحتسب في فئة المجموعة",
    groupNote:
      "تحرّك نقاط الفئة في هذه المجموعة فقط. مستويات Temba تتحرّك في المجموعات الموثّقة.",
  },
  tier: {
    columnTier: "الفئة",
    columnPlayer: "اللاعب",
    columnPoints: "النقاط",
    theShark: "القرش",
    points: (points: string) => `${isolate(points)} نقطة`,
    sharkFor: (points: string, weeks: number) =>
      plural("ar", weeks, {
        zero: `${isolate(points)} نقطة، في الصدارة منذ أقل من أسبوع`,
        one: `${isolate(points)} نقطة، في الصدارة منذ أسبوع`,
        two: `${isolate(points)} نقطة، في الصدارة منذ أسبوعين`,
        few: `${isolate(points)} نقطة، في الصدارة منذ {n} أسابيع`,
        other: `${isolate(points)} نقطة، في الصدارة منذ {n} أسبوعًا`,
      }),
    place: (place: number) => `#${place}`,
    provisionalGames: (games: number, of: number) =>
      `مبدئي، ${games} من ${of} مباريات`,
    noTier: "بلا فئة",
    withOrganizer: (label: string) => `${label}، منظّم`,
    stillProvisional: (n: number) =>
      plural("ar", n, {
        zero: "لا أحد مبدئي",
        one: "واحد ما زال مبدئيًا",
        two: "اثنان ما زالا مبدئيين",
        few: "{n} ما زالوا مبدئيين",
        other: "{n} ما زالوا مبدئيين",
      }),
    pointsSpoken: (points: string) => `${isolate(points)} نقطة فئة`,
    footnote:
      "الفئة والنقاط خاصة بهذه المجموعة: الهامور هم أعلى 15% بعد القرش، والكنعد الـ35% التالية، والصافي البقية. النقاط تأتي من مباريات هذه المجموعة فقط.",
  },
} satisfies typeof source;
