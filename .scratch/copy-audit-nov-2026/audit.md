# Temba Copy Audit, Nov 2026

Transcribed from `Temba Copy Audit Nov 2026.pdf` (Nov 4, 2026, @hassan). The audit was written against the Arabic UI of the mobile App. Rows read "Current → Proposed (Why)".

## Summary

Five problems repeat across all 16 screens:

1. English leaks into the Arabic UI: every day/time line ("Wed 10:30 AM - 12:00 PM"), "down", "L", "SEASON 1", and the whole Add player sheet.
2. Several words for one thing: لعبة vs مباراة, شاغر vs مفتوح vs مقعد, and المستوى used for both the letter grade and the number.
3. Arabic number agreement is wrong in places: "10 من 10 مشاركون", "2 مباراة", "10 لاعبًا".
4. Bidi breaks reverse mixed strings: "+C", "2 فبراير – 1 نوفمبر", and an unreadable "2–0".
5. Status copy contradicts the clock or the data: "تبدأ الآن" 42 minutes after kick-off, #1 in groups with no counted games, "آخر 3 مباريات" after 2 matches.

Order: adopt the glossary, fix the locale and plural helpers once, then work screen by screen.

## Glossary

One term per concept, applied to every Arabic string.

| Concept | Use | Retire | Note |
| --- | --- | --- | --- |
| Game / match | مباراة، مباريات | لعبة، ألعاب | Tab bar becomes المباريات |
| Friendly game | مباراة ودية | لعبة ودية | |
| Rated game | مباراة مصنّفة | لعبة مصنّفة | |
| Open spot | مكان شاغر، أماكن شاغرة | مفتوح، مقعد، مكان مفتوح | Card, lineup and settings all differ today |
| Level (the block) | المستوى | | Section heading only |
| Letter grade (C), the Level band | الفئة | المستوى | |
| Number (2.8), the Level | التقييم | المستوى | |
| Past games tab | السابقة | الملعوبة | |
| All-time | الإجمالي (profile), كل المواسم (group) | كل الأوقات | Literal translation of "All time" |
| Season | الموسم 1 | Season 1، SEASON 1 | Localize default season names |
| Win / loss marks | ف / خ | W / L | |
| Team size | 5 ضد 5 | 5 لكل فريق، 5 في كل جانب | Matches "2 ضد 2" on padel |
| Substitute | احتياط | بديل | Closer to how Gulf players say it |

## Cross-cutting fixes

### English in the Arabic UI

The date lines look like a formatter called without a locale. Format with `Intl.DateTimeFormat('ar-BH', { numberingSystem: 'latn' })` to get Arabic day names with Western digits. Settings promises dates in the chosen language, so fix the dates, not that sentence.

| Where | Current | Fix |
| --- | --- | --- |
| Home hero, home next card, games card, game actions sheet | Wed 10:30 AM - 12:00 PM | الأربعاء، 10:30 ص – 12:00 م |
| Profile level | down | تراجع |
| Profile recent form | L L | خ خ |
| Group standings | SEASON 1، Season 1، Season 2 | الموسم 1، الموسم 2 |
| Add player sheet | Entire sheet | See the Add player section |

### Arabic number agreement

Use `Intl.PluralRules('ar')` for every counted noun: 1 singular, 2 dual, 3–10 plural, 11+ singular accusative.

| Where | Current | Fix |
| --- | --- | --- |
| Create game summary | 10 لاعبًا | 10 لاعبين |
| Profile all-time | 2 مباراة | مباراتان |
| Games list, football card | 10 من 10 مشاركون، 0 شاغر | 0 من 10 لاعبين، 10 أماكن شاغرة |
| Home header | 2 هذا الأسبوع | مباراتان هذا الأسبوع |

### Bidi

Wrap grades, scorelines and dates inside Arabic text in `<bdi>` or `unicode-bidi: isolate` (on React Native, Unicode isolate marks U+2068 … U+2069).

- Home progress shows "+C" instead of "C+".
- Season range renders "2 فبراير – 1 نوفمبر"; it should read "2 نوفمبر – 1 فبراير".
- A win–loss "0–2" displays as "2–0" in RTL, so nobody can tell which side is wins. Label the numbers instead (see Home).
- "اليوم, تُلعب الآن" uses a Latin comma; use "،".

### Breaks of the locked design rules

