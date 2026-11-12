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
_Avoid_: Public (EWA Connect’s second App), public app, public package

**i18n Package**:
The Package named `@repo/i18n`. It owns the Locale type, the English and Arabic Message catalogs and the `plural` helper. It imports nothing from the Workspace; `@repo/domain` and every App import it.
_Avoid_: translations package, locales folder, copy package

**Locale**:
One of the two languages the product is written in, `en` or `ar`. A value passed to domain copy functions and read from a provider in the Apps, never ambient state. Arabic is written right-to-left and keeps Latin digits.
_Avoid_: language code (when you mean the type), region, culture

**Message catalog**:
The typed object of every user-facing string in one Locale, read by property access (`messagesFor(locale).game.joinAction`, `useMessages().common.save`). One file per owning feature or App slice; the Arabic file mirrors the English one key for key.
_Avoid_: translation file, dictionary, resource bundle, i18n keys (there are no string keys)

**Email sender**:
The one API Package seam through which every email leaves Temba: Resend behind it in production, nothing behind it until the provider is configured, a recording double in tests.
_Avoid_: mailer, mail client, SMTP, Resend (when you mean the seam)
**Appearance**:
A User's choice of how an App is drawn on one device: Match my phone (the default), Light or Dark. Stored on the device, not the account. The **Color scheme** is the result, `light` or `dark`, that picks the palette.
_Avoid_: theme (when you mean the choice), dark theme, night mode

**Color role**:
A token named for what it does, not how it looks: `ink`, `paper`, `rule`, `wash`, `focus`, `control`, `sheet`. Each role has one value per Color scheme in `@repo/design-tokens`; screens name roles and never branch on the scheme.
_Avoid_: black, white (when you mean ink or paper), color name

**Lifted**:
The focused surface (`focus`): the one card a screen is about, drawn one step off the page in the direction of the Color scheme (`#f4f4f4` on white, `#141414` on black) with a hairline. Distinct from **Solid** (`control`), the black fill of a primary button, a selected control, a won Set or your own chip (ADR-0066).
_Avoid_: ink card, black card, inverted (for the focused surface)

### Product

**Venue**:
A physical facility: one addressable site with a name, location, and Courts. Not a legal entity, not a brand. A Venue may link many Club Groups; each Group links to at most one Venue. Every Game points at exactly one Venue.
_Avoid_: club (product copy may say club; the entity is a Venue), Community (retired, ADR-0055), facility, location (when you mean this entity), Court (that is a playing surface inside a Venue)

**Court**:
A named playing surface that belongs to one Venue. A Match may point at one optional Court on the Game’s Venue. An Americano or Friendly tournament may record multiple Courts on the Game at create for later Match assignment. A Court has one **Court sport**. A Match or Booking Court must have the Game’s or the Customer’s sport.
_Avoid_: Venue, pitch (as the entity name; football product copy may say pitch), field, club (when you mean this entity)

**Court sport**:
The one sport a Court is for: padel or football. A Venue offers a sport when at least one of its Courts has it. Set by a Venue manager or Operator; changing it never changes a Booking. Product copy calls a football Court a pitch; the entity is still a Court.
_Avoid_: Venue sport, Venue sports (there is no Venue-level list), pitch (as the entity name), field

**Group**:
A set of people who play Games of one sport. Every Group is either a Club Group or a Loose Group.
_Avoid_: Team, lobby, channel, club (when you mean a Group)

**Verified Group**:
A Group that may host Rated Games and public Games: one an Operator verified, one created by a User with Group creator access, or a Club Group. Every other Group's new Games are private and count for a Group Level only (ADR-0053). A Game keeps the rated and public values it was created with, whatever later happens to its Group. Stored as `groups.verified_at`; a Club Group's verification is derived from its Venue link, not stored.
_Avoid_: ranked Group, official Group, premium Group, permitted Group, groupCreator (that is a Clerk key)

**Club Group**:
A Group with a Venue link (`groups.venue_id`). A Loose Group becomes a Club Group when its Group link request is accepted or an Operator links it to a Venue directly (ADR-0063), and becomes Loose again when it is unlinked from its Venue. It is a Verified Group and its new Games are held at the linked Venue. Its doors are the Loose Group doors: the Group creator and Appointed Organizers run it (ADR-0055).
_Avoid_: subgroup, channel, nested group, Community group, Venue group

**Loose Group**:
A Group with no Venue link. It stops being Loose when its Group link request is accepted or an Operator links it, and is Loose again once it is unlinked from that Venue.
_Avoid_: orphan, standalone group, free group

**Public Groups list**:
An App list of live Public Groups of any sport the User is not in, filterable by sport (All, Padel or Football): Loose Group Public and Club Group Public. Each row shows its sport, its linked Venue when it has one, and offers Join or Request to join.
_Avoid_: Directory, Group directory, marketplace, feed

**Club Group Public**:
A Club Group listed on the Public Groups list. Any authenticated User with the Group URL may join, unless Require approval is on, exactly as on a Loose Group Public. The creator and Appointed Organizers may also send Lookup invites and mint Invite links.
_Avoid_: open Group (when you mean Club Group Public)

**Club Group Private**:
A Club Group that is not listed; joinable by Lookup invite or Invite link from the Group creator or an Appointed Organizer.
_Avoid_: secret Group (when you mean Club Group Private)

**Loose Group Public**:
A Loose Group listed on the Public Groups list. Any authenticated User with the Group URL may join, unless Require approval is on. The creator and Appointed Organizers may also send Lookup invites and mint Invite links.
_Avoid_: listed Group, Invite link (that is a different door from Group URL)

**Require approval**:
A flag on a Public Group (Loose or Club). When it is on, the Group URL join and accepting a Group Invite link both become a Group join request instead of an immediate admit. Off by default. The UI calls it "Who can join": Organizers approve, or Anyone with the link. Private Groups have no open join door, so the flag does not apply. Turning it off does not admit pending requests.
_Avoid_: closed Group, moderated Group (when you mean this flag)

**Group join request**:
A User asking a Group approver to admit them to a Public Group that requires approval. May carry a short note (up to 280 characters) and records where it came from: a Group or Game Invite link (and who minted it) or the Group page. May carry a Seat hold. No expiry. A rejected or leftover approved row may be reset to pending. A Group approver may undo a decision, which puts the request back to pending; undoing an approval removes the new member only while they have played no Game in the Group and are not an Appointed Organizer. Distinct from a Game Level range request.
_Avoid_: invitation, Invite, join request (bare, when it could be a Game Level range request)

