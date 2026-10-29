# Temba

Temba is a competitive-sports product. This glossary is the language for the Workspace (how the codebase is cut) and for the product domain (what players belong to).

## Language

### Workspace

**Workspace**:
This git repository as a pnpm + Turborepo workspace.
_Avoid_: monorepo, project, repo (when you mean the Workspace), “the app”

**App**:
A deployable application under `apps/`. Temba has three planned Apps: the Web App, the API App and the Mobile App.
_Avoid_: package, site, frontend, service

**Web App**:
The Next.js App in `apps/web`, package name `web`. It serves the browser UI only. Its `/api/*` paths are rewritten to the API App.
_Avoid_: temba (its old name), dashboard, frontend, site

**API App**:
The Hono host in `apps/api`. It verifies the session, builds the context and mounts the tRPC routers from `@repo/api`. It holds no business logic.
_Avoid_: backend, server (when you mean this App), service

**Mobile App**:
The planned Expo App in `apps/mobile` for iOS and Android. It calls the API App over HTTP and never imports server code.
_Avoid_: native app, iOS app (it targets both platforms), client (when you mean this App)

**Package**:
A shared library under `packages/`, consumed with `workspace:*`.
_Avoid_: app, module, library (when you mean a Workspace Package)

**DB Package**:
The Package named `@repo/db`. It owns the Drizzle schema, the database client singleton, kit config, and migrations.
_Avoid_: database (the Postgres instance), schema folder, `@repo/api/db` (that is the API Package’s re-export)

**Root**:
The Workspace root. It owns the workspace definition, Turborepo, and the shared Prettier config. It is not an App.
_Avoid_: calling Root “the app” or putting App scripts there

**Route `/public`**:
A stub path in the Web App that redirects to login.
_Avoid_: Public (EWA Connect’s second App), public app, public package, Community Public (that is a product type)

### Product

**Community**:
A club people belong to. It may contain many Groups and many Teams, may link to at most one Venue, and offers one or more sports.
_Avoid_: Workspace, club, org, server, workspace (when you mean Community)

**Venue**:
A physical facility: one addressable site with a name, location, and Courts. Not a Community, not a legal entity, not a brand. A Community may link to at most one Venue; a Venue may be linked by many Communities. Every Game points at exactly one Venue.
_Avoid_: club (that is the avoided synonym for Community), facility, location (when you mean this entity), Court (that is a playing surface inside a Venue)

**Court**:
A named playing surface that belongs to one Venue. A Match may point at one optional Court on the Game’s Venue. An Americano or Friendly tournament may record multiple Courts on the Game at create for later Match assignment. A Court has one **Court sport**. A Match or Booking Court must have the Game’s or the Customer’s sport.
_Avoid_: Venue, pitch (as the entity name; football product copy may say pitch), field, club (when you mean this entity)

**Court sport**:
The one sport a Court is for: padel or football. A Venue offers a sport when at least one of its Courts has it. Set by a Venue manager or Operator; changing it never changes a Booking. Product copy calls a football Court a pitch; the entity is still a Court.
_Avoid_: Venue sport, Venue sports (there is no Venue-level list), pitch (as the entity name), field

**Group**:
A set of people who play Games of one sport. Every Group is either a Club Group or a Loose Group.
_Avoid_: Community, Team, lobby, channel

**Verified Group**:
A Group that may host Rated Games and public Games: one an Operator verified, one created by a User with Group creator access, or a Club Group of a Venue Community. Every other Group's new Games are Unrated and private. A Game keeps the rated and public values it was created with, whatever later happens to its Group. Stored as `groups.verified_at`; membership of a Venue Community is derived, not stored.
_Avoid_: ranked Group, official Group, premium Group, permitted Group, groupCreator (that is a Clerk key)

**Club Group**:
A Group that belongs to a Community. A Loose Group becomes a Club Group when its Group link request is accepted, and becomes Loose again when it is unlinked from its Venue Community.
_Avoid_: subgroup, channel, nested group

**Loose Group**:
A Group that does not belong to a Community. It stops being Loose when its Group link request is accepted, and is Loose again once it is unlinked from that Venue Community.
_Avoid_: orphan, standalone group, free group

**Community Public**:
A Community joinable by request if you have the Community URL. Owner or Admin may also send a Lookup invite or mint an Invite link (Invite link admits immediately). Listed in Directory when that planned surface ships.
_Avoid_: open Community, listed Community (as the name of the type), Route `/public`

**Community Private**:
A Community joinable by Lookup invite or Invite link from Owner or Admin, or by Owner/Admin Club Group Lookup invite or Invite link that auto-admits as Member then joins the Club Group, or by an approved Group join request on one of its Club Group Public. No request-to-join on the Community itself.
_Avoid_: secret Community, hidden Community, unlisted Community (when you mean this type)

**Directory**:
A planned App list of live Community Public clubs. Not a shipped surface. Distinct from the Public Groups list.
_Avoid_: Group directory, marketplace, feed

**Public Groups list**:
An App list of live Public Groups of any sport the User is not in, filterable by sport (All, Padel or Football): Loose Group Public, and Club Group Public in live Communities (Public or Private). Separate from the Directory. Each row shows its sport and offers Join or Request to join.
_Avoid_: Directory, Group directory, marketplace, feed