- Arrow in button label: "متابعة ←" in the create flow becomes "متابعة".
- Middle-dot meta strings: "C · يسار" (lineup), "2026 · Al Ahli…" (create header), "5 لكل فريق · 10 لاعبًا" (summary). Use "،" or a second line.
- Hero stats from tiny samples: the big "2–0" on Home and "0% فوز" on Profile come from 2 games. Hide win rate until a minimum (5 rated matches) and say so: "تظهر نسبة الفوز بعد 5 مباريات".

## Home

The hero repeats the time twice and the level card uses المستوى for two different things; most fixes here are cuts.

| Element | Current | Proposed | Why |
| --- | --- | --- | --- |
| Section title | التالي | مبارياتك القادمة | التالي alone reads like a "Next" button |
| Section count | 2 هذا الأسبوع | مباراتان هذا الأسبوع | Dual form |
| Hero chip | بادل / لعبة | بادل، ودية | Slash separator; "game" adds nothing |
| Hero status | اليوم, تُلعب الآن | جارية الآن | Latin comma; match the game page wording |
| Hero meta | حتى 12:00 م / 90 د | حتى 12:00 م، 90 دقيقة | Slash separator |
| Hero date line | Wed 10:30 AM - 12:00 PM | الأربعاء 4 نوفمبر | English, and repeats the big time; show the date instead |
| Hero button | عرض اللعبة | عرض المباراة | Glossary |
| Next card | Thu 2:30 AM - 4:00 AM | Remove | Right side already says الخميس 2:30 ص |
| Next card meta | A'ali Cultural & Sports Club, 5 لكل ف… | Venue on one line, "كرة قدم، 5 ضد 5" on the next | Truncated mid-word |
| Next card count | 0 من 10 | 10 أماكن شاغرة | Says what the organizer needs |
| Link | كل الألعاب | كل المباريات | Glossary |
| Level header | المستوى … بادل | مستواك في البادل | One header instead of two labels |
| Number label | 2.8 المستوى | 2.8 التقييم | المستوى is already the letter |
| Trend | ↘ 0.4 آخر 3 مباريات | −0.4 في آخر مباراتين | Show the sign; he has played 2 |
| Progress | 1% من الطريق إلى C+ | 1% نحو C+ | Shorter; fix bidi |
| Provisional note | المستوى مبدئي. التظليل يعني غير مؤكد — العب نحو 3 ألعاب مصنّفة أخرى ويتأكد مستواك. | مستواك مبدئي. العب 3 مباريات مصنّفة أخرى لتأكيده. | Hatch already means "not yet"; "نحو" is vague |
| Recent hero | 2–0 | Remove; keep the 3-stat row | Unlabeled and reversed in RTL; tiny sample |
| Stat labels | لُعبت، فوز، خسارة | مباريات، فوز، خسارة | Parallel nouns |
| Ranking header | الترتيب … 7 مجموعات | ترتيبك … 7 مجموعات | Personal, like the rest of Home |
| Rank with no counted games | #1 من 8 | — with "لا مباريات محتسبة بعد" | #1 with 0 wins misleads |

## Games list

The padel card says the game type twice and uses three words for an empty seat; the football card's count line is garbled.

| Element | Current | Proposed | Why |
| --- | --- | --- | --- |
| Title and tab bar | الألعاب | المباريات | Glossary |
| Tabs | 2 القادمة / 2 الملعوبة | القادمة 2 / السابقة 2 | الملعوبة is unnatural; label before count |
| Spots | 3 أماكن مفتوحة | 3 أماكن شاغرة | Glossary |
| Time line | Wed 10:30 AM - 12:00 PM — A'ali | حتى 12:00 م، عالي | English; big time already shows the start |
| Type | لعبة ودية | مباراة ودية | Glossary |
| Seat labels | مفتوح | شاغر | Same word as the game page lineup |
| Footer left | لعبة ودية / Padel games | المجموعة / Padel games | Type already shown above |
| Football format | 5 لكل فريق | 5 ضد 5 | Glossary |
| Football status | الفرق غير جاهزة | بانتظار اللاعبين | Says what is actually missing |
| Football count | 10 من 10 مشاركون، 0 شاغر | 0 من 10 لاعبين، 10 أماكن شاغرة | Grammar and order |

## Game details and actions sheet

The status pill is wrong for the moment the screenshot was taken (11:12, game started 10:30), and the destructive actions under-explain what happens.

### Game details

