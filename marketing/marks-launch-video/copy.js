// All on-screen text. Every string here renders as live text, so a new
// language is a new block below plus `?lang=<code>` on the page URL.
// Mark names, descriptions and giver groups match the app's Message catalogs
// in packages/i18n/src/messages/{en,ar}/marks.ts.
// A string left as null in a language falls back to English.
window.COPY = {
  en: {
    dir: "ltr",
    intro: "Great games deserve more than a score.",
    card: {
      played: "Played, Wed 4 Nov",
      format: "Friendly game, padel",
      sets: "6–4  7–5",
      venue: "Gooz of Arad, Court 3, 90 min",
      won: "Won",
      lost: "Lost",
      mvp: "MVP, by vote 3 of 4",
      players: [
        { initials: "YK", name: "Yousif Kadhem", role: "Right side" },
        { initials: "AM", name: "Ali Mansoor", role: "Left side" },
        { initials: "BF", name: "Bo Fareed", role: "Right side" },
        { initials: "KR", name: "Khalid R", role: "Left side" },
      ],
    },
    headline: "Introducing\nMarks",
    subline: "Post-game honors from the people you played with.",
    groups: {
      teammate: "From your teammate or partner",
      anyone: "From anyone in the game",
      opponent: "From the other side",
    },
    marks: {
      mvp: { name: "MVP", description: "Most valuable player, one per game." },
      clutch: { name: "Clutch", description: "Won the points that mattered." },
      mr_ice: { name: "Mr Ice", description: "Never cracked under pressure." },
      let_him_cook: {
        name: "Let him cook",
        description: "I stepped back and let him run the game.",
      },
      great_wall: { name: "The Great Wall", description: "Nothing got past." },
      comeback_king: {
        name: "Comeback King",
        description: "Came back from a lost position.",
      },
      sayed_malek: {
        name: "Sayed Malek",
        description: "Played like a sleepy old man. Nap time on court.",
      },
      dynamo: {
        name: "Dynamo",
        description: "Covered every ball and never stopped running.",
      },
      smash_machine: {
        name: "Smash Machine",
        description: "Couldn’t stop putting balls away.",
      },
      underdog: { name: "Underdog", description: "Nobody expected the win." },
      good_game: { name: "Good Game", description: "Fair, fun, respect." },
      mr_fumble: {
        name: "Mr Fumble",
        description: "Had it in his hands. Dropped it anyway.",
      },
    },
    cabinet: {
      player: "Yousif Kadhem",
      initials: "YK",
      sport: "Padel",
      title: "Marks",
      received: "{n} received",
      count: "×{n}",
      notYet: "Not yet",
    },
    outro: ["Give them.", "Earn them.", "Keep them."],
    end: {
      wordmark: "TEMBA",
      tagline: "LIVE THE GAME",
      download: "Download on the App Store and Google Play",
    },
  },

  // Product strings below come from the Arabic catalog. The marketing lines
  // (intro, card, headline, subline, outro, end) are null until written.
  ar: {
    dir: "rtl",
    intro: null,
    card: null,
    headline: null,
    subline: null,
    groups: {
      teammate: "من زميلك أو شريكك",
      anyone: "من أي لاعب في المباراة",
      opponent: "من الفريق الآخر",
    },
    marks: {
      mvp: {
        name: "نجم المباراة",
        description: "أفضل لاعب، واحد في كل مباراة.",
      },
      clutch: { name: "رجل الحسم", description: "فاز بالنقاط المهمة." },
      mr_ice: { name: "أعصاب حديد", description: "لم ينهر تحت الضغط." },
      let_him_cook: {
        name: "خلّوه يطبخ",
        description: "تراجعت خطوة وتركته يقود المباراة.",
      },
      great_wall: { name: "سور الصين", description: "لم يمرّ منه شيء." },
      comeback_king: {
        name: "ملك الريمونتادا",
        description: "عاد من موقف خاسر.",
      },
      sayed_malek: {
        name: "سيد مالك",
        description: "لعب كشيخ نعسان. وقت القيلولة في الملعب.",
      },
      dynamo: {
        name: "الدينامو",
        description: "غطّى كل كرة ولم يتوقف عن الركض.",
      },
      smash_machine: {
        name: "ماكينة سماش",
        description: "لم يتوقف عن إنهاء الكرات.",
      },
      underdog: {
        name: "الحصان الأسود",
        description: "لم يتوقع أحد هذا الفوز.",
      },
      good_game: {
        name: "يعطيك العافية",
        description: "لعب نظيف، ومتعة، واحترام.",
      },
      mr_fumble: {
        name: "أبو زلّة",
        description: "كانت في يده، وأفلتها رغم ذلك.",
      },
    },
    cabinet: null,
    outro: null,
    end: null,
  },
};