**Club Group Public**:
A Club Group listed on the Public Groups list. A Community Member may join (or request if Require approval is on). A non-Member may send a Group join request; approving it also creates the Community membership. Owner or Admin may also send a Lookup invite or mint an Invite link (accept auto-admits as Member then joins the Group). The Group creator may Lookup-invite existing Members only and cannot mint Invite links.
_Avoid_: open Group (when you mean Club Group Public)

**Club Group Private**:
A Club Group joinable by Lookup invite or Invite link. Owner or Admin may invite any User (accept auto-admits as Member then joins the Group). The Group creator may Lookup-invite existing Members only and cannot mint Invite links.
_Avoid_: secret Group (when you mean Club Group Private)

**Loose Group Public**:
A Loose Group listed on the Public Groups list. Any authenticated User with the Group URL may join, unless Require approval is on. The creator may also send Lookup invites and mint Invite links.
_Avoid_: listed Group, Invite link (that is a different door from Group URL)

**Require approval**:
A flag on a Public Group (Loose or Club). When it is on, the Group URL join becomes a Group join request instead of an immediate admit. Off by default. Private Groups have no open join door, so the flag does not apply. Turning it off does not admit pending requests.
_Avoid_: closed Group, moderated Group (when you mean this flag)

**Group join request**:
A User asking a Group approver to admit them to a Public Group that requires approval. No message. No expiry. A rejected or leftover approved row may be reset to pending (same as a Community join request). Distinct from a Community join request and from a Game Level range request.
_Avoid_: invitation, Invite, Community join request (when you mean this Group request)

**Group approver**:
Who may set Require approval, decide Group join requests, add players by phone, remove Unclaimed players, and make or unmake Appointed Organizers. On a Loose Group, the creator. On a Club Group, Community Owner or Admin, or the Group creator while still a Community Member. Nobody while the Club Group's Community is Soft-archived. Adding by phone sends a User with an account a Lookup invite; any other number becomes or reuses an Unclaimed player who joins at once. On a Club Group only Owner or Admin may add someone who is not yet a Community Member, which also creates their Member seat.
_Avoid_: Group owner, organizer (when you mean this write permission), group admin

**Loose Group Private**:
A Loose Group that is not listed; joinable by Lookup invite or Invite link from the User who created it.
_Avoid_: secret Loose Group

**Lookup invite**:
An in-app invitation to an existing User, chosen from a searchable list of Users the sender is allowed to invite. The invitee must accept. Staff who may send may revoke unused Lookup invites. Community, Group, and Game allow selecting more than one User per send; incomplete Team allows one.
_Avoid_: Email invite, phone invite, magic link, Invite link, User directory (there is no global directory page; search is the send door only)

**Email invite**:
Retired as a product door. Do not send named invitations bound to an email address. Leftover Email invite URLs must not admit.
_Avoid_: using this as a current channel; magic link; Invite link; Lookup invite

**Invite link**:
A door URL any authenticated User may use while that token is live. Each copy mints a new token that expires 6 hours after mint; older tokens stay valid until each expires. No rotate or revoke. Used on Community (Public and Private), every Group type, incomplete Team, and Game. Game Invite links may be opened at `/g/{code}` and Group Invite links at `/gr/{code}` (eight-character public alias on the same 6-hour row); Community and Team stay token-path only.
_Avoid_: Email invite, Lookup invite, magic link, Group URL (Loose Group Public still uses the Group URL as a separate join door)

**Invite doors**:
Lookup invite and Invite link as the two live invitation channels onto a Community, Group, Team, or Game.
_Avoid_: Email invite, invitation (when you mean a specific channel), Venue link (that is a different door)

**Venue link**:
A Community’s live association with at most one Venue, after an Operator approves a Venue link request. Owner or Admin may unlink. A Venue Community’s Venue link is set when it is created, without a Venue link request, and cannot be unlinked. Distinct from Invite link and from a Team’s Community link.
_Avoid_: Invite link, membership, join, Club Team

**Venue Community**:
The one Community a Venue owns. It is created when the first Group link request to that Venue is accepted, and it carries a Venue link to that Venue that cannot be unlinked. It is Private, and the Venue manager who sent the first accepted request is its creator and Owner. Its Club Groups are Verified Groups. A Venue has at most one Venue Community; other Communities may still hold a Venue link to the same Venue.
_Avoid_: venue club, default Community (in product copy), home Community

**Group link request**:
A Venue manager’s request that a Loose Group Public join that Venue’s Venue Community. The Group creator accepts or declines it; the Venue manager may cancel it while pending. Accepting turns the Loose Group into a Club Group of the Venue Community. Distinct from a Group join request (a User asking to join a Group), a Venue link request (a Community asking for a Venue) and a Team link request.
_Avoid_: Group join request, Venue link, invite (when you mean this request), Group transfer

**Venue link request**:
A request by a Community Owner or Admin to associate that Community with an existing Venue. An Operator approves or rejects it. Distinct from a User’s Community join request.
_Avoid_: join request (Community membership request, not a Game Level range request), Team link request

**Community sports**:
The allow-list of sports a Community offers (padel, football, or both). Each Group and each Team still has exactly one sport.
_Avoid_: Group sports (that is the single sport on a Group), Team sports (that is the single sport on a Team)