| Element | Current | Proposed | Why |
| --- | --- | --- | --- |
| Status pill | تبدأ الآن | جارية الآن | Started 42 minutes ago |
| Pill states | — | تبدأ بعد 15 د / جارية الآن / انتهت، أدخل النتيجة | One pill, three clear states |
| End time | 10:30 ص حتى 12:00 | 10:30 ص حتى 12:00 م | Missing م |
| Price stat | — / السعر غير محدد | Value "غير محدد", label "السعر" | Label currently holds the value |
| Your seat meta | C · يسار | يسار، C | Middle dot banned |
| Team labels | الفريق A / الفريق B | الفريق أ / الفريق ب | Optional; keeps the lineup fully Arabic |
| Bottom bar title | أنت مشارك | أنت في التشكيلة | Ties to the lineup above |
| Bottom bar line | بقيت 3 أماكن لشغلها | ينقص 3 لاعبين | Shorter, natural |
| Live and not full | — | بدأت المباراة وينقص 3 لاعبين | Today the bar reads as if nothing started |

### Actions sheet

| Element | Current | Proposed | Why |
| --- | --- | --- | --- |
| Title | Wed 10:30 AM - 12:00 PM | الأربعاء، 10:30 ص – 12:00 م | English |
| Close registration | إغلاق التسجيل | Add subtitle: لن يتمكن أحد من الانضمام بعد الآن. | Every other row explains itself |
| Add player | إضافة لاعب | Add subtitle: برقم الهاتف، دون حاجة إلى التطبيق | Sets up the sheet that follows |
| Edit | تعديل اللعبة | تعديل المباراة | Glossary |
| Cancel | إلغاء اللعبة / يزيلها من تقويم لاعب واحد. | إلغاء المباراة / تُحذف من تقويم كل المسجّلين (1). | "One player" is you; say all, show the count |
| Leave | مغادرة اللعبة / يمكن أن يُفتح مكانك لشخص آخر. | مغادرة المباراة / يصبح مكانك شاغرًا لغيرك. | Drop the hedge |

When the organizer taps Leave, say what happens to the game: "أنت المنظّم. انقل التنظيم لمشارك آخر قبل المغادرة."

## Create game flow

The flow is well structured; the copy mostly needs trimming. Helper text repeats what the controls already show, and step 1's two options carry the same line, so it doesn't help anyone choose.

### Step 1: type

| Element | Current | Proposed | Why |
| --- | --- | --- | --- |
| Title | ماذا تُعِدّ؟ | ماذا تنظّم؟ | More natural; organizer framing |
| Subtitle | كلاهما يبدأ بملعب ووقت. بقية النموذج تتبع اختيارك. | نبدأ بالملعب والوقت، ثم نكمل حسب اختيارك. | "النموذج" (form) is system talk |
| Friendly game | لعبة ودية / مباراة واحدة. Temba يملأ المقاعد الشاغرة. | مباراة ودية / مباراة واحدة، ويساعدك Temba في ملء الأماكن الشاغرة. | Glossary; don't over-promise |
| Friendly tournament | بطولة ودية / عدة فرق في يوم واحد. | بطولة ودية / عدة فرق تتنافس في يوم واحد. | |
| Shared line | تُحتسب في تصنيفك (on both) | Once above the options: ودية، لكنها تُحتسب في مستواك. | Same line twice doesn't differentiate; "ودية" alone suggests unrated |
| Button | متابعة ← | متابعة | Arrow in label is banned |

### Step 3: time

| Element | Current | Proposed | Why |
| --- | --- | --- | --- |
| Header end time | 2:00 م حتى 3:30 | 2:00 م حتى 3:30 م | Missing م |
| Header meta | الأربعاء 4 نوفمبر 2026 · Al Ahli Sports Club & Stadium | Two lines: date, then venue | Middle dot; bidi mix |
| Section | اليوم | التاريخ | The first chip is also "اليوم" |
| Later date link | تاريخ لاحق | تاريخ آخر | |
| Start hint | بفواصل 30 دقيقة | Remove | Chips show it |
| Duration aside | 3:30 م | ينتهي 3:30 م | Bare time has no meaning |
| Custom chip | تحديد | مدة أخرى | "تحديد" means "select" |
| Helper paragraph | اليوم ووقت البدء وقت الانتهاء مطلوبة… | لليوم الحالي، تظهر الأوقات القادمة فقط. | Missing و; the rest repeats the UI |
| Next label | التالي: المستوى والسعر | Match step 4 per sport | Football step 4 has no level |

### Step 4: details