**Seat hold**:
A Group join request sent from a Game Invite link that also asks for a seat on that Game while the Group decides (ADR-0057). Lives 24 hours. On approval the requester is seated on the Game if the hold is live and the Game is open; a seat that went falls back to any vacant one, a full Game to its Waitlist. Does not count against the Game's capacity. The requester may withdraw it. Only offered where Organizers approve; where anyone with the link may join, the link takes the seat at once. Waits in the Game's Requests queue beside Level range requests, where a Group approver approves or declines it.
_Avoid_: reservation, booking (that is a Court), waitlist (a hold is not on the Waitlist)

**Group block**:
A Group join request a Group approver rejected with "Reject and block". A blocked User cannot request to join, join through the Group URL, or accept that Group's Invite links, whether or not Require approval is on. Lookup invites and adding by phone still reach them, since a Group approver chose them. Undoing the decision lifts the block.
_Avoid_: ban (when you mean this Group-level refusal)

**Group approver**:
Who may set Require approval, decide Group join requests, add players by phone, remove players, change the Group image, make or unmake Appointed Organizers and, on a tier Group, make a Tier adjustment for any other member and change the Rating settings: the Group creator and Appointed Organizers, on a Loose Group and a Club Group alike. Removing a player never removes the Group creator; the removed player's Games stay in history. Adding by phone sends a User with an account a Lookup invite; any other number becomes or reuses an Unclaimed player who joins at once.
_Avoid_: organizer (when you mean this write permission), group admin, Group owner (when you mean this permission rather than the one User who owns the Group)

**Group owner**:
The one User a Group belongs to: its creator, until ownership is transferred. Who may edit the Group (name, sport until the first Game, visibility, Require approval, photo, Invite link reset), transfer ownership, delete it and, on a Club Group, unlink it from its Venue. The owner cannot Leave; they transfer ownership or delete the Group first. A Group approver is not an owner.
_Avoid_: creator (in UI copy), admin

**Transfer ownership**:
The Group owner hands the Group to another member who is on Temba (never an Unclaimed player). The new owner becomes the creator for every door; the previous owner stays a member and becomes an Appointed Organizer. Nobody else is notified.
_Avoid_: handover, reassign

**Group delete**:
A Soft-delete by the Group owner, confirmed by typing the Group name. The Group disappears from every list, door and Invite link for everyone; memberships, the standing and played Games are kept, so each player's history still shows them. Games that had not started are cancelled. Nobody is notified. Not a Soft-archive: there is no undo door.
_Avoid_: archive, remove (when you mean the whole Group)

**Loose Group Private**:
A Loose Group that is not listed; joinable by Lookup invite or Invite link from the User who created it or one of its Appointed Organizers.
_Avoid_: secret Loose Group

**Lookup invite**:
An in-app invitation to an existing User, chosen from a searchable list of Users the sender is allowed to invite. The invitee must accept. Whoever may send may revoke unused Lookup invites. Group and Game allow selecting more than one User per send; incomplete Team allows one.
_Avoid_: Email invite, phone invite, magic link, Invite link, User directory (there is no global directory page; search is the send door only)

**Email invite**:
Retired as a product door. Do not send named invitations bound to an email address. Leftover Email invite URLs must not admit.
_Avoid_: using this as a current channel; magic link; Invite link; Lookup invite

**Invite link**:
A door URL any authenticated User may use while that token is live. Each copy mints a new token; older tokens stay valid alongside it. No rotate or revoke. A Group or Team token expires 6 hours after mint. A Game token has no clock of its own: it works until the Game's window ends, registration is closed, or the Game is cancelled. Used on every Group type, incomplete Team, and Game. Accepting a Group Game's Invite link also joins the Group when the User is not yet a member; a blocked User is refused on a private Game and registers without joining on a public one. Game Invite links may be opened at `/g/{code}` and Group Invite links at `/gr/{code}` (eight-character public alias on the same row); Team stays token-path only.
_Avoid_: Email invite, Lookup invite, magic link, Group URL (Loose Group Public still uses the Group URL as a separate join door)

**Invite doors**:
Lookup invite and Invite link as the two live invitation channels onto a Group, Team, or Game. Refused on a Challenge Game, whose sides are the two Teams.
_Avoid_: Email invite, invitation (when you mean a specific channel), Venue link (that is a different door), inviting onto a Challenge Game (captains name the Matchday squad)

**Venue link**:
A Group’s live association with at most one Venue, stored as `groups.venue_id`. It is made when the Group creator accepts a Group link request, or at once when an Operator links the Group from the Operator Venue page (`venues.linkGroup`, ADR-0063), and ended when the Group creator (`groups.unlinkFromVenue`) or a Venue manager (`venues.unlinkGroup`) unlinks the Group. A Group with a Venue link is a Club Group. Distinct from Invite link.
_Avoid_: Invite link, membership, join, Community link, Venue Community (retired, ADR-0055)

**Group link request**:
A Venue manager’s request that a Loose Group Public link to that Venue. The Group creator accepts or declines it; the Venue manager may cancel it while pending. Accepting turns the Loose Group into a Club Group of that Venue. Distinct from a Group join request (a User asking to join a Group).
_Avoid_: Group join request, Venue link (that is the result), invite (when you mean this request), Group transfer, Venue link request (retired, ADR-0055)

**Team**:
A persistent Roster of Users for one sport, sized by its Team roster rule: a padel Team is exactly two Users; a football Team is two to twenty, flat, and complete at five. Distinct from Group. A Team may be below complete (a padel Team with one member and a pending Lookup invite or live Invite link for the second seat; a football Team under five). A Team is full at its maximum. A Team stands on its own: no Group owns it and it links to no Venue, though it may carry a Group tag. Its creator is its Captain (ADR-0059): on a football Team the Captain acts for the Team, together with the Organizers of its tagged Group, other members may leave, the Captain dissolves; on a padel Team both members act for the Team. A Team is not dissolved while it has an open Challenge, a pending Proposal or a Challenge Game neither played nor cancelled. Any signed-in User may open a Team's detail (record, form, Rivals, Roster); invites, leave and dissolve stay with members.
_Avoid_: Group, Game team, pair, doubles (when you mean this entity), Club Team, Loose Team (retired, ADR-0055)

**Captain**:
The product name for a Team's creator (`teams.created_by`); there is no captain column and no transfer. On a football Team the Captain acts for the Team, and so do the Organizers of the Group the Team is tagged to; on a padel Team both members do. The Roster stays the Captain's, and so does the Team image: only the Captain changes or removes it.
_Avoid_: owner, admin, creator (in product copy), organizer (when you mean this)

**Roster**:
The members of a Team: who is on the Team. Padel exactly two; football two to twenty, flat, whatever Format the Team plays. A football Team may post a Challenge in a Format once its Roster holds at least that Format's side ("Plays 5, 6 and 7-a-side" lists the Formats it can post). A legacy Roster above twenty keeps its members and reads "22 of 20"; no door adds to it. The Roster is not who plays a given Game.
_Avoid_: squad (that is the Matchday squad), line-up, members (bare, in product copy)