**Team**:
A persistent roster of Users for one sport, sized by its Team roster rule: a padel Team is exactly two Users; a football Team is two to twenty-five and complete at five. Distinct from Group. A Team may be below complete (a padel Team with one member and a pending Lookup invite or live Invite link for the second seat; a football Team under five). A Team is full at its maximum. Every Team is created unattached; it may later link to at most one Community with Owner or Admin approval once complete, and any member may unlink. A football Team has a creator and no captain: other members may leave, the creator dissolves. Dropping below complete does not unlink a Team.
_Avoid_: Group, Game team, pair, doubles (when you mean this entity), captain

**Team roster rule**:
The size rule a Team follows for its sport: minimum and maximum members, the count at which it is complete, and whether its member pair is unique across Temba. Padel: exactly two, complete at two, pair unique. Football: two to twenty-five, complete at five, pairs not unique.
_Avoid_: team size (bare), squad size, captain rule

**Club Team**:
A Team currently linked to a Community.
_Avoid_: Club Group, nested team

**Loose Team**:
A Team with no Community link (unattached).
_Avoid_: orphan Team, standalone Team, free Team

**Game team**:
One side on a padel Game: a complete Team, an ad-hoc pair of Users, or one User occupying one of two Positions until a second User takes the other Position. Reused on that Game’s Matches. Not a Team. An Americano has no Game teams until Matches exist.
_Avoid_: Team (when you mean a Game side), partnership, pair (when you mean this entity), Court (the 2v2 seat diagram is not a Court)