| Element | Current | Proposed | Why |
| --- | --- | --- | --- |
| Name helper | يظهر على اللعبة وفي أعلى رسالة الدعوة. | يظهر على المباراة وفي رسالة الدعوة. | Glossary; shorter |
| Team size heading | عدد لاعبي الفريق (twice) | حجم الفريق, once | Label repeats above the stepper |
| Max players | اللاعبون المسموح بهم | الحد الأقصى للاعبين | Clearer |
| Max helper | فريقان كاملان على الأقل. من يزيد عن ذلك يكون بديلًا. | الحد الأدنى فريقان كاملان، ومن يسجّل بعدهما يكون احتياطًا. | Reads as one rule |
| Price helper | اختياري. المبالغ بالدينار البحريني. حتى ثلاث خانات عشرية. اتركه فارغًا إن لم يُحدَّد. الصفر يعني مجانًا. Temba لا يحصّل أي مدفوعات. | اتركه فارغًا إن لم يُحدَّد بعد. الدفع بينكم مباشرة، وTemba لا يحصّل أي مبالغ. | Six sentences to two; the field and chips cover the rest |
| Summary players | 5 لكل فريق · 10 لاعبًا | 5 ضد 5، حتى 10 لاعبين | Grammar; middle dot |
| Button | إنشاء لعبة | إنشاء المباراة | Glossary |

## Add player sheet

The whole sheet is in English while the app is set to Arabic, so it needs localizing first. It also shows football roles; if it opens from the padel game's إضافة لاعب, it should ask for side (يسار / يمين / أي جهة) instead.

| Element | Current (EN) | Proposed (EN) | Proposed (AR) |
| --- | --- | --- | --- |
| Title | Add player | Add player | إضافة لاعب |
| Subtitle | Add someone by phone. They don't need Temba to play. | Add a player by phone number. They don't need the app to play. | أضِف لاعبًا برقم هاتفه. لا يحتاج إلى التطبيق ليلعب. |
| Field | Phone | Phone number | رقم الهاتف |
| Placeholder | 3612 4408 | 3XXX XXXX | 3XXX XXXX |
| New field | — | Name (optional). Shown in the lineup until they join. | الاسم (اختياري). يظهر في التشكيلة إلى أن ينضم. |
| Role label | Plays as | Role | الدور |
| Role options | Player / outfield, Keeper / in goal | Outfield, Goalkeeper | لاعب ميدان، حارس مرمى |
| Position label | Preferred position | Preferred position | المركز المفضّل |
| Positions | No preference, Defender, Midfield, Forward | Any, Defender, Midfielder, Forward | أي مركز، مدافع، وسط، مهاجم |
| Button | Add player | Add to game | إضافة إلى المباراة |

