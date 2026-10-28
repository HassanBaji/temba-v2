export type TermsClause = {
  label?: string;
  text: string;
  bullets?: string[];
};

export type TermsSection = {
  number: number;
  title: string;
  clauses: TermsClause[];
};

export const TERMS_UPDATED = "27 October 2026";

export const TERMS_MINIMUM_AGE = 16;

export const TERMS_CONTACT_EMAIL = "hassan@temba.app";

export const TERMS_SECTIONS: TermsSection[] = [
  {
    number: 1,
    title: "About Temba and acceptance of these Terms",
    clauses: [
      {
        label: "1.1",
        text: 'Temba is a sports community platform, available as a mobile app and website, that lets players create and join games, form groups, take part in tournaments and challenges, record scores, and track levels, rankings and match history. Temba is operated by Hassan Haji, an individual based in the Kingdom of Bahrain ("Temba", "we", "us").',
      },
      {
        label: "1.2",
        text: 'By creating an account or using Temba, you agree to these Terms & Conditions ("Terms") and our Privacy Policy. If you do not agree, do not create an account or use Temba.',
      },
      {
        label: "1.3",
        text: "Some features (such as tournaments, court bookings or paid events) may have additional rules shown when you join them. Those rules form part of these Terms. If they conflict with these Terms, the feature-specific rules apply to that feature.",
      },
      {
        label: "1.4",
        text: 'These Terms are effective from the "Last updated" date shown at the top.',
      },
    ],
  },
  {
    number: 2,
    title: "Definitions",
    clauses: [
      { label: "Account", text: "your registered Temba profile." },
      {
        label: "Player or you",
        text: "any person who registers an account to play or take part in activities on Temba.",
      },
      {
        label: "Organizer",
        text: "a player who creates a game, group, tournament or challenge, or who manages a group.",
      },
      {
        label: "Game",
        text: "any match, session or fixture created on Temba, whether friendly, part of a tournament, or arising from a challenge.",
      },
      {
        label: "Group",
        text: "a community of players on Temba with its own members, games and standings.",
      },
      {
        label: "Tournament",
        text: "a structured competition on Temba, such as group stages followed by elimination brackets.",
      },
      {
        label: "Challenge",
        text: "a request by one team to play another team, which becomes a Game once accepted.",
      },
      {
        label: "Venue",
        text: "a club, court, pitch or facility where a Game is played, owned and run by a third party.",
      },
      {
        label: "Level and Ranking",
        text: "the ratings, grades and positions Temba calculates from results.",
      },
      {
        label: "Content",
        text: "anything you submit to Temba, including your profile, photos, messages, scores and comments.",
      },
    ],
  },
  {
    number: 3,
    title: "Eligibility and your account",
    clauses: [
      {
        label: "3.1",
        text: "You must be at least 16 years old to create an account. If you are under 18, your parent or legal guardian must review and accept these Terms for you and is responsible for your use of Temba.",
      },
      {
        label: "3.2",
        text: "You must give accurate information when you sign up, including your real name, and keep it up to date. One person may hold only one account. Accounts may not be shared, sold or transferred.",
      },
      {
        label: "3.3",
        text: "You are responsible for keeping your login details and verification codes secure and for all activity on your account. Tell us immediately at hassan@temba.app if you think your account has been accessed without permission.",
      },
      {
        label: "3.4",
        text: "You may not create an account if we have previously suspended or removed you from Temba, unless we agree in writing.",
      },
      {
        label: "3.5",
        text: "We may ask you to verify your phone number, email or identity before you can use certain features, such as tournaments with prizes or paid bookings.",
      },
    ],
  },
  {
    number: 4,
    title: "Profiles, levels and rankings",
    clauses: [
      {
        label: "4.1",
        text: "Your profile name, photo, level, ranking, match history and results are visible to other players on Temba. You can control some visibility in your settings.",
      },
      {
        label: "4.2",
        text: "Levels and rankings are calculated automatically from results entered and confirmed on Temba. They are an indication for matchmaking and fun, not an official rating by any sports federation, and we do not guarantee their accuracy.",
      },
      {
        label: "4.3",
        text: "You may set or be given a starting level. We may adjust levels or rankings at any time to correct errors, reverse results found to be false, or improve how they are calculated.",
      },
      {
        label: "4.4",
        text: "You must not manipulate your level or ranking, for example by entering false scores, deliberately losing, creating fake opponents, or colluding with other players.",
      },
    ],
  },
  {
    number: 5,
    title: "Games, groups, tournaments and challenges",
    clauses: [
      {
        label: "5.1",
        text: "Joining. When you join a game, tournament slot or challenge, you commit to turning up on time at the stated venue. Organizers may set a level range, group membership or other conditions for joining.",
      },
      {
        label: "5.2",
        text: "Leaving and no-shows. You may leave a game before the cut-off time set by the organizer or Temba. Leaving late or not turning up without notice may be recorded on your profile and may limit your ability to join future games.",
      },
      {
        label: "5.3",
        text: "Scores. Scores must be entered honestly after each game. Where a score must be confirmed by the other side, it is not final until confirmed. Disputed scores may be decided by the organizer or by Temba, and that decision is final for ranking purposes.",
      },
      {
        label: "5.4",
        text: "Organizers. Organizers are players, not employees or agents of Temba. They are responsible for the accuracy of their game details, for managing members fairly, and for resolving partnerless players, schedule changes and disputes in their games. Temba is not responsible for decisions organizers make.",
      },
      {
        label: "5.5",
        text: "Tournaments. Each tournament's format, rules, entry fee, prizes and schedule are set by its organizer and shown before you join. Tournament results, standings and brackets on Temba are the official record for that tournament unless the organizer announces otherwise. Prizes are the responsibility of the organizer or sponsor named in the tournament, not Temba, unless Temba is the stated organizer.",
      },
      {
        label: "5.6",
        text: "Challenges. A challenge becomes a game once the other team accepts and proposes a time and venue. Both teams are then bound by the same rules as any other game, including the no-show rules in 5.2.",
      },
      {
        label: "5.7",
        text: "Groups. Group admins may set their own house rules, accept or remove members, and manage group standings, provided those rules do not conflict with these Terms.",
      },
    ],
  },
  {
    number: 6,
    title: "Player conduct and fair play",
    clauses: [
      {
        label: "6.1",
        text: "Temba is a community. On the platform and at every game, you agree to treat other players, organizers, referees and venue staff with respect.",
      },
      {
        label: "6.2",
        text: "You must not:",
        bullets: [
          "harass, threaten, bully, insult or discriminate against anyone, including on the basis of nationality, religion, sex, age or disability;",
          "use violence, or behave in a way that endangers others on or off court;",
          "post content that is obscene, defamatory, hateful, misleading, or that violates public morals or the laws of the Kingdom of Bahrain;",
          "impersonate another person or create fake accounts;",
          "enter false scores, fix results or manipulate rankings;",
          "collect other players' personal data, or contact them for purposes unrelated to playing, such as unsolicited selling or spam;",
          "use Temba to organize gambling or betting on results;",
          "copy, scrape, reverse engineer or interfere with the app, its servers or its security;",
          "use Temba for any commercial purpose, such as running paid coaching or sessions, without our written permission.",
        ],
      },
      {
        label: "6.3",
        text: "You must follow each venue's own rules, dress code and safety instructions.",
      },
    ],
  },
  {
    number: 7,
    title: "Your content, reporting and blocking",
    clauses: [
      {
        label: "7.1",
        text: "You own the content you submit. You grant Temba a non-exclusive, worldwide, royalty-free licence to host, store, display, reproduce and adapt it for operating, improving and promoting Temba, for as long as it remains on Temba and for a reasonable time afterwards in backups. Promotional use of your name or photo outside the app requires your separate opt-in.",
      },
      {
        label: "7.2",
        text: "You confirm that you have the right to post your content, and that any photo you upload of other people was taken and shared with their permission.",
      },
      {
        label: "7.3",
        text: "Scores, results and match history form part of other players' records too. If you delete your account, we may keep those results in anonymised form so other players' history and rankings stay accurate.",
      },
      {
        label: "7.4",
        text: "You can report any player, message or content through the report option in the app, or by emailing hassan@temba.app. We review reports and aim to act on them within 24 hours. You can also block any player so they cannot contact you or see your activity.",
      },
      {
        label: "7.5",
        text: "We may remove any content, without notice, that we believe breaches these Terms or the law.",
      },
    ],
  },
  {
    number: 8,
    title: "Health, safety and assumption of risk",
    clauses: [
      {
        label: "8.1",
        text: "Padel, football and other sports are physical activities that carry an inherent risk of injury, including sprains, fractures, eye injuries from balls or rackets, heat illness and, rarely, serious injury. Bahrain's heat adds risk at outdoor venues.",
      },
      {
        label: "8.2",
        text: "You are solely responsible for deciding whether you are fit to play. You should consult a doctor before taking part if you have any medical condition or doubt about your fitness, and you should stop playing if you feel unwell.",
      },
      {
        label: "8.3",
        text: "You take part in every game, tournament and challenge voluntarily and at your own risk. You are responsible for using appropriate equipment, such as proper footwear and protective eyewear where recommended, and for staying hydrated.",
      },
      {
        label: "8.4",
        text: "Temba does not run venues, supervise games, or provide medical staff, referees or insurance. The condition and safety of courts, pitches and facilities are the responsibility of the venue.",
      },
      {
        label: "8.5",
        text: "We recommend that you hold personal accident or sports insurance.",
      },
      {
        label: "8.6",
        text: "Nothing in these Terms excludes liability for death or personal injury caused by our own gross negligence or wilful misconduct, or any other liability that cannot be excluded under Bahraini law.",
      },
    ],
  },
  {
    number: 9,
    title: "Bookings, payments, cancellations and refunds",
    clauses: [
      {
        text: "This section applies when you pay through Temba, for example for a court booking, a game share or a tournament entry fee.",
      },
      {
        label: "9.1",
        text: "Prices. Prices are shown in Bahraini Dinars (BHD) and include VAT where it applies. Any service fee charged by Temba or the payment provider is shown before you pay.",
      },
      {
        label: "9.2",
        text: "Who you are paying. Unless stated otherwise, Temba collects payments on behalf of the venue or organizer and passes them on. Your contract for the court, pitch or event is with that venue or organizer.",
      },
      {
        label: "9.3",
        text: "Payment processing. Payments are processed by a licensed third-party payment provider. Temba does not store your full card details.",
      },
      {
        label: "9.4",
        text: "Splitting costs. Where a booking is split between players, each player is responsible for their own share. If a player does not pay, the organizer who made the booking remains responsible to the venue.",
      },
      {
        label: "9.5",
        text: "Cancellations by you. You may cancel for a full refund up to 24 hours before the start time, unless the venue or event shows a different policy before you pay. Late cancellations and no-shows are not refunded.",
      },
      {
        label: "9.6",
        text: "Cancellations by the venue, organizer or Temba. If a booking or event is cancelled by the venue, organizer or Temba, or cannot go ahead because of weather or venue closure, you will receive a full refund or, if you choose, a credit.",
      },
      {
        label: "9.7",
        text: "Tournament entry fees. Entry fees are non-refundable once the draw or groups are published, unless the tournament is cancelled.",
      },
      {
        label: "9.8",
        text: "Refund timing. Approved refunds are returned to the original payment method, normally within 7 to 14 working days, depending on your bank.",
      },
      {
        label: "9.9",
        text: "Chargebacks. Raising a chargeback for a payment you made and used may lead to suspension of your account.",
      },
    ],
  },
  {
    number: 10,
    title: "Privacy and personal data",
    clauses: [
      {
        label: "10.1",
        text: "We process your personal data in line with Bahrain's Personal Data Protection Law, Law No. (30) of 2018, and our Privacy Policy, which forms part of these Terms.",
      },
      {
        label: "10.2",
        text: "What we collect. Your name, phone number, email, photo, date of birth, gender if you choose to give it, sport preferences, level, games, scores, rankings, group memberships, messages, approximate location if you allow it, device and usage data, and payment records for transactions through Temba.",
      },
      {
        label: "10.3",
        text: "Why we use it. To create and run your account, match you with games and players, calculate levels and rankings, show your profile and results to other players, process payments, keep Temba safe, handle reports, send service messages, and, if you opt in, send marketing.",
      },
      {
        label: "10.4",
        text: "Who sees it. Other players see your public profile and results. Organizers of games you join see what they need to run the game. We share data with service providers that host Temba, send messages or process payments, with venues for bookings you make, and with authorities where the law requires.",
      },
      {
        label: "10.5",
        text: "Storage outside Bahrain. Some of our service providers may store data outside Bahrain. We only transfer data to countries the Personal Data Protection Authority recognises as adequate, or with your consent or other safeguards the law allows.",
      },
      {
        label: "10.6",
        text: "Your rights. You can ask to access, correct or delete your data, object to certain processing, and withdraw consent at any time by contacting hassan@temba.app or using the in-app settings. You can also complain to the Personal Data Protection Authority.",
      },
      { label: "10.7", text: "We do not sell your personal data." },
    ],
  },
  {
    number: 11,
    title: "Communications",
    clauses: [
      {
        label: "11.1",
        text: "By creating an account, you agree to receive service messages about your account, games, scores, tournaments, bookings and payments by push notification, SMS, email or in-app message. These are part of how Temba works.",
      },
      {
        label: "11.2",
        text: "Marketing messages are only sent if you opt in, and every marketing message lets you unsubscribe.",
      },
      {
        label: "11.3",
        text: "You can manage push notifications in your phone settings and notification preferences in the app.",
      },
    ],
  },
  {
    number: 12,
    title: "Venues and third-party services",
    clauses: [
      {
        label: "12.1",
        text: "Venues, clubs, sponsors and other third parties listed on Temba are independent businesses. Temba does not own, run or control them and is not responsible for their facilities, staff, availability, pricing or conduct.",
      },
      {
        label: "12.2",
        text: "Temba may link to or use third-party services, such as maps, sign-in providers, payment providers and app stores. Your use of those services is subject to their own terms.",
      },
      {
        label: "12.3",
        text: "Any issue with a venue's facilities or service should be raised with the venue. We will help where we reasonably can.",
      },
    ],
  },
  {
    number: 13,
    title: "Intellectual property",
    clauses: [
      {
        label: "13.1",
        text: "Temba, its name, logo, ball mark, design, software, level and ranking system, and all content we create are owned by Hassan Haji or our licensors and are protected by intellectual property laws.",
      },
      {
        label: "13.2",
        text: "We give you a personal, non-exclusive, non-transferable, revocable licence to use the Temba app and website for your own non-commercial use in line with these Terms.",
      },
      {
        label: "13.3",
        text: "You may not copy, modify, distribute, sell or create derivative works from any part of Temba, or use the Temba name or logo, without our written permission.",
      },
      {
        label: "13.4",
        text: "If you send us feedback or ideas, we may use them freely without any obligation to you.",
      },
    ],
  },
  {
    number: 14,
    title: "Suspension, termination and deleting your account",
    clauses: [
      {
        label: "14.1",
        text: "You can leave at any time. You can delete your account from inside the app at Settings > Account > Delete account or by emailing hassan@temba.app. Deletion is permanent. We delete or anonymise your personal data within 30 days, except where we must keep it by law (for example payment records) or as described in 7.3.",
      },
      {
        label: "14.2",
        text: "We may suspend or remove you. We may warn you, restrict features, suspend or permanently close your account, with or without notice, if you breach these Terms, behave unsafely or abusively at a game, repeatedly fail to show up, manipulate results, or if the law requires us to.",
      },
      {
        label: "14.3",
        text: "Where reasonable, we will tell you why and give you a chance to respond. You can appeal a decision by emailing hassan@temba.app.",
      },
      {
        label: "14.4",
        text: "We may change, pause or discontinue any feature or Temba as a whole. If we close Temba entirely, we will give reasonable notice and refund any unused prepaid amounts.",
      },
      {
        label: "14.5",
        text: "Sections that by their nature should survive termination, including 7, 13, 15, 16 and 18, continue to apply after your account ends.",
      },
    ],
  },
  {
    number: 15,
    title: "Disclaimers and limitation of liability",
    clauses: [
      {
        label: "15.1",
        text: 'Temba is provided "as is" and "as available". We work to keep it accurate, secure and running, but we do not guarantee it will be uninterrupted, error-free, or that games, opponents, venues or results will match your expectations.',
      },
      {
        label: "15.2",
        text: "Temba is a platform that connects players. We are not a party to arrangements between players, organizers and venues, and we do not vet players or guarantee their identity, level, behaviour or attendance.",
      },
      {
        label: "15.3",
        text: "To the fullest extent permitted by Bahraini law, Temba is not liable for:",
        bullets: [
          "injury, illness, loss or damage arising from taking part in games, tournaments or challenges, or from the condition of any venue;",
          "the acts or omissions of other players, organizers, venues, sponsors or third-party services;",
          "loss or theft of personal belongings at venues;",
          "indirect or consequential loss, such as loss of income or opportunity;",
          "loss of data, rankings or match history caused by events outside our reasonable control.",
        ],
      },
      {
        label: "15.4",
        text: "Where Temba is found liable, our total liability to you for any claim is limited to the greater of the amount you paid to Temba in the 12 months before the claim and BHD 50.",
      },
      {
        label: "15.5",
        text: "Nothing in these Terms limits liability that cannot be limited under Bahraini law, including liability for gross negligence, fraud or wilful misconduct, or your rights as a consumer.",
      },
    ],
  },
  {
    number: 16,
    title: "Indemnity",
    clauses: [
      {
        text: "You agree to compensate Temba, its owner and team for any claims, losses, damages and reasonable legal costs arising from your breach of these Terms, your content, or your conduct at a game or on the platform, including injury or damage you cause to another person.",
      },
    ],
  },
  {
    number: 17,
    title: "Changes to these Terms",
    clauses: [
      {
        label: "17.1",
        text: "We may update these Terms as Temba grows, for example when we add football, bookings or new features. The date at the top shows the latest version.",
      },
      {
        label: "17.2",
        text: "For significant changes, we will notify you in the app or by email at least 14 days before they take effect and may ask you to accept the new Terms. If you keep using Temba after that date, you accept the updated Terms. If you do not agree, you can delete your account.",
      },
    ],
  },
  {
    number: 18,
    title: "Governing law, language and disputes",
    clauses: [
      {
        label: "18.1",
        text: "These Terms are governed by the laws of the Kingdom of Bahrain.",
      },
      {
        label: "18.2",
        text: "If you have a complaint, please contact us first at hassan@temba.app. We will try to resolve it within 30 days.",
      },
      {
        label: "18.3",
        text: "Any dispute that cannot be resolved informally will be submitted to the competent courts of the Kingdom of Bahrain.",
      },
      {
        label: "18.4",
        text: "These Terms are available in Arabic and English. If there is any conflict between the two, the Arabic version prevails.",
      },
      {
        label: "18.5",
        text: "If any part of these Terms is found invalid, the rest remains in force. Our failure to enforce a provision is not a waiver of it. You may not transfer your rights under these Terms; we may transfer ours to a successor operating Temba.",
      },
    ],
  },
  {
    number: 19,
    title: "Contact",
    clauses: [
      { text: "Hassan Haji, Kingdom of Bahrain" },
      { label: "Phone", text: "+973 32121766" },
      { label: "Email", text: "hassan@temba.app" },
      { label: "In-app", text: "Settings > Help & Support" },
    ],
  },
];