**Position**:
Left or right on a padel Game team, from that side facing the net. Distinct from a Match slot and from a Court.
_Avoid_: Court, slot (when you mean this), seat (when you mean this), Preferred Position (that is a User's profile default)

**Preferred Position**:
A User's standing preference for Left or right, or Either. A default for the Game seat picker, not a Position itself.
_Avoid_: Position (that is the per-Game-team seat), side, hand, preferred side, Both sides

**Owner**:
A Community role. The creator starts as Owner. A Community always has at least one Owner.
_Avoid_: admin (when you mean Owner), founder

**Admin**:
A Community role that helps run the Community (admit people, create Club Groups, archive, request a Venue link) but does not change Owner-ship.
_Avoid_: Owner, moderator, Operator

**Operator**:
A Temba staff User. Not a Community role. Operators curate Venues and Courts, decide Venue link requests, and may set any other User's Level in either sport (ADR-0046).
_Avoid_: Admin (that is a Community role), system admin, platform admin, superadmin, Owner

**Venue manager**:
A User granted management of one Venue by an Operator: Venue details, Courts, Opening hours, Closures, Pricing rules, Cancellation policy, Bookings, Payments, Customers and reports for that Venue, from the Venue console. A User may manage many Venues. Not a Community role, not an Operator; an Operator may do everything a Venue manager may.
_Avoid_: facility owner, venue admin, Owner (that is a Community role), Admin, Operator, staff

**Venue photo**:
A picture of a Venue that a Venue manager uploads from the Venue console, up to ten per Venue. One is the **Main photo**, which fronts the Venue's card in the App's Venue list; one is the **Details photo**, at the top of the Venue screen. They may be the same photo. With no Venue photo, the App shows the Venue logo.
_Avoid_: court image (Courts have no photos), cover, banner, gallery, hero

**Opening hours**:
The windows in which a Venue's Courts can be booked, per weekday in the product timezone, as minutes from midnight. A weekday may have several non-overlapping windows; none means closed. A window belongs to the weekday it opened on and may run to 06:00 the next day. Times sit on the Venue's slot grid.
_Avoid_: schedule, availability (that is derived from Opening hours, Closures and Bookings), business hours

**Closure**:
A period when a whole Venue, or one Court, cannot be booked, set by a Venue manager (maintenance, a private event). It never cancels Bookings by itself; the manager sees which Bookings fall inside and decides.
_Avoid_: blackout, holiday, block

**Pricing rule**:
An hourly rate in fils for a set of weekdays and a time range, for every Court or for one Court. A Court rule beats a Venue-wide rule. Rules on one scope never overlap, and a window that runs past midnight prices on the weekday it opened. The rule covering a Booking's start time prices its whole length; the price is fixed at the moment the Booking is made, and a start no rule covers cannot be booked. A Venue-wide rule for every weekday, 00:00–24:00 is the base rate.
_Avoid_: tariff, rate card, price list, Price per player (that is a Game field), fee

**Accepting bookings**:
The single Venue setting that lists the Venue for Customers and opens the Customer Booking doors. Off by default; it cannot be turned on for a Soft-archived Venue or one with no Court.
_Avoid_: bookable (that is the derived state of a Venue on a given day), published, open

**Cancellation policy**:
A Venue's refund terms for a cancelled Booking: up to five tiers of hours before the start with a refund percent each, a late refund percent after the last tier, and the cut-off after which a Customer can no longer cancel in the app. A Booking keeps the policy it was made under. A Venue that cancels always refunds in full; a Venue manager who cancels because the Customer asked applies the policy, without the Customer's cut-off.
_Avoid_: refund rules, cancellation fee, terms

**Booking**:
One Court reserved for one interval by one Customer or Guest, at a price and under a Cancellation policy fixed when it was made. A Venue manager may make one from the Venue console: it is confirmed at once with a Payment to settle at the Venue, ignores the Customer's lead and horizon, and may carry a typed price. A Customer's Booking is pending payment for at most ten minutes, then confirmed once the charge is captured or payment is deferred to the Venue; it occupies the Court while confirmed, or pending payment with a live hold. It may become cancelled, no-show or expired, and those never block. Distinct from a Game: a Game is the event, a Booking is the Court.
_Avoid_: reservation, slot (that is the offer, not the reservation), Game, session, order

**Booking Game**:
A groupless, unrated, private Friendly game created from a confirmed, upcoming Booking by its holder, who is its Organizer. Its Venue, Court and window are the Booking's. Players join through Invite doors. Cancelling the Booking cancels the Game; cancelling the Game keeps the Booking, and the holder may then create a new Game for it. A Booking on a football Court creates a football Game, whose holder chooses the Side size and players allowed. Americano and Friendly tournament are never created from a Booking.
_Avoid_: booked Game, court Game, reservation Game, Game booking, private Game (that is any Game with `isPublic` off)

**Slot**:
One Court, one start on the Venue's grid, one duration and one price, offered to a Customer. Derived from Opening hours, Closures, Pricing rules and occupying Bookings; never stored.
_Avoid_: Booking (that is the reservation), Position, Match slot, time slot (as an entity), window (that is a Game's registration window)

**Customer**:
A User as seen from one Venue: someone who holds or has held a Booking there. Derived from User and Bookings, never a separate record. Needs no Community or Group membership.
_Avoid_: client, member (that is a Community role), player (when you mean this view), account

**Guest**:
A person without a Temba account recorded on a Booking by name and phone by a Venue manager. A Guest Booking has no Customer and never a Game; a Venue's Guests are matched by phone. Not an Unclaimed player: a Guest is not a User.
_Avoid_: walk-in (as the name of the entity), offline customer, anonymous User, Unclaimed player

**No-show**:
A confirmed Booking whose start has passed and that a Venue manager marked as not used. Terminal: no refund, and the payment status is left as it was (a paid no-show stays paid; an unpaid one stays pending).
_Avoid_: missed booking, absent, forfeited

**Payment**:
One attempt to collect a Booking's price through a payment provider or by hand at the Venue, with its refund. Pending, paid, failed, refunded, partially refunded or waived; never held, since Temba charges immediately. The Booking's payment status summarises its Payments: the latest attempt that did not fail, or failed when every attempt failed.
_Avoid_: transaction, charge (that is one kind of Payment movement), invoice, Price per player, payment status (that is the Booking's summary, not the row)

**Payment provider**:
The outside service that takes a Customer's money for a Booking, behind one adapter in the API Package. Tap Payments in v1 (ADR-0028), charging immediately in BHD by card or BENEFIT. "Manual" is the adapter that collects nothing and lets a Venue manager settle by hand.
_Avoid_: gateway, PSP, Tap (bare, when you mean the boundary rather than the vendor), Clerk (that is identity)

**Payment method**:
How a Customer pays one Booking, picked at checkout: card, BENEFIT, BenefitPay or Apple Pay through Tap, or pay at the Venue. The online methods are the ones switched on for the Tap merchant account; pay at the Venue is offered unless the Venue refuses it (ADR-0033).
_Avoid_: payment mode (that is the older single answer), source (that is Tap's word for one hosted page)

**Venue console**:
The web App (`apps/console`) where a Venue manager runs a Venue: Schedule, Bookings, Courts & pricing, Hours & closures, Customers, Staff & roles, Reports, Payouts and Venue details, one Venue at a time with a switcher. It signs in with the same Temba account and calls the same API as the Web App. The Web App's sidebar links to it only when the caller manages at least one Venue (Operators see every Venue). Distinct from the Operator Venues area in the Web App, which curates the catalog. ADR-0031.
_Avoid_: Manage area (the name of the same section while it lived in the Web App), admin panel, admin dashboard, backoffice, facility dashboard

**Level setter**:
A User whose Clerk `publicMetadata.levelSetter` is `true`. A Level setter may set the Level of any other member of a Group they belong to. Granted and revoked only in the Clerk dashboard. Independent of Operator, Organizer and Community roles.
_Avoid_: admin, rating admin, rating editor, Operator (when you mean this)

**Member**:
A Community role with no staff powers. Community membership is required to join that Community’s Club Groups. Leaving a Community is refused while the User sits on any Team linked to that Community.
_Avoid_: player (when you mean Member), user (when you mean this role)

**Community membership**:
A User’s Owner, Admin, or Member seat on a Community. Distinct from Group membership and from Team seats.
_Avoid_: enrollment, subscription, Group membership (when you mean this), join (when you mean this seat)

**Soft-archive**:
A reversible hide. For a Community: hides it and its Club Groups together; Games are kept; existing Club Group Games stay visible to those allowed to open the Community or Group and are excluded from public pickup; new Club Group Games are refused; register, waitlist, and Game Lookup/Invite link mint and accept behave as closed; organizers may still add Matches and assign Courts and cannot reopen while archived; Club Groups stay attached; refuse new joins, invites, Team→Community link requests and decisions, Venue link requests and decisions, and invites/accept on already linked Teams; unattached Teams are untouched; linked Team history and stats and a live Venue link remain visible to those allowed to open the Community. For a Venue: hides it from the Community request catalog and from unlocked Game create; refuse new Venue link requests and decisions; refuse new Court assign on Games whose Venue is that site (skip/clear still allowed); live Community Venue links stay; a Club Group whose only linked Venue is Soft-archived may still create a Game there with skip Court and cannot pick another Venue; Members still see that Venue on Community home as history. Not a delete, not detaching Groups, and not unlinking a Venue.
_Avoid_: delete, hard-delete, detach, hide (as the name of the action)

**Game**:
The parent event that contains one or more Matches. A new Game must belong to a Group, except a Booking Game, which has none; other groupless Games are legacy rows. A Game does not belong to a Community directly. Every Game has exactly one Venue, chosen at create and immutable after. If the Game belongs to a Club Group whose Community has a Venue link, that Venue is used and cannot be swapped at create. Organizers of a Group Game are that Group’s creator, and for a Club Group also Community Owner and Admin. Those people may create the Game, cancel it or a Match, and kick registered or waitlisted entries. A groupless Game’s organizer is its creator. A Game on a Group that is not a Verified Group is Unrated and private. A football Game is a Friendly game with **Roster registration** and a **Side size**; it has no Match until its Organizer publishes the two **Football sides**, which creates its one Match. It is Unrated and comes only from a football Group or a football Court Booking. Positions, Game teams and Sets are padel structure.
_Avoid_: Event (when you mean Game), session, match (that is a Match)

**Roster registration**:
A Game admit that occupies a count against players allowed and no Position. Used by Americano before its Matches exist and by every football Game. Waitlist, leave, kick and the Invite doors apply; the seat picker does not.
_Avoid_: pool registration (a Pool is a tournament stage), open registration (registration is open or closed on every Game), seatless

**Side size**:
On a football Game, how many play on each side at once: 5, 6, 7, 8, 9 or 11. Players allowed is at least twice the Side size and at most 40; the rest are substitutes. Shown as "5-a-side".

**Football role**:
How a registered User plays a football Game: keeper or outfield, with a **Preferred football position** (defender, midfield or forward) for outfield. Chosen when joining and changeable until the Score is in. A preference, never a promise. A football Game has two keeper seats, one a side.
_Avoid_: Position (the padel seat), Preferred Position (the padel side preference)

**Football side**:
One of the two halves an Organizer splits a football Game's roster into, by Level or by hand, each worn in a **Bib** colour. Stored as a Game team with a side index. Publishing the sides again replaces them until the Score is in. Product copy says team.
_Avoid_: Team (the persistent roster), squad

**Bib**:
The colour a Football side wears: black, white, red, dark blue, light blue, green, yellow, orange, purple, pink or grey. The two sides never share one. The only place colour appears in the product.

**Score**:
On a football Match, the goals each Football side scored, stored as the Match's one Set. A player on either side or an Organizer enters it from kick-off; it is agreed once one player from each side confirms, or as soon as an Organizer confirms. A changed Score asks again.

**Scorer**:
A player named with the goals they scored in a football Match. Optional, and never more goals than their side's Score. Goals are a player fact, not a rating input.
_Avoid_: format (that is Friendly game, Americano or Friendly tournament), team size, a-side (bare)

**Match**:
A playable contest with two sides that belongs to one Game.
_Avoid_: Game (the parent event), session, fixture (when you mean a Match; not a separate entity)

**Set**:
A scored unit inside a padel Match, added after play. A Match may have any number of Sets. A Set may be drawn (equal games).
_Avoid_: Game, Match, game (the padel/tennis point-unit inside a set; not a Temba term)

**Match result**:
A completed Match's outcome for one User: won, lost, or draw. A draw is equal Set wins on both sides; Glicko-2 scores it 0.5. A draw is played, not won, so Played never equals Won plus Lost.
_Avoid_: score (Sets carry the score), win rate (that is a derived percentage), outcome (when you mean this entity)

**Match result confirmation**:
A seated User's acknowledgement that a Match's entered Sets are correct. The User who enters the Set that first produces a Match result is confirmed automatically; a Match only reaches completed, and only then rates, once every seated User with an account on its two Game teams has confirmed. An Unclaimed player never confirms: a side whose seated Users are all Unclaimed players is confirmed by an Organizer's confirmation for that side, which a changed score clears like any other. A football Match needs one player from each side, read the same way. An Organizer's confirmation is final: it completes the Match without waiting on the players (ADR-0044). Entering a score is never a final confirmation, even for an Organizer.
_Avoid_: complete (the resulting Match status), verify, approve, agree, confirmed Match status (`MatchStatusEnum.CONFIRMED` is deliberately unused — see ADR-0011)

**Americano**:
A Game format with individual-only registration and rotating partners across multiple Matches. Matches are generated after registration.
_Avoid_: Friendly tournament, Friendly game, tournament, team-only (illegal on this format)

**Friendly tournament**:
A Game format whose Game teams are drawn at random and whose Matches are generated by the draw; the organizer does not add them by hand. Its Tournament shape says which stages it plays: Pools, a Knockout, or Pools then a Knockout. In a Pool stage each Pool plays a round robin across several Rounds — one Pass by default, cut short or played twice by the organizer's Round count.
_Avoid_: Americano, Friendly game, league

**Tournament shape**:
Which stages a Friendly tournament plays: Groups only, Knockout only, or Groups then knockout. Chosen at create; Groups only by default. Not a Game format — the format stays Friendly tournament (ADR-0020). Shown to users as *Format*.
_Avoid_: Game format, mode, type, tournament format

**Knockout**:
The single-elimination stage of a Friendly tournament: a Game team that loses a Knockout Match is out.
_Avoid_: bracket (a word for the picture of it, not the stage), playoffs, finals, elimination

**Knockout Match**:
A Match in the Knockout. It must have a winner, so it cannot complete while Sets are level. Every other Match of a drawn Friendly tournament is a Pool Match.
_Avoid_: playoff, tie, bracket game

**Knockout round**:
One level of the Knockout, named by the Game teams left in it: Round of 32, Round of 16, Quarter-finals, Semi-finals, Final. Each Knockout round is also a Round, numbered after the Pool Rounds.
_Avoid_: stage, phase, level

**Qualifiers per Pool**:
How many Game teams go from each Pool into the Knockout on a Groups then knockout tournament, taken from the top of each Pool table. Shown to users as *Through from each group*.
_Avoid_: seeds, advancers, cut

**Knockout draw**:
The random placement of every Game team into the Knockout of a Knockout only tournament. Drafted and re-rollable first, then posted, like the Pool draw.
_Avoid_: draw (bare — that is a tied Match result), seeding (nobody is seeded)

**Bye**:
A first-round place in the Knockout with no opponent, left when the field is not a power of two. The Game team starts in the next Knockout round. A Bye is not a Match.
_Avoid_: Walkover (that is a Match that was not played), free pass

**Walkover**:
A Knockout Match that was not played, where the organizer awarded the place in the next Knockout round to one Game team. Never rated, and never a Match result.
_Avoid_: Bye (that is a place with no opponent), forfeit, default win, win

**Champion**:
The Game team that wins the Final. Only a Friendly tournament with a Knockout has one; a Groups only tournament has a winner per Pool and no Champion.
_Avoid_: winner (bare — a Pool has a winner too), overall winner

**Pool draw**:
The random assignment of a Friendly tournament's Game teams to its Pools. Drafted and re-rollable first, then posted, which generates every Pool Match and freezes the seats. Never a Match result.
_Avoid_: draw (bare — that is a tied Match result), seeding (nobody is seeded), allocation, sorting

**Round**:
One slice of a Friendly tournament's schedule: the Matches sharing a date. Numbered from 1, Pool Rounds first, then one Round per Knockout round. The Round count is the number of Pool Rounds only.
_Avoid_: Match, Set, leg, fixture, week, stage

**Half team**:
A Game team on a Friendly tournament with one Position taken and the other vacant, before the Pool draw. An organizer may merge two Half teams into one Game team. Distinct from an incomplete Team, which is the persistent partnership with one seat.
_Avoid_: incomplete Team, solo, single, orphan seat

**Pool**:
One subset of a Friendly tournament's Game teams that plays a round robin against itself — one Pass by default, cut short or played twice by the organizer's Round count. A tournament has one or more Pools, and every Game team sits in exactly one. Not a Group: a Pool lives inside a single tournament, while a Group is a set of people who play Games. Shown to users as *group*.
_Avoid_: Group, group stage group, division, section, bracket

**Pass**:
One full round robin inside a Pool, where every Game team in the Pool meets every other once. A Friendly tournament plays one Pass by default and at most two; the second repeats the first with the two sides swapped.
_Avoid_: leg, cycle, lap, Round (a Round is one date-slice of the schedule)

**Pool table**:
The ordered list of a Pool's Game teams by their Pool records. Counts Pool Matches only, never a Knockout Match between two Game teams of the same Pool. Not a Standing: a Standing is a User's position among a Group's members, a Pool table ranks Game teams inside one Pool.
_Avoid_: Standing, Standings, leaderboard, league table, ranking

**Pool record**:
One Game team's played, won, drawn, and lost counts inside its Pool. Ordered by wins, then head to head, then Set difference, then games difference.
_Avoid_: score (Sets carry the score), Standing, stats, results

**Friendly game**:
A Game format with exactly one Match, created with the Game.
_Avoid_: Single, Friendly tournament, Americano

**Waitlist**:
The queue to join a Game after its cap is reached.
_Avoid_: player (when you mean someone waitlisted), guest

**Game admit**:
Registered occupancy of a User, an ad-hoc pair of Users, or a complete Team on a Game. Distinct from Waitlist and from creating the Game.
_Avoid_: join (when you mean this), enroll, registration (when you mean the open/closed window), Game Level range request (that is not occupancy)

**Allow registering alone**:
Organizer flag on a Friendly tournament, default yes. When no, entry is Partner registration only onto a fully vacant side. Distinct from team-only registration and from Team. Not a new Game format. Not a registration mode.
_Avoid_: Complete Teams, matcher, registration mode (when you mean this flag), Team (that is the persistent partnership)

**Partner registration**:
On a padel Game, one User taking both Positions on one fully vacant side of an individual Friendly game or Friendly tournament — themselves and one named partner — in a single Game admit. The partner is seated immediately and is never asked to accept (ADR-0013). It creates an ad-hoc Game team, not a Team: no persistent partnership, and that Game team carries no Team. Refused when no side has both Positions vacant. Leaving still frees only the leaver’s Position on Friendly games and on tournaments that allow registering alone. On a tournament that does not allow registering alone, leave or kick before the Pool draw removes the whole Game team.
_Avoid_: Team (that is the persistent partnership), Game team (that is the side this creates), Lookup invite (that is a door the invitee must accept), pair registration, team registration (that is registering a complete Team on a team-only Game)

**Price per player**:
The display-only amount one User pays to occupy a seat on that Game, shown in BD. Optional on the Game; zero means free; unset means the organizer did not state an amount. Not a payment, not per Game team, and not a total for the Game.
_Avoid_: fee, cost, entry fee, registration price (registration is the open/closed window), total price, price per team, Match price, player (when you mean User outside this term)

**Organizer**:
Of a Group Game: that Group’s creator, its Appointed Organizers, and for a Club Group also Community Owner and Admin. Of a groupless Game: its creator. Those people may create the Game, cancel it or a Match, confirm a score for everyone, kick registered or waitlisted entries, edit window and price per player and Game Level range, decide Game Level range requests, and add players by phone: a User with an account is seated straight away, any other number becomes or reuses an Unclaimed player. An Organizer's add skips the registration window, the Group join gate and the Game Level range, never waitlists, and never adds the person to the Group.
_Avoid_: creator (when you mean this set), host, admin (when you mean this), game admin, co-host

**Appointed Organizer**:
A Group member a Group approver made an Organizer of that Group's Games. Stored as the member's Group role. Not a Group approver: they cannot decide join requests, add or remove Group players, appoint others, or change, unlink or delete the Group. Never the Group creator, a Community Owner or Admin (already Organizers), or an Unclaimed player. On a Club Group only a Community Member can be appointed, and the appointment lapses while they are not one. Leaving the Group ends it.
_Avoid_: co-organizer, co-host, Group admin, moderator

**Game admins**:
Who hears about a Game's joins and leaves, and gets the admin Finished Game notice: the Organizers and the Group approvers of the Game's Group, except a Club Group creator or Appointed Organizer who has left the Community, and nobody while the Community is Soft-archived. On a groupless Game, its creator. Decides who is notified only, never who may act.
_Avoid_: Organizer (that is the write permission), game admin (lowercase, as a role), co-host, host

**Finished Game**:
A Game that is not cancelled and whose Matches are all completed or cancelled, with at least one completed. Derived, not stored. An Americano, which has no Matches, is never a Finished Game.
_Avoid_: completed Game (completed is a Match status), ended, over, past Game

**Game Level range**:
Optional inclusive minimum and/or maximum Level band bounds (D–A) on a Game, stored as tenths. Both unset means no Level gate. Distinct from a User’s continuous Level.
_Avoid_: rank range, ELO range, skill cap (when you mean this), letterNumber D3–A (stored thirds, not the product face)

**Game Level range request**:
A User asking Organizers to waive that Game’s Level range for themselves. Distinct from a Community join request and from Game admit. No message. No expiry.
_Avoid_: join request (that is Community membership), join (when you mean this request), Game admit

**Game Level waiver**:
An approved Game Level range request, or an Organizer Lookup invite, that excepts that User from that Game’s Level range. It does not Game admit them and does not occupy a Position or Waitlist row.
_Avoid_: auto-admit, Game admit, exception (as the name of the entity), Lookup invite (that is a door that grants this)

**User**:
A person on Temba. Almost every User has a Temba account; the exception is an Unclaimed player, who has a phone and a name but no account yet.
_Avoid_: player (when you mean User), member (when you mean the Community role)

**Unclaimed player**:
A User an Organizer or Group approver added by phone and name, with no Temba account yet. They are seated, rated and shown like any User, marked "Not on Temba yet", but never found by Lookup invite or Partner search and never sent a Notification. One per phone. While unclaimed, an Organizer or Group approver of a Game or Group they are on may correct the name; the phone never changes, so a wrong number is fixed by removing and adding them again. Signing up with that phone, verified, claims the row and its history; an existing account that verifies the phone later absorbs it (ADR-0042).
_Avoid_: Guest (that is a Booking holder without an account), placeholder, ghost, manual User, invitee

**Onboarding questionnaire**:
The questions a new User answers after Clerk sign-up and before Home, at Route `/onboarding` on web. It first asks which **Sports played**, then padel (Level band and Preferred Position) and football (Football role, Preferred football position and a **Football self-placement**) for each picked sport, and saves every answer in one call. Blocking, with **Either** and **Not sure** (which starts padel at D+) as the low-commitment answers. Users who predate it are complete without answering.
_Avoid_: signup flow (that is Clerk's), profile setup, wizard, survey, onboarding (bare, when you mean this entity), Lookup invite

**Sports played**:
The sports a User told the Onboarding questionnaire they play: padel, football or both. It decides which questions they answer. A User with none recorded onboarded before the question existed and is read as padel only.
_Avoid_: favourite sports, interests

**Football self-placement**:
A new football player's own starting Level, picked as Beginner, Casual, Competitive or Pro instead of a letter. Each declares the football Level that Make teams balances on (D, C, C+ or B; never A) until football results rate. One time, like the padel Level declaration.
_Avoid_: football rating (when you mean the self-placed start), skill level

**Home**:
The signed-in User’s landing dashboard after login. It shows that User’s Games, Level, and stats. Distinct from Community home and Group home.
_Avoid_: feed, lobby, dashboard (when you mean this surface)

**Player profile**:
A read-only page about one User, with a Padel / Football switch: for each sport their Level, Win streaks, preferred position, All time stats and Last 10. It opens on football from a football Game, or when the User plays football only. Football results are Unrated, so the football Level is the starting one and football goals count in All time. Visible to that User and to every User who shares a Group or a Game with them. Distinct from You, which is the signed-in User's own page with settings.
_Avoid_: public profile, player card, user page

**Last 10**:
A User's ten most recent completed padel Matches, across every Game format. Newest first. Walkovers are not Matches with a result and never appear.
_Avoid_: recent games, history (when you mean this fixed window), Recent form (that is Home's strip, which excludes Americano)

**Win streak**:
Consecutive won Matches in time order. A loss or a draw ends it. The current Win streak ends at the newest Match; the best is the longest ever.
_Avoid_: form, run, streak (bare, when a losing run is meant)

**Played side**:
The share of a User's Matches with a recorded Position that they played on the left or on the right. Derived, never declared. Distinct from Preferred Position.
_Avoid_: Preferred Position (that is declared), backhand side, forehand side

**Job**:
A unit of background work run by the Job queue (Graphile Worker on Postgres) inside the API App, such as expiring a Booking hold or creating a Tap charge. Enqueued in the same database transaction as the change that needs it, so it exists only if that change commits. A Job that fails permanently stays in the queue tables with its last error.
_Avoid_: task (that is Graphile's name for a handler), cron job (when a one-off is meant), queue message

**Job key**:
The idempotency identifier of a Job, such as `booking:expire:<bookingId>`. Enqueueing the same Job key again replaces or keeps the pending Job instead of adding a second one, and the key lets a Job be removed before it runs.
_Avoid_: job id, dedupe key (that is the Notification column)

**Notification**:
An in-app record that tells one User that something happened on a Group or Game they run, that a Game they played on has finished, that an Organizer seated them on a Game, or, once, that signing up claimed the Games an Unclaimed player played under their number. One row per recipient, unread until that User opens it or marks all read. Kept 90 days. Never sent for a Soft-archived Community. Not a push message, not an email, not an invite.
_Avoid_: alert, activity, feed item, message, Lookup invite (that is an actionable invitation)

**Notifications page**:
The Web App page at `/dashboard/notifications`, opened from the bell, listing the signed-in User's Notifications newest first, with a link to pending invites when there are any.
_Avoid_: feed, inbox (when you mean this page), activity log, Home

**Standing**:
A User's position among the other Users of one Group, shown as position and member count ("#4 of 13"). It counts every completed Match of the Group's Games, Rated or Unrated, padel or football (ADR-0045). A Standing is a position among others, so it is never a Level, a Level band, or a Rating.
_Avoid_: ranking, leaderboard position (when you mean this entity), player standing (Level, Recent form and All time are not a Standing), rank, Pool table (that ranks Game teams inside a tournament Pool)

**Rating**:
A User’s sport-keyed Glicko-2 skill state (μ, φ, σ). Not shown raw in the App.
_Avoid_: ELO, Elo, player rating (when you mean this entity), rank (that is leaderboard position)

**Level**:
The continuous 0.0–7.0 skill face derived from a Rating’s μ (one decimal in the App).
_Avoid_: rank, ELO, Level band (that is the discrete label)

**Level band**:
The discrete skill label D–D+–C–C+–B–B+–A–PRO (PRO highest) shown in the App, derived from Level with hysteresis. PRO is reserved for an elite override and is not assigned from Level.
_Avoid_: rank, Level 1–5 (redesign artefact, not product), ELO, D3–A (stored thirds, not the product face)

**Provisional**:
UI state on a Rating when rating deviation φ is above the product threshold (confidence still settling). A Level override clears Provisional.
_Avoid_: unranked, unrated (a User may already have a Level), PRO (that is a Level band label)

**Level override**:
A Level that a Level setter or an Operator set by hand, and its audit record. An Operator's has no Group. It replaces the Rating's μ and makes the Rating confirmed. Later Rated Matches move the Level from there. There is no undo; a mistake is corrected by another Level override. A Level override is displayed like any other Level.
_Avoid_: manual rating, rating override, Rated Match (an override is not a Match), permanent override

**Rated Match**:
A completed, non-cancelled Match on a Game that rates, which produced rating events for the Users on its two Game teams. A Match on an Unrated Game is never a Rated Match.
_Avoid_: ranked Match, scored Match (Sets score a Match; rating is separate)

**Unrated Game**:
A Game whose completed Matches never produce rating events or move a Level, while still counting towards its Group's Standing and as played, won, lost or drawn in Last 10, All time stats and Win streak. A Booking Game, any Game created on a Group that was not a Verified Group at create, and every football Game created before football results ship. Match result confirmation still applies. Stored as `games.rated = false`, fixed at create; `bookings.createGame` and every football Game create set it.
_Avoid_: unranked (the user-facing word is "Unrated"), casual, friendly (that is a Game format), practice