**Group tag**:
An optional reference from a Team to one Group of the same sport (`teams.group_id`). The Group does not own the Team: the record and Rivals belong to the Team. The tag shows on the Team's detail ("Gooz of Arad's team"), lists the Team on the Group page, and lets the Group's Organizers act for a football Team on its Challenge doors, not its Roster doors. Set at create or later by the Captain only, and only to a Group the Captain is a member of; cleared by the Captain or an Organizer of the tagged Group, and when the Group is deleted.
_Avoid_: Group team, Club Team (retired), owned by, parent

**Challenge**:
A Team's open request for an opponent: sport (the Team's), for football a Challenge format, Level wanted, preferred Venues, days and timings or exact slots, and a line from the Team of up to 140 characters. Posted by someone who acts for the Team; a Team has at most one open Challenge. Open for seven days after posting, longer only while a Proposal is pending; then it expires quietly and the Users who act for the Team are told. It may be withdrawn while open. Any signed-in User sees it on the Open board; a viewer whose Teams cannot propose sees it greyed with the reason. A request, never a Game (ADR-0061).
_Avoid_: match request, open game, fixture, invitation

**Challenge format**:
The football Side size a Challenge asks for: 5, 6 or 7-a-side. Product copy says Format. Stored as `challenges.side_size`; required on football, absent on padel, and only a Format the Roster can field may be posted. Not the Game format enum (`friendly_game`, `americano`, …).
_Avoid_: game format (that enum), team size, squad size