Why: "Plays as: Player" is circular; "Midfield" breaks the person-noun pattern of the other two; a realistic placeholder looks like a filled value (and may be someone's real number); and without a name, the lineup can only show a phone number.

## Groups

The Create group join toggle is the one real copy bug here: its title and subtitle describe opposite states. The rest is localization and small clarity fixes.

### Group detail

| Element | Current | Proposed | Why |
| --- | --- | --- | --- |
| Subtitle | بادل، 5 أعضاء، الموسم منذ سبتمبر | بادل، 5 أعضاء، منذ سبتمبر | Season 1 starts 2 Nov, so "season since September" contradicts it |
| Season title | SEASON 1 | الموسم 1 | English, all caps |
| Date range | نوفمبر 2 – 1 فبراير | 2 نوفمبر – 1 فبراير | Bidi |
| Empty state | لا ألعاب محسوبة | لا مباريات محتسبة بعد | Glossary; "بعد" signals it's early |
| Season tabs | Season 2 / Season 1 / كل الأوقات | الموسم 2 (قادم) / الموسم 1 / كل المواسم | Mark the future season |
| Table columns | ل ف ت خ نقاط | Same, hide ت for padel | Padel has no draws |
| Legend (cut off at bottom) | — | ل لعب، ف فوز، ت تعادل، خ خسارة. الفوز 3 نقاط والتعادل 1. | Single letters need a visible key |

Player names show as entered ("gerard", "MOHAMMED ALI"). Consider normalizing case for display.

### Group actions sheet

| Element | Current | Proposed | Why |
| --- | --- | --- | --- |
| Leave (owner) | مغادرة المجموعة | Disabled, subtitle: انقل الملكية أولًا. | Owner can't leave a group with no owner |
| Delete | حذف المجموعة | Add subtitle: يُحذف الترتيب وسجل المباريات لكل الأعضاء. | Say what is lost before the confirm |

### Edit group

| Element | Current | Proposed | Why |
| --- | --- | --- | --- |
| Sport lock | مقفلة بعد أول لعبة. الترتيب يعتمد عليها. | لا يمكن تغيير الرياضة بعد أول مباراة، لأن الترتيب مبني عليها. | Reads as one reason |
| Private | مخفية عن البحث. لا يجدها إلا من لديه الرابط. | مخفية عن البحث. لا يجدها إلا من لديه رابط الدعوة. | Ties to the next section |
| Invite link empty | لا رابط فعّال بعد. أنشئ واحدًا لمشاركته. | لا يوجد رابط دعوة بعد. | Button already says إنشاء رابط |

### Create group

| Element | Current | Proposed | Why |
| --- | --- | --- | --- |
| Football option | 5 إلى 11 في كل جانب | من 5 ضد 5 إلى 11 ضد 11 | Matches "2 ضد 2" |
| Under sport | — | لا يمكن تغيير الرياضة بعد أول مباراة. | Tell people before, not only in Edit |
| Join toggle title | تتطلب موافقة | مراجعة طلبات الانضمام | Names the action |
| Toggle subtitle | كل من يجد المجموعة ينضم فورًا. | Off: ينضم أي شخص يجد المجموعة مباشرة. On: توافق على كل طلب قبل انضمامه. | Title and subtitle currently contradict |
| Grey box | يمكن لأي شخص العثور على المجموعة والانضمام فورًا. | Remove | Repeats the subtitle |

## Profile

| Element | Current | Proposed | Why |
| --- | --- | --- | --- |
| Side | الجهة اليسرى | يلعب على اليسار | Bare "left side" has no verb |
| Level header | المستوى … بادل | مستواك في البادل | Same as Home |
| Trend | down / آخر مباراة | تراجع بعد آخر مباراة | English |
| Confirm progress | 3 من نحو 6 ألعاب مصنّفة للتأكيد | 3 من 6 مباريات مصنّفة لتأكيد مستواك | Give an exact target |
| Recent form | L L | خ خ | English letters |
| Block title | كل الأوقات / منذ 2026 | الإجمالي / منذ 2026 | Literal translation |
| Matches | 2 مباراة | مباراتان | Dual |
| Record | 0–2 / 0% فوز | 0 فوز، 2 خسارة | Readable in RTL; hide rate under 5 games |
| Sets | الأشواط 1–5 | الأشواط: 1 فوز، 5 خسارة | Unlabeled and direction unclear |

## Settings

| Element | Current | Proposed | Why |
| --- | --- | --- | --- |
| Preferred side subtitle | جهتك الافتراضية عند اختيار مقعد في لعبة | جهتك الافتراضية عند اختيار مكانك في مباراة | Glossary |
| Side helper | نبدأ بك على اليسار عند التسجيل مع شريك. | عند التسجيل مع شريك، نضعك على اليسار تلقائيًا. | Clearer cause and effect; keep it dynamic per choice |
| Teams subtitle | الشراكات التي تلعب بها | الفرق والثنائيات التي تلعب فيها | "الشراكات" sounds like business partnerships; stays sport-agnostic |
| Invites subtitle | الدعوات المباشرة الموجّهة إليك | دعوات المباريات والمجموعات الموجّهة إليك | Says what kind |
| Language subtitle | تظهر القوائم والرسائل والتواريخ بهذه اللغة | Keep | True once dates are localized |

## Bugs to verify

Not copy problems; rewording won't fix them.

- Football game at Thu 2:30 AM. Likely an AM/PM or UTC+3 offset bug in how times are stored or shown.
- Match counts disagree. Home says "آخر 3 مباريات" and Profile says 3 rated games, but both screens show 2 played.
- #1 in all 7 groups with 0 wins and no counted games. Empty standings tie everyone at rank 1.
- Sets 5–1 across two lost matches. In best-of-3, two losses allow at most 4 sets lost; check the aggregation and its direction.
- Game status thresholds: "تبدأ الآن" still shows 42 minutes after start.
- Step 3 "Next" label says المستوى والسعر, but football's step 4 has no level.
- Group subtitle says the season began in September; Season 1 starts 2 Nov.
- Draw column shows on a padel group's standings.
- Add player on a padel game shows football roles. Confirm which sheet the padel game opens.
- Owner can tap Leave group with no ownership transfer guard.