**Level wanted**:
A Challenge's inclusive Level band range, stored in tenths like a Game Level range; either bound may be open, and none means any level. A Team whose Team Level is outside it, or that has no Team Level, sees the Challenge greyed and cannot propose. There is no request or waiver path.
_Avoid_: level range (bare, that is a Game's), level gate, skill filter

**Proposal**:
One Team's answer to a Challenge: a Venue, a start at least an hour ahead and within 30 days, and optionally a Court on that Venue and a price per player. Sent by someone who acts for a Team of the sport that does not share a member with the posting Team, whose Roster fields the Challenge format (padel: both players) and whose Team Level is inside the Level wanted. Pending for 48 hours; a change replaces its terms in place and starts the 48 hours again, at most three times. The posting Team confirms it or asks for another time (declined); the proposing Team may withdraw it; the clock expires it; the rest are passed over when another is confirmed or the Challenge is withdrawn. At most one pending Proposal per Team per Challenge; after a decline the Team may propose again. Nothing about who will play. Nobody who acts for the proposing Team may confirm it. Confirming ("Confirm, make it a game") reads every propose rule again for both Teams, then creates the Challenge Game and passes the other pending Proposals over, all at once; a failed re-check names the reason and changes nothing.
_Avoid_: accept (the button says Accept; the entity is a Proposal), bid, offer, counter

**Challenge Game**:
The Friendly game a confirmed Proposal creates (ADR-0061): no Group, the Proposal's Venue, Court, start and price, a window of the Challenge's duration, registration closed, both Game teams bound to the two Teams (the poster's is side 1). No Waitlist, no Invite doors, nobody joins, leaves or is kicked, and its shape (caps, Game Level range, Season) is the Challenge's. Padel seats both pairs at confirm, Positions from Preferred Position, and is Rated at the groupless weight. Football opens with two empty sides of `side + 3` seats in black and white, the one Match and its Score shell, and counts for Temba Level (ADR-0069); each Captain names a Matchday squad. Its score needs a confirmation from each Team: a named player of the side, or whoever acts for its Team, confirms for that side only, so nobody who acts for one Team settles it for the other. Football Challenge Games created before it counted stay Unrated, and their Organizers' confirmation stays final. Its Organizers are whoever acts for either Team; any Roster member of either Team may view it. The Challenge stays confirmed if the Game is cancelled.
_Avoid_: challenge match, team game (that is a team-only Game), friendly (bare)

**Matchday squad**:
The players a Captain names from the Roster for one football Challenge Game: the side plus up to three Reserves (8 for 5-a-side, 9 for 6-a-side, 10 for 7-a-side). Named after the Game exists, editable until the Score is entered. A side is empty with nobody named, short below the side, and named at the side or more; a Score cannot be entered until both are named ("Name both squads first"). A day before kick-off whoever acts for a side still empty or short is reminded once. Only named players are seated and get the result, Marks, MVP and head-to-head. On padel the squad is the whole Roster, seated at confirm.
_Avoid_: roster, line-up, Football side (the Game team row), registered players

**Reserve**:
One of the up to three seats beyond the side on a Matchday squad, labelled so an empty Reserve never reads as a missing player. No stored flag: the first `side` named players are the side and the rest are Reserves for display. A named Reserve is a seated player like any other.
_Avoid_: substitute, bench (as an entity), extra

**Team record**:
Wins–losses (padel) or wins–draws–losses (football) over a Team's completed Matches on non-cancelled Games, read from the Game teams bound to the Team and derived on every read. A Match awaiting confirmation or a Walkover does not count. No stored counters.
_Avoid_: stats, standing (that is a Season Standing), win rate

**Rival**:
Another Team this Team has completed two or more Matches against, shown with its head-to-head and last result. A Team played once is the closest candidate, shown when there is no Rival yet.
_Avoid_: opponent (any Team on the other side of one Match), nemesis, rivalry (as an entity)

**Rematch**:
Posting a Challenge pre-filled from a Team you have played and sending it straight to that Team: a nudge Notification to the Users who act for it, and the nudged Team's view of the Challenge says so and offers Accept. The target is another Team of the same sport that the posting Team has completed at least one Match against. The form opens on the Team, the last Game's Format and Venue and a Level wanted one band either side of the opponent's Team Level, all still editable; the review screen can also send any Challenge straight to a Team played. It still sits on the open board for everyone eligible.
_Avoid_: return match, revenge, invite (a Rematch is a Challenge, not an Invite)

**Head-to-head**:
The wins–losses (wins–draws–losses in football) between a Team and one Rival, from this Team's side, derived from the same Matches as the Team record.
_Avoid_: H2H (in product copy), series, rivalry score

**Team Level**:
The mean displayed Level, in tenths, of a Team's Roster members who hold a Rating for the Team's sport, shown as a Level band and the mean ("C, avg 2.8"). A football Team shows the mean of its members' OVRs ("C+, avg OVR 72"). A Team with no rated member has no Team Level. Used by the Challenge Level wanted gate, which still compares tenths. Never a Rating.
_Avoid_: team rating, average rank, squad level

**Team roster rule**:
The size rule a Team follows for its sport: minimum and maximum members, the count at which it is complete, and whether its member pair is unique across Temba. Padel: exactly two, complete at two, pair unique. Football: two to twenty, complete at five (the smallest Challenge format), pairs not unique. Join, invite and add doors refuse at the maximum; nothing shrinks a Roster already above it.
_Avoid_: team size (bare), squad size, captain rule

**Game team**:
One side on a padel Game: a complete Team, an ad-hoc pair of Users, or one User occupying one of two Positions until a second User takes the other Position. Reused on that Game’s Matches. Not a Team. An Americano has no Game teams until Matches exist.
_Avoid_: Team (when you mean a Game side), partnership, pair (when you mean this entity), Court (the 2v2 seat diagram is not a Court)

**Position**:
Left or right on a padel Game team, from that side facing the net. Distinct from a Match slot and from a Court.
_Avoid_: Court, slot (when you mean this), seat (when you mean this), Preferred Position (that is a User's profile default)

**Preferred Position**:
A User's standing preference for Left or right, or Either. A default for the Game seat picker, not a Position itself.
_Avoid_: Position (that is the per-Game-team seat), side, hand, preferred side, Both sides

**Either side**:
On a padel Friendly game, a User's answer to "which side?" when they take a seat on a Game team without picking Left or Right (ADR-0065). Left, Right and Either are the three answers; a side is a label on a seat, so it never blocks a join. Either next to a User who picked plays the other side, shown "auto". Either next to Either stays open, shown "no sides picked", and is sorted on court. A side a partner picked cannot be taken; the Position an Either-side User holds can, and moves them over. A seated User may change their answer until the Game starts, and an Organizer may set a full Game team's sides on the sheet; a User whose Position moves because of either is told. Not on Friendly tournaments.
_Avoid_: flexible seat, any seat, Preferred Position (that is the profile default), wildcard

**Operator**:
A Temba staff User. Operators curate Venues and Courts, grant Venue managers, verify Groups, link Loose Groups to Venues directly, and may set any other User's Level in either sport (ADR-0046).
_Avoid_: Admin, Owner (retired Community roles, ADR-0055), system admin, platform admin, superadmin

**Venue manager**:
A User granted management of one Venue by an Operator: Venue details, Courts, Opening hours, Closures, Pricing rules, Cancellation policy, Bookings, Payments, Customers, reports and Group link requests for that Venue, from the Venue console. A User may manage many Venues. Not an Operator; an Operator may do everything a Venue manager may. Managing a Venue gives no door on its Club Groups.
_Avoid_: facility owner, venue admin, Owner, Admin, Operator, staff

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
A User as seen from one Venue: someone who holds or has held a Booking there. Derived from User and Bookings, never a separate record. Needs no Group membership.
_Avoid_: client, member (when you mean a Group member), player (when you mean this view), account

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
A User whose Clerk `publicMetadata.levelSetter` is `true`. A Level setter may set the Level of any other member of a Group they belong to. Granted and revoked only in the Clerk dashboard. Independent of Operator and Organizer.
_Avoid_: admin, rating admin, rating editor, Operator (when you mean this)

**Soft-archive**:
A reversible hide of a Venue by an Operator. It hides the Venue from unlocked Game create and from the console’s Group search; refuses new Group link requests, their acceptance and an Operator's direct link; refuses new Court assign on Games whose Venue is that site (skip/clear still allowed); Venue links stay, so a Club Group whose Venue is Soft-archived may still create a Game there with skip Court and cannot pick another Venue. Not a delete and not unlinking a Group. Groups, Teams and Games are never Soft-archived.
_Avoid_: delete, hard-delete, detach, hide (as the name of the action)

**Game**:
The parent event that contains one or more Matches. A new Game must belong to a Group, except a Booking Game and a Challenge Game, which have none; other groupless Games are legacy rows. Every Game has exactly one Venue, chosen at create and immutable after. If the Game belongs to a Club Group, the Group’s linked Venue is used and cannot be swapped at create. Organizers of a Group Game are that Group’s creator and Appointed Organizers. Those people may create the Game, cancel it or a Match, and kick registered or waitlisted entries. A groupless Game’s organizer is its creator, except a Challenge Game's, which are whoever acts for either Team. A Game on a Group that is not a Verified Group is Unrated and private. A football Game is a Friendly game with **Roster registration** and a **Side size**; it has no Match until its Organizer publishes the two **Football sides**, which creates its one Match. It comes only from a football Group, a football Court Booking or a confirmed Challenge, whose Challenge Game has its two sides and Match from the start. On a Verified Group it counts for Temba Level and may have a Game Level range, shown in OVR; on a tier Group it moves Tier points; otherwise it is Unrated (ADR-0069). Positions, Game teams and Sets are padel structure.
_Avoid_: Event (when you mean Game), session, match (that is a Match)

**Game day**:
The product-timezone day a Game is listed, picked and labelled under. It opens at 00:30 and closes at the following midnight, which still belongs to it: a Game that starts exactly at midnight is the evening before's. A Game's window may run past that midnight, to 03:00 at the latest, and stays a one-day window (ADR-0058). Picker slots count minutes from the Game day's midnight, so 1:30 AM after a late start reads `25:30`.
_Avoid_: calendar day (when you mean this), night, session

**Roster registration**:
A Game admit that occupies a count against players allowed and no Position. Used by Americano before its Matches exist and by every football Game. Waitlist, leave, kick and the Invite doors apply; the seat picker does not.
_Avoid_: pool registration (a Pool is a tournament stage), open registration (registration is open or closed on every Game), seatless

**Side size**:
On a football Game, how many play on each side at once: 5, 6, 7, 8, 9 or 11. Players allowed is at least twice the Side size and at most 40; the rest are substitutes. Shown as "5-a-side". An Organizer may change it in Edit game until the Football sides are published; growing it lifts players allowed to two full sides.

**Football role**:
How a registered User plays a football Game: keeper or outfield, with a **Preferred football position** (defender, midfield or forward) for outfield. Chosen when joining and changeable until the Score is in. A preference, never a promise. A football Game has two keeper seats, one a side.
_Avoid_: Position (the padel seat), Preferred Position (the padel side preference)

**Football side**:
One of the two halves an Organizer splits a football Game's roster into, by Level or by hand, each worn in a **Bib** colour. Stored as a Game team with a side index. Publishing the sides again replaces them until the Score is in. Product copy says team.
_Avoid_: Team (the persistent roster), squad

**Bib**:
The colour a Football side wears: black, white, red, dark blue, light blue, green, yellow, orange, purple, pink or grey. The two sides never share one. One of the two places colour appears in the product; the other is a Mark coin (ADR-0056).

**Score**:
On a football Match, the goals each Football side scored, stored as the Match's one Set. A player on either side or an Organizer enters it from kick-off; it is agreed once one player from each side confirms, or as soon as an Organizer confirms. A changed Score asks again.

**Scorer**:
A player named with the goals they scored in a football Match. Optional, and never more goals than their side's Score. On a Match that counts for Temba Level a player's own goals, and their side's goals conceded weighed by Football role, are OVR's goals part (ADR-0069), so a changed list of who scored asks the other side again, as a changed Score does.
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

**Played game**:
A Friendly game whose window has ended or whose Match is completed. Its roster is the record of who played: join and leave are gone for everyone, and only an Organizer adds or removes players. On the Mobile App its screen leads with the result on ink, then the two rosters, the facts, and Share result. During the Marks window its screen also carries the MVP row and the marks rows.
_Avoid_: finished game, past game, archived game

**Mark**:
One of twelve honours a player gives another on a completed Friendly game, during the Marks window: a coin with a name, a description, a Giver group and the sports it applies to. Each giver gives at most three per Game and at most one to any one player, never to themselves, and may take one back while the window is open. Givers are seated account holders; anyone seated receives, Unclaimed players included. A Mark is a Match fact that hangs off both Users' rows. Product copy says mark.
_Avoid_: badge, trophy, award, honor (bare), ResultMark or form mark (those are the W/L glyphs), sticker

**Roast**:
A Mark that teases rather than praises: Mr Fumble and Sayed Malek. Counts like any Mark on the Game screen. Its receiver may hide every Roast from their Player profile with one setting; hidden Roasts still show to everyone who can open that Game.
_Avoid_: negative mark, penalty, insult

**Marks window**:
The 48 hours after a Match's completion during which Marks are given and the MVP is decided. On a Match that counts for Temba Level the MVP closes with its 24-hour Rating window instead; Marks keep the 48 hours. Anchored on the Match's completion moment, suspended by a wrong-score report, restarted by the next completion. The vote may close earlier when everyone has voted; the window never does. Closed by a Job and by the read-time rule. Judged by the server clock.
_Avoid_: voting period, deadline, grace period

**MVP**:
The one player of a Friendly game named most valuable after the score, decided the way its MVP mode says. A vote is one per seated account holder, for any other participant, hidden until it closes; a tie goes to the Organizer; no pick by the close means no MVP. On a Match that counts for Temba Level it closes with the Rating window, and an MVP decided by vote is OVR's MVP part; one an Organizer picked or broke a tie for moves nothing. Shown on the Played game, the Result card and the cabinet with the gold coin. Not a Mark: nobody gives it.
_Avoid_: man of the match, player of the game, best player, star (bare)

**MVP mode**:
How a Friendly game decides its MVP, chosen by the Organizer at create: players vote (the default), the Organizer picks, or no MVP. The Organizer may change it until the Match completes; after that it is fixed. Every other format has no MVP. In organizer mode the Organizer never picks themselves, but may break a tied vote in their own favour.
_Avoid_: MVP setting, MVP type

**Giver group**:
Who may give a Mark: your teammate or partner (same Game team), anyone in the game, or the other side (the opposing Game team). The giving sheet is grouped by it.
_Avoid_: category, tier (that is a Group Tier)

**Cabinet**:
The Marks and MVPs a User has collected, shown on their Player profile per sport: a summary row, every kind with its count or "Not yet", and per kind the Games it came from. A Mark counts on the sport of the Game it was given in, an MVP on the sport it was won in, once it has settled. Follows Match history visibility; when the owner hides Roasts, other viewers see no trace of them.
_Avoid_: trophy case, collection, badge wall, achievements

**Result card**:
A 1080 by 1920 picture of a Played game's result on ink, sized for a story: the winners first, the score or the Sets, the scorers or line-ups, the Venue and the date. Saved to the photo library or handed to the share sheet as a PNG.
_Avoid_: story (that is where it goes), poster, screenshot

**Result sticker**:
A compact Result card on a transparent canvas, to drop on the player's own photo. Same content as the Result card, one line each for the score and your own part.
_Avoid_: widget, badge, overlay

**Americano**:
A Game format with individual-only registration and rotating partners across multiple Matches. Matches are generated after registration.
_Avoid_: Friendly tournament, Friendly game, tournament, team-only (illegal on this format)

**Friendly tournament**:
A Game format whose Game teams are drawn at random and whose Matches are generated by the draw; the organizer does not add them by hand. Its Tournament shape says which stages it plays: Pools, a Knockout, or Pools then a Knockout. In a Pool stage each Pool plays a round robin across several Rounds — one Pass by default, cut short or played twice by the organizer's Round count.
_Avoid_: Americano, Friendly game, league

**Tournament shape**:
Which stages a Friendly tournament plays: Groups only, Knockout only, or Groups then knockout. Chosen at create; Groups only by default. Not a Game format — the format stays Friendly tournament (ADR-0020). Shown to users as _Format_.
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
How many Game teams go from each Pool into the Knockout on a Groups then knockout tournament, taken from the top of each Pool table. Shown to users as _Through from each group_.
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
The random assignment of a Friendly tournament's Game teams to its Pools. Drafted and re-rollable first, then posted, which freezes the seats. Posting either generates every Pool Match at once or leaves the Pool Rounds to be made as Round drafts (ADR-0062). Never a Match result.
_Avoid_: draw (bare — that is a tied Match result), seeding (nobody is seeded), allocation, sorting

**Round**:
One slice of a Friendly tournament's schedule: the Matches sharing a date. Numbered from 1, Pool Rounds first, then one Round per Knockout round. The Round count is the number of Pool Rounds only.
_Avoid_: Match, Set, leg, fixture, week, stage

**Round draft**:
A Pool Round's pairings before it is posted: seen and edited by Organizers only, made by generating every Round, one Round at a time, or by hand. Posting a Round draft creates its Matches on the Round's Courts and times.
_Avoid_: unposted Match, provisional Round, Round plan

**Score stands**:
A drawn tournament Match completes on its own ten minutes after one team enters a score the other team has not confirmed or corrected (ADR-0062).
_Avoid_: auto-confirm, timeout, default result

**Half team**:
A Game team on a Friendly tournament with one Position taken and the other vacant, before the Pool draw. An organizer may merge two Half teams into one Game team. Distinct from an incomplete Team, which is the persistent partnership with one seat.
_Avoid_: incomplete Team, solo, single, orphan seat

**Pool**:
One subset of a Friendly tournament's Game teams that plays a round robin against itself — one Pass by default, cut short or played twice by the organizer's Round count. A tournament has one or more Pools, and every Game team sits in exactly one. Not a Group: a Pool lives inside a single tournament, while a Group is a set of people who play Games. Shown to users as _group_.
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
The queue to join a Game after its cap is reached, first come first served. When an Organizer drops players allowed under the number joined, the latest joiners move here, latest first, keeping the moment they joined as their place, so they lead anyone who waitlisted after them and get a spot back as soon as one opens.
_Avoid_: player (when you mean someone waitlisted), guest

**Game admit**:
Registered occupancy of a User, an ad-hoc pair of Users, or a complete Team on a Game. Distinct from Waitlist and from creating the Game. Refused on a Challenge Game: its padel pairs are seated at confirm and its football sides are filled by naming the Matchday squad.
_Avoid_: join (when you mean this), enroll, registration (when you mean the open/closed window), Game Level range request (that is not occupancy), admitting onto a Challenge Game

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
Of a Group Game: that Group’s creator and its Appointed Organizers. Of a Challenge Game: whoever acts for either Team, who may cancel it, score and confirm it (on a football one that counts for Temba Level, for their own Team's side only), and edit its name, window and price, but not add, kick, invite, publish sides or change its shape. Of any other groupless Game: its creator. Those people may create the Game, cancel it or a Match, confirm a score for everyone, kick registered or waitlisted entries, edit the Game in one sheet (name, window, players allowed and Side size, price per player, Game Level range, Season), decide Game Level range requests, and add players by phone: a User with an account is seated straight away, any other number becomes or reuses an Unclaimed player. An Organizer's add skips the registration window, the Group join gate and the Game Level range, never waitlists, and never adds the person to the Group. The Organizers of a tier Group also make Tier adjustments for its other members, never for themselves, change its Rating settings and, in Organizer mode, give the Performance ratings of its Games.
_Avoid_: creator (when you mean this set), host, admin (when you mean this), game admin, co-host

**Appointed Organizer**:
A Group member a Group approver made an Organizer of that Group's Games and, in turn, a Group approver (ADR-0047). Stored as the member's Group role. Holds the Group creator's powers: Lookup invites, Invite links, Group join requests, adding and removing players, appointing and dismissing other Organizers. Cannot remove the creator, edit, unlink or delete the Group. Never the Group creator (already an Organizer) or an Unclaimed player. Leaving the Group ends it.
_Avoid_: co-organizer, co-host, Group admin, moderator

**Game admins**:
Who hears about a Game's joins and leaves, and gets the admin Finished Game notice: the Organizers and the Group approvers of the Game's Group. On a groupless Game, its creator. Decides who is notified only, never who may act.
_Avoid_: Organizer (that is the write permission), game admin (lowercase, as a role), co-host, host

**Finished Game**:
A Game that is not cancelled and whose Matches are all completed or cancelled, with at least one completed. Derived, not stored. An Americano, which has no Matches, is never a Finished Game.
_Avoid_: completed Game (completed is a Match status), ended, over, past Game

**Game Level range**:
Optional inclusive minimum and/or maximum Level band bounds (D–A) on a Game, stored as tenths. Both unset means no Level gate. Distinct from a User’s continuous Level.
_Avoid_: rank range, ELO range, skill cap (when you mean this), letterNumber D3–A (stored thirds, not the product face)

**Game Level range request**:
A User asking Organizers to waive that Game’s Level range for themselves. Distinct from a Group join request and from Game admit. No message. No expiry.
_Avoid_: join request (that is a Group join request), join (when you mean this request), Game admit

**Game Level waiver**:
An approved Game Level range request, or an Organizer Lookup invite, that excepts that User from that Game’s Level range. It does not Game admit them and does not occupy a Position or Waitlist row.
_Avoid_: auto-admit, Game admit, exception (as the name of the entity), Lookup invite (that is a door that grants this)

**User**:
A person on Temba. Almost every User has a Temba account; the exception is an Unclaimed player, who has a phone and a name but no account yet.
_Avoid_: player (when you mean User), member (when you mean a Group member)

**Unclaimed player**:
A User an Organizer or Group approver added by phone and name, with no Temba account yet. They are seated, rated and shown like any User, marked "Not on Temba yet", but never found by Lookup invite or Partner search and never sent a Notification. One per phone. While unclaimed, an Organizer or Group approver of a Game or Group they are on may correct the name, when the User who added them also organizes that Game or Group; the phone never changes, so a wrong number is fixed by removing and adding them again. Signing up with that phone, verified, claims the row and its history; an existing account that verifies the phone later absorbs it (ADR-0042).
_Avoid_: Guest (that is a Booking holder without an account), placeholder, ghost, manual User, invitee

**Onboarding questionnaire**:
The sports, Level and side questions, now one Profile task ("Pick your sports and level") on the Profile checklist rather than a gate (ADR-0049). It first asks which **Sports played**, then padel (Level band and Preferred Position) and football (Football role, Preferred football position and a **Football self-placement**) for each picked sport, and saves every answer in one call. **Either** and **Not sure** (which starts padel at D+) are the low-commitment answers. Users who predate it are complete without answering.
_Avoid_: signup flow (that is Clerk's), profile setup, wizard, survey, onboarding (bare, when you mean this entity), Lookup invite

**Profile checklist**:
The list of what a User can still add after sign-up: the required name when an account predates it, then the optional Profile tasks (profile photo, verified email, the Onboarding questionnaire). It is the "You're in" screen after sign-up, at Route `/onboarding` on web and `/complete-profile` on mobile, and a card under the Home header until every task is done or the User skips it on that device. Phone and name count as its first two steps ("2 OF 5"). Pure in `@repo/domain/profile-checklist` (ADR-0049).
_Avoid_: onboarding (bare), setup wizard, progress tracker, todo list

**Profile task**:
One row of the Profile checklist. Each saves on its own and returns to the list. The name task is required and never hidden by Skip for now; the others are optional.
_Avoid_: step (when you mean a task), onboarding step, action item

**Sports played**:
The sports a User told the Onboarding questionnaire they play: padel, football or both. It decides which questions they answer. A User with none recorded onboarded before the question existed and is read as padel only.
_Avoid_: favourite sports, interests

**Football self-placement**:
A new football player's own starting Level, picked as Beginner, Casual, Competitive or Pro instead of a letter. Each declares the football Level that Make teams balances on (D, C, C+ or B; never A) until football results rate, and states the OVR it starts at: 43, 61, 72 and 78. The You page keeps the word as a caption under the OVR until a Match counts. One time, like the padel Level declaration.
_Avoid_: football rating (when you mean the self-placed start), skill level

**Home**:
The signed-in User’s landing dashboard after login. It shows that User’s Games, Level, and stats. Distinct from Group home.
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
An in-app record that tells one User that something happened on a Group or Game they run, including a Group join request or a Level range request waiting on them; that a Game they played on has finished; that an Organizer seated them on a Game; that a Level setter or an Operator set their Level, and why; that a Group approver or Organizer decided their request, by name; that a Captain invited them to a Team (the Lookup invite stays the thing they accept); that a Challenge or Proposal of a Team they act for was answered, confirmed, declined, passed over or expired, or that a squad is still to name a day before kick-off; or, once, that signing up claimed the Games an Unclaimed player played under their number. One row per recipient, unread until that User opens it or marks all read. Kept 90 days. Not a push message, not an invite; its email copy is the Notification email.
_Avoid_: alert, activity, feed item, message, Lookup invite (that is an actionable invitation)

**Notification email**:
The email copy of one Notification, sent once to the recipient's verified email address moments after the Notification is written, while Email notifications are on for that User. It reads what the in-app row reads and links to the Game or Group on the Web App. Never a digest, never sent to an unverified address, never sent twice.
_Avoid_: email alert, digest, newsletter, mail (when you mean this entity)

**Email notifications**:
The one on-or-off setting that says whether a User receives Notification emails. On for every User until they turn it off in Settings; it does nothing while the User has no verified email.
_Avoid_: email preferences, subscription, opt-in, unsubscribe (when you mean the setting)

**Stored Locale**:
The Locale the API keeps for a User, written by the clients whenever the language they show changes, and read wherever the product speaks to the User away from a client, such as a Notification email. English until the User has used Temba in another language.
_Avoid_: language preference, user language, locale setting, Accept-Language

**Notifications page**:
The Web App page at `/dashboard/notifications`, opened from the bell, listing the signed-in User's Notifications newest first, with a link to pending invites when there are any.
_Avoid_: feed, inbox (when you mean this page), activity log, Home

**Standing**:
A User's position among the other Users of one Group, shown as position and member count ("#4 of 13"). It counts every completed Match of the Group's Games, Rated or Unrated, padel or football (ADR-0045), scoring win 3, draw 1, loss 0 to every player on the side. Ties break on wins, then head-to-head, then set difference (padel) or score difference (football), then fewer games played. A member with no result in the lens is listed Unranked, below the ranked rows, without a position; one result is enough to hold a rank. When the Group has a Season, the Standing reads the Season's window; the All-time lens reads every Match. A Standing is a position among others, so it is never a Level, a Level band, a Rating or a Group Tier.
_Avoid_: ranking, leaderboard position (when you mean this entity), player standing (Level, Recent form and All time are not a Standing), rank, Pool table (that ranks Game teams inside a tournament Pool)

**Season**:
An optional date window the Group owner (or Owner and Admin on a Club Group) sets on a Group, inclusive on both product-timezone days. A Group Game links to at most one Season of its Group, and the Standing for a Season reads the completed Matches of the Games linked to it (ADR-0050); a Game with no Season is a friendly that updates Levels but no Standing. A new Game starts in the open Season that holds its day; an Organizer may link, move or unlink it in Edit game while the Season holds the game day and no score is confirmed. A Season is Upcoming before its first day, Active until its last day, and Closed after it or once closed early, which moves its last day to the closing day; closing re-homes its Games that start after the close, later that day included. Seasons never overlap. A Level is never reset by a Season. The Standing tab opens on the Active Season, else the next one to start, else the latest Closed one, else All-time.
_Avoid_: league, campaign, term, period (when you mean this entity), reset (a Season does not reset Levels)

**Rating**:
A User’s sport-keyed skill state (μ, φ, σ). Not shown raw in the App. A padel Rating moves by Glicko-2; a football Rating moves by the OVR step, the sum of its parts in OVR points (only the result part so far), and its φ only carries Provisional, set from the count of counting Matches, so idle time never grows it (ADR-0069).
_Avoid_: ELO, Elo, player rating (when you mean this entity), rank (that is leaderboard position)

**Level**:
The continuous 0.0–7.0 skill face derived from a Rating’s μ (one decimal in the App). Product copy says Temba Level. Padel shows it as the Level; football shows it as OVR.
_Avoid_: rank, ELO, Level band (that is the discrete label)

**OVR**:
The football face of a Level, 40 to 99, shown as a whole number: `40 + 59 × Level / 7` on the stored μ, so no Rating row is rewritten (ADR-0069). The Level bands apply unchanged, 5.9 OVR each (C+ is 69.5 to 75.4). Home, the You page, the Player profile, Team Level and the Operator's Player Levels page show a football Level as OVR with its band.
_Avoid_: overall (in copy), football rating

**Level band**:
The discrete skill label D–D+–C-–C–C+–B-–B–B+–A–PRO (PRO highest) shown in the App, derived from Level with hysteresis. PRO is reserved for an elite override and is not assigned from Level.
_Avoid_: rank, Level 1–5 (redesign artefact, not product), ELO, D3–A (stored thirds, not the product face)

**Provisional**:
Per ladder. A Level is Provisional while its Rating's deviation φ is above the product threshold (confidence still settling); a Level override clears it. A football Level is Provisional until its fifth counting Match and confirmed after it. A Group Tier is Provisional for the member's first five Group Games or until an Organizer adjusts their Tier points: no fish, a hatched slot, Tier points shown only to them and the Group's Organizers, and not counted when places are cut.
_Avoid_: unranked, unrated (a User may already have a Level), PRO (that is a Level band label)

**Level override**:
A Level that a Level setter or an Operator set by hand, and its audit record: who set it, by which door (`set_by_role`, `level_setter` or `operator`; `verifier` is kept for a Verifier's calibration), a required reason from five, and an optional note of up to 280 characters (ADR-0073). An Operator's has no Group, and on football an Operator sets it as an OVR. The player is told at once, by a Notification that names the setter, the reason and the note. An override from before reasons were required reads "No reason given". It replaces the Rating's μ and makes the Rating confirmed. Later Rated Matches move the Level from there. There is no undo; a mistake is corrected by another Level override. A Level override is displayed like any other Level.
_Avoid_: manual rating, rating override, Rated Match (an override is not a Match), permanent override

**Rated Match**:
A completed, non-cancelled Match on a Game that rates, which produced rating events for the Users on its two Game teams: Temba rating events when its Rating scope is `temba`, Group rating events when it is `temba` or `group` on padel. A football Match that counts for Temba Level is a Rated Match too: one rating event per seated player, with its parts, and no Tier points; a tier Group's Match moves Tier points and writes no rating event. A Match on an Unrated Game is never a Rated Match. Copy may say "verified match".
_Avoid_: ranked Match, scored Match (Sets score a Match; rating is separate)

**Unrated Game**:
A Game whose completed Matches never produce rating events or move a Level or a Group Level, while still counting towards its Group's Standing and as played, won, lost or drawn in Last 10, All time stats and Win streak. A Game whose creator chose Unrated, a groupless Game (a Booking Game without a Group, legacy rows), and every football Game on neither a tier Group nor a Verified Group. Match result confirmation still applies. Its Rating scope is `unrated`: `games.rated` and `games.group_rated` both false, fixed at create.
_Avoid_: unranked (the user-facing word is "Unrated"), casual, friendly (that is a Game format), practice

**Rating scope**:
What a Game's completed Matches move, fixed at create (ADR-0053, ADR-0066). One Game feeds one ladder. `temba`, shown "Counts for Temba rating", moves the Temba Level and the Group Level: a padel Game on a Verified Group. On football, shown "Counts for Temba Level", it moves the Temba Level only: a football Game on a Verified Group. `group` moves a ladder of the Group only: on football, shown "Counts for group tier", it moves Tier points (a football Game on a tier Group); on padel, shown "Counts for group rating", the Group Level (a padel Game on a Group that is not Verified). `unrated`, shown "Unrated", moves nothing. The creator may choose Unrated wherever a scope is offered. Pure in `@repo/domain/game-rating-scope`.
_Avoid_: rated (bare, when the scope matters), ranked, verified game

**Group Level**:
A User's Level inside one Group, from a Glicko-2 Rating that only that Group's Rated Matches move (`group_ratings`). It starts from the User's Temba Level, Provisional, and an Organizer of the Group may set it as a Group Level override. A football Group Level is the football Level until an Organizer sets one. Distinct from the Temba Level ("General" on the You page), which every Group shares, and from a Standing, which is a position.
_Avoid_: group rating (when you mean the face), local level, club level

**Group Level override**:
A Group Level an Organizer of the Group set by hand, and its audit record (`group_level_overrides`). Works like a Level override, inside one Group. Never moves the Temba Level.
_Avoid_: group rating override

**Group Tier**:
A football Group member's strength inside one tier Group, a football Group that is not Verified (ADR-0066): Tier points, a place and a Tier band. Moved by that Group's Games and its Organizers. Never moves a Level and is never moved by one. Shown on the Group's Members tab, not on the Standing.
_Avoid_: group level, group rating, local level, badge

**Tier points**:
The number behind a Group Tier (`group_tier_points`). Starts at 1,200 and moves once per Match by a result part, an expected-score step on the mean Tier points of the two Football sides, and a performance part; an Organizer may adjust it. Every move is an event in an append-only ledger (`group_tier_events`). Carries across Seasons (ADR-0067). Leaving or being removed from the Group deletes the member's points; the events stay, and a member who comes back starts again at 1,200, Provisional.
_Avoid_: Elo, group Elo, rating points, Standing points

**Tier band**:
Shark, Hamour, Kanaad or Safi, shown as a fish. A place, not a threshold: the Shark is first, Hamour the next 15% of the other ranked members, Kanaad the next 35%, Safi the rest. Only members out of Provisional are ranked, and there are no fish until four are. Pure in `@repo/domain/tier-bands`.
_Avoid_: badge, rank, Level band, league

**Tier adjustment**:
An Organizer's manual change to another member's Tier points in a tier Group (ADR-0073): at most 400 points from where they stand, with a required reason from the five Level override reasons and an optional note of up to 140 characters. Written as an `adjustment` event in `group_tier_events`, on top of what the Games did. It moves points, never the fish directly: the Group's places are cut again, and the member and everyone whose fish moved are told at once. It ends a Provisional tier. There is no undo; a mistake is corrected by another Tier adjustment.
_Avoid_: override (that is a Level's), penalty, reset

**Rating settings**:
A tier Group's choice of who gives Performance ratings after a Game (Off, Organizer rates, Everyone rates), how much of each Tier points move they make (light 20%, standard 30% or heavy 50%; the rest is the result) and, when everyone rates, whether an Organizer's rating counts double (ADR-0068). Stored on the Group (`groups.performance_rating_mode`, `performance_weight_percent`, `organizer_counts_double`), Off at 30% by default. Only the Group's Organizers see and change them (`groups.ratingSettings`, `groups.updateRatingSettings`), from the Group's menu; members read one line under the Standing saying how ratings work in the Group. A change applies from the next Game: a completed Match never moves again. Verified Groups and padel Groups have none. Pure in `@repo/domain/group-rating-settings`.
_Avoid_: group rules, scoring settings

**Performance rating**:
A 1 to 10 score for how a player played a football Match on a tier Group, given while its Rating window is open (ADR-0068). 6 is an ordinary game; nobody rates themselves, only the players of the Match are rated, and a blank is not a zero. In Organizer mode only an Organizer of the Game rates, on Rate the game, where the star picks the MVP; an Organizer who rated moves on the result alone. When everyone rates, every seated account holder rates their teammates and, if they want, their opponents, and may change their ratings until the window closes; nobody, a player or an Organizer, is ever shown another's ratings, only how many have rated. Each player's ballots settle into one rating, a weighted mean that drops the highest and the lowest from five ballots up and needs three ballots when everyone rates, where an Organizer's counts double if the Rating settings say so. Compared with the player's usual rating in the Group and centred on the Match, it makes the performance part of the Tier points move; a player with no settled rating moves on the result alone. Stored in `performance_ratings`, settled into `performance_rating_results`. Pure in `@repo/domain/performance-rating`.
_Avoid_: player rating (bare), Mark, score, vote (that is the MVP's)

**Rating window**:
The 24 hours after a football Match completes on a tier Group whose Rating settings are not Off, in which Performance ratings are given (`match_rating_windows`, ADR-0068). Opened at completion with a snapshot of the Rating settings, and the Tier points move waits for it. A football Match that counts for Temba Level always opens one, in Everyone mode, and its OVR move with all four parts waits for it. In Organizer mode the Organizer's submit closes it at once and the Organizer is told when it opens; when everyone rates, every seated account holder is told. Otherwise it closes at 24 hours, by the `rating-window.settle` Job or on the next read when the Job is late, and with no ratings everyone moves on the result alone. A wrong-score report suspends it and keeps the ballots; the next completion reopens it for a fresh 24 hours. A Match with no window, such as one in Off mode, writes its move at completion.
_Avoid_: voting period, Marks window

**Rating history**:
The list of everything that moved a User's Group Tier, newest first (ADR-0073): each Game with its result part and performance part, and each Tier adjustment with the Organizer's name, the reason and the note. A read over `group_tier_events`, not a table of its own; band changes are not lines in it. In a Group it is "Points and history" (`groups.tierHistory`), which only the member and the Group's Organizers may read.
_Avoid_: activity, audit log, feed

**Match history visibility**:
Who sees a User's form, stats and partners on their Player profile: everyone who may open it (default), Group members, or only them. A viewer it excludes sees Level and Preferred Position only.
_Avoid_: privacy (bare), profile visibility

**Play windows**:
The parts of the week a User says they usually play: weekday or weekend (Friday and Saturday) × morning (before noon), afternoon or evening (after 6 PM). Asked in Settings as "When you play". Seat alerts lean on it.
_Avoid_: availability (that is a Venue's free Court time), schedule
