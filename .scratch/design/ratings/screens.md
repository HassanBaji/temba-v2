# Ratings design: overview and screen copy

Source: the owner's prototype `Ratings.html` (open it in a browser; screens 2d, 3b, 4a and 4b are live) and the overview diagram `overview.webp`, both in this folder, received 2026-11-11. This file is their text, so a ticket can cite a screen by its id. Spec: `.scratch/rating-redesign/spec.md`.

The copy below is the prototype's own wording. Where it conflicts with the glossary ("admin", "man of the match", "verified match", "group Elo"), `.scratch/rating-redesign/decisions.md` records the call. Numbers on the screens are illustrative. `{{ … }}` marks a value the live prototype computes.

## Overview diagram

**Temba ratings. Tier is your group. Level is you. Rank is earned.** Left to right: harder to earn, harder to change.

| | Group Tier | Temba Level | Official Rank |
| --- | --- | --- | --- |
| Answers | Where am I in my group? | How good am I? | What have I won? |
| Sports | Football | Football + padel | Football teams, padel players |
| Fed by | Unverified group games | Verified matches: public, or in a verified group | Tournaments; football division matches too |
| Who controls | Group admin | Temba admins + verifier roles | Nobody, results only |
| How it moves | Group Elo, admin can adjust | Results; football adds ratings, goals, MOTM | Points per win and round reached |
| Shown as | Fish badge | Big number + band | #position + points |
| Used for | Balancing teams in the group | Open games, filters, challenges | Seeding, leaderboards, prestige |
| Resets | Group's own season | Never, it just moves | Each season; football keeps its division |

Rules that keep it clear:

- **Points never flow up.** Group games never touch Level or Rank, so a friendly group can't inflate anyone.
- **Hints flow down.** A new member's Level suggests their starting tier; the group admin confirms it.
- **Every manual change is logged** with who and why, visible in the player's rating history.
- **Provisional for 5 verified matches.** The Level track stays hatched until it's confirmed.
- **Three shapes, never alike.** Tier is a badge, Level a number, Rank a #position.

Football, three ladders:

- **Group Tier: Shark / Hamour / Kanaad / Safi.** From the group's own Elo. Admin can move a player up or down. Powers auto-balanced teams and the group leaderboard.
- **Temba Level: OVR 40 to 99.** Moves on verified matches: result, player ratings, goals and MOTM. Verifiers can calibrate.
- **Team Ranking, in divisions.** Teams are ranked, not players. One open division at first, then Div 1, 2, 3 with promotion and relegation.

Padel, two ladders:

- **No group tier.** Padel group games still count for W/L and season standings. Pairs rotate, so one honest Level does the balancing.
- **Temba Level: 1.0 to 7.0.** The scale padel players already know. Moves on verified matches, weighing partner and opponents. Coaches can assess new players.
- **Player Ranking.** Earned as a pair, credited to each player. Points by round reached, e.g. win 100, final 70, semi 45. Counts per Temba season; titles stay forever.

How a match gets verified:

1. **Public game.** Open to anyone, at a partner venue.
2. **Both sides confirm the score.** In the app, within 24 hours.
3. **A verifier stamps it (optional).** Club staff or referee role. Adds trust, not required.
4. **Counts for Temba Level.** Disputes go to Temba admins.

A **game in a verified group** (the group itself is verified) goes straight to step 4.

Football divisions over seasons: seasons 1 and 2 are one open division, every team ranked together on verified results. Split at season end once there are 16+ active teams; final rank sets Div 1, Div 2, Div 3. Division seasons: teams play league matches inside their division, win 3, draw 1, loss 0. Up and down: top 2 promoted, bottom 2 relegated, every season; new teams start in the lowest division. Official tournaments stay open to every division; your division sets your seeding.

What moves football OVR, each verified game:

- **Result, 40%.** Win, draw or loss, weighed by the opponent team's average OVR.
- **Player ratings, 30%.** After the game, the matchday squads rate teammates and opponents 1 to 10.
- **Goals, 20%.** Scored and conceded while you played. Conceded weighs more for keepers and defenders.
- **MOTM, 10%.** A bonus when you're voted or picked Man of the Match. Other marks don't move OVR.

Keeping ratings honest: no rating yourself, highest and lowest rating dropped, ratings hidden until the 24-hour window closes, verified games only. A rater who is always far from everyone else counts for less.

# Screen copy

## 01. The three ladders on a player. Tier is your group, Level is you, Rank is earned. Each has its own shape.

### Screen 1a

Football player: three ladders, three shapes. number, fish, #position

```text
Ratings
Padel
Football
Temba Level
Confirmed
C+
Level
74
+2 last 8
Next band B− , 40% of the way
How good you are, on verified matches only. OVR runs 40 to 99 and never resets.
Group tier
3 groups
Thursday Football
Kanaad, #6 of 13
1,201
Karbabad Friday Football
Hamour, #3 of 22
1,318
Gooz of Arad
Provisional, 2 of 5 games
Where you stand in each group. Set by that group’s own games and its admin; it never touches your Level.
Official rank
season 3
#3
Gooz FC, Division 1
14 points from 7. Teams are ranked, not players
What you’ve won, officially. Tournament and division results only; nobody can edit it.
```

### Screen 1b

Padel player: two ladders. no group tier, groups keep standings

```text
Ratings
Padel
Football
Temba Level
Confirmed
C+
Level
3.45
+0.15 last 8
Next band B− , 45% of the way
The 1.0 to 7.0 scale padel players already know. Moves on verified matches, weighing your partner and opponents.
Official rank
season 3
#12
430 points
From 5 tournaments. 1 title, kept forever
In your groups
no tier in padel
Padel games
9 won, 3 lost this season
#1 of 6
Tuesday Night Padel
14 won, 8 lost this season
#3 of 12
Pairs rotate, so one honest Level does the balancing. Group games count for won, lost and the group’s season only.
```

### Screen 1c

Rating history: every move, and every manual change with who and why

```text
Rating history
All Level Tier Rank
This week
Level, verified match
Black 5–3 White, Galali. Result, ratings 7.8, 1 goal
+1
74
Tier points, Thursday Football
Won 5–3, rated 7.4 by the squad
+18
1,219
Tier points set by the admin
Thursday Football, 1,260 to 1,201
Hussain A: “Back from two months out, start him lower and let him climb.”
−59
1,201
October
Rank, Gooz FC
Division 1, beat Hidd United 3–1
+3 pts
#3
Level confirmed
Fifth verified match. The track is no longer hatched
72
set
Level calibrated by a verifier
Football, 68 to 71
Coach Yaser (Fantasy FC): “Assessed over two sessions, plays above 68.”
+3
71
Up to Hamour
Karbabad Friday Football, now #3 of 22
tier
1,318
Anything a person changed by hand carries their name and reason, and you see it the moment it happens.
```

### Notes: The system in four lines

```text
Tier is your group. Level is you. Rank is earned.
Three ladders that never share a shape. Tier is a fish badge, Level is a big number with a band, Rank is a #position with points. Football has all three; padel has Level and Rank, and its groups keep plain standings.
Points never flow up
Group games move tier points in that group and nothing else. Level moves only on verified matches. Rank moves only on tournament and division results.
Hints flow down
A new member’s Temba Level suggests a starting tier; the admin confirms or changes it (2e shows one such change, logged).
Provisional
First 5 group games: no fish, a hatched slot. First 5 verified matches: the Level ring stays provisional.
```

## 02. Inside a group. Standing is the season table; the tier lives on Members. Manage, then a player, opens their settings menu, and Adjust rating (2d, live) is one of its rows.

### Screen 2a

Standing is the season: who won most. no fish, no tier points here

```text
Football, you’re an admin
Thursday Football
Standing Games Members
Season 2
All-time
#3
You, 19 points
6 won, 1 drawn, 2 lost. One behind Mahmood
Table
win 3, draw 1
# Player P W–D–L Pts
1 AM Ali M 10 7–2–1 23
2 MS Mahmood S 9 6–2–1 20
3 HH You 9 6–1–2 19
4 NS Noor S 10 5–3–2 18
5 HA Hussain A 8 5–1–2 16
6 YK Yousif K 10 4–3–3 15
7 BF Bo Fareed 9 4–1–4 13
8 JH Jassim H 10 3–3–4 12
9 SR Salman R 8 3–1–4 10
10 KR Khalid R 3 2–0–1 6
3 more
Counts this season’s games and starts again next season. How strong each player is in the group, their tier, is on Members .
```

### Screen 2b

Members is where the tier lives: fish and tier points. admins get manage

```text
Football, you’re an admin
Thursday Football
Standing Games Members
The Shark
Hussain A
1,412 points, top for 5 weeks
13 members
Manage
Tier Player Points
Hussain A Shark, admin 1,412
Ali M Hamour 1,356
Yousif K Hamour, organizer 1,301
Mahmood S Kanaad 1,248
Jassim H Kanaad 1,214
You Kanaad, admin 1,201
Salman R Kanaad 1,187
Ahmed N Safi 1,160
Bo Fareed Safi 1,122
Noor S Safi 1,098
Omar T Safi 1,064
Khalid R Provisional, 3 of 5 games no tier
Majed J Provisional, 1 of 5 games no tier
Tier and points are this group’s own: Hamour is the top 15% after the Shark, Kanaad the next 35%, Safi everyone else. Points come from this group’s games only.
13 members
2 still provisional
Invite
```

### Screen 2c

Manage, then tap a player: their settings menu. adjust rating sits here

```text
Thursday Football
13 players
Mahmood S
Kanaad, 1,248 points, #4 of 13. Member since October.
View profile His public Temba profile
Points and history What moved his tier points, game by game
Adjust rating Move his tier points by hand, with a reason he can see
Make organizer Can create games, set teams and add players
Remove from group He keeps his Temba Level; his tier here is cleared
Cancel
```

### Screen 2d

Adjust a player (live): move the points, see the place and fish, give a reason

```text
Thursday Football
13 players
Adjust rating
Thursday Football. A manual change, on top of what the games did.
MS Mahmood S
Now 1,248, Kanaad, #4 of 13
New points
{{ adjPts }} {{ adjDelta }}
Place
#{{ adjPos }}
{{ b.label }}
or jump: into Hamour , into Safi Reset
Tier after the change {{ adjTier }}
Safi
Kanaad
Hamour
Shark
{{ adjNote }}
Why? Mahmood will see this.
{{ r.label }}
Add a note (optional)
{{ saveLabel }}
```

### Screen 2e

Points and history for a player: what moved their points, manual changes included

```text
Points and history
MS Mahmood S
Midfield, 31 group games
Kanaad, #4 of 13
1,248
53 to Hamour
Temba Level 71
What moved it
last 5
Won 5–3, rated 8.1
Thu 12 Nov. Result +10, performance +9
+19
Lost 2–4, rated 6.0
Thu 5 Nov. Result −11, performance 0
−11
Set by an admin
Thu 29 Oct, 1,180 to 1,220
You: “New to the group but plays Div 1. Starting him near his Level.”
+40
Drew 3–3, rated 7.2
Thu 29 Oct. Result 0, performance +5
+5
Won 6–2, rated 6.4
Thu 22 Oct. Result +8, performance +2
+10
Mahmood sees this same list. His Temba Level (71) suggested his starting tier; it is not changed by anything here.
```

### Notes: Group ratings

```text
Standing is not the level
Standing is the season: games played, won, drawn, lost, points, and it starts again each season (2a). The tier, with its fish and points, is how strong a player is in the group; it lives on Members (2b) and carries across seasons. Temba Level is not shown in the group list; it stays on the player’s own profile.
The admin’s hand
Any admin can move any player’s tier points (2d). It sits in the player’s settings menu: Members, Manage, tap the player (2c). They move points, not the fish: the fish follows from the place, so the sheet shows the new place and tier live, and says who moves the other way. A reason is required; the change and the reason go in the player’s history at once.
Performance ratings, three modes
Set per group in Rating settings (3b), a row in the group’s settings menu (3a). Off: only results move points. Organizer rates: one person scores everyone 1 to 10 after the game (4a). Everyone rates: each player scores teammates and, if they want, opponents (4b).
How it weighs in
The admin picks how much of each game’s move comes from the rating: light 20%, standard 30%, heavy 50%. The rest is the result. A rating is compared with the player’s own usual, so a 7 from a 6-player lifts and a 7 from an 8-player doesn’t.
Fairness in everyone mode
No rating yourself. Highest and lowest dropped. Hidden for 24 hours so nobody rates in reply. A rater always far from the rest counts for less. Optional: the organizer counts double. A blank is not a zero.
Organizer-only gap
The organizer can’t rate themselves, so their own points move on the result alone in that mode.
```

## 03. Rating settings live in the group’s settings menu, not on the Members tab. 3b is live.

### Screen 3a

Group settings menu, from the gear on the group. rating settings is one row in it

```text
Thursday Football
13 players
Group settings
Thursday Football. You’re one of 2 admins.
Edit group Name, photo, sport, home venue
Who can join By invite, admins approve requests
Rating settings Everyone rates after a game, standard weight
Season Season 2, ends 31 December
Admins and organizers 2 admins, 1 organizer
Leave group Hand over admin first
Only admins see Rating settings. Members see a read-only line under Standing saying how ratings work in this group.
```

### Screen 3b

Rating settings (live): who rates after a game, and how much it counts

```text
Rating settings
After each game
performance ratings
{{ mOff.title }} {{ mOff.desc }}
{{ mOrg.title }} {{ mOrg.desc }}
{{ mAll.title }} {{ mAll.desc }}
How much it counts
{{ weightLabel }}
{{ resPct }}% the result {{ perfPct }}% how you played
{{ w.label }}
{{ weightNote }}
Keeping it fair
Organizer’s rating counts double The one person who watched the whole game
Always on: nobody rates themselves, the highest and lowest rating are dropped, ratings stay hidden for 24 hours, and a rater who is always far from the rest counts for less.
Manual changes
Who can adjust Admins only
Reason Always required
Shown to the player Yes, in their history
{{ modeSummary }} Changes apply from the next game.
```

## 04. After each group game: the performance rating. Organizer only (4a) or everyone (4b), both live, then what the player and the organizer see once it closes.

### Screen 4a

Organizer only (live): the organizer rates everyone 1 to 10 and picks the man of the match

```text
Rate the game
Football Thursday Football Final
Black
5–3
White
Thu 12 Nov, Galali Soccer Complex. You organized
How did they play?
{{ orgCount }}
Black won
{{ r.init }}
{{ r.name }} {{ r.pos }}
{{ r.val }}
{{ c.n }}
HH You You don’t rate yourself. Yours moves on the result
White 7 players, not rated yet
6 is an ordinary game. In this group your ratings are the performance part of everyone’s points, 30% of the move. The star is the man of the match.
{{ orgTitle }}
{{ orgSub }}
Submit
```

### Screen 4b

Everyone rates (live): a player rates teammates and opponents, hidden for 24 hours

```text
Rate the game
Football Thursday Football Final
Black
5–3
White
Thu 12 Nov, Galali Soccer Complex. You played in Black
Closes tomorrow, 8:30 PM
Nobody sees who gave what. 5 of 14 have rated so far
Your teammates
{{ meCount }}
Black your side
{{ r.init }}
{{ r.name }} {{ r.pos }}
{{ r.val }}
{{ c.n }}
HH You You can’t rate yourself
White 7 opponents, optional
Rate who you saw; leave the rest blank. A blank is not a zero.
{{ meTitle }}
You can change them until it closes
Send
```

### Screen 4c

When the window closes, the player sees: their rating, and what it did to their tier points

```text
Thursday Football
Your game, Thu 12 Nov Black 5–3 White
7.4 of 10
5
6
7
8
9
From 11 ratings. The highest and lowest were dropped; the organizer’s counted double. The game’s average was 6.6.
What it did to your points
Thursday Football
The result
Won 5–3 against the stronger side on paper
+12
How you played
7.4 against your usual 6.8
+6
1,201 to 1,219
Performance counts for 30% in this group
+18
Your tier
#6 of 13, up from #7
Safi
Kanaad
Hamour
Shark
Still Kanaad. 82 points to Hamour.
Man of the match: Ali M
6 of 11 votes, rated 8.6
A group game. It moved your tier points here and nothing else: not your Temba Level, not any Rank.
```

### Screen 4d

The organizer’s summary: ratings in, points moved, who changed tier

```text
Ratings are in
Football Thursday Football Final
Black
5–3
White
12 of 14 rated. Window closed Fri 8:30 PM
Black
rating, points
AM Ali M Man of the match 8.6 +24
MS Mahmood S 11 ratings 8.1 +19
YK Yousif K 11 ratings 7.6 +15
HH You 11 ratings 7.4 +18
HA Hussain A 11 ratings 7.0 +9
NS Noor S Up to Kanaad 6.2 +12
BF Bo Fareed 11 ratings 5.8 +7
White
rating, points
JH Jassim H 11 ratings 7.8 −2
SR Salman R Down to Safi 6.9 −8
5 more
One rater counted for less
Their ratings were far from everyone else’s for the third game running. Names stay private, even from you.
Something look wrong?
Adjust a player from Members, Manage
Members
```

## 05. The other two ladders. A verified game and what moved OVR, then Official rank for football teams and padel players.

### Screen 5a

A verified football game: one tag says it counts, then what moved your ovr

```text
Galali, Fri 13 Nov
Football Public game Final
Black
5–3
White
Fri 13 Nov, Galali Soccer Complex. You played in Black
Counts for Temba Level
What moved your OVR
74 to 75
Result 40% +0.6
Won, against a side averaging 76
Player ratings 30% +0.3
7.8 from 12 teammates and opponents
Goals 20% −0.1
1 scored, 3 conceded while you played. Conceded weighs more at the back
Man of the match 10% 0
Not this time. Other marks don’t move OVR
74.2 to 75.0 +0.8
Keeping ratings honest: no rating yourself, highest and lowest dropped, hidden until the 24-hour window closes, verified games only. Disputes go to Temba admins.
```

### Screen 5b

Official rank, football: teams in divisions, up and down each season

```text
Official rank
Football, season 3
Division 1 Division 2 Division 3
#3
Gooz FC
14 points. Safe by 7, 2 behind the top
Table
win 3, draw 1
# Team W–D–L Pts
1 Hidd United 5–1–1 16
2 Riffa Rovers 5–0–2 15
3 Gooz FC 4–2–1 14
4 Muharraq XI 3–2–2 11
5 Seef Athletic 3–1–3 10
6 Budaiya FC 2–1–4 7
7 Arad Town 1–1–5 4
8 Saar Wanderers 0–2–5 2
Bottom two go down. The top two of Division 2 come up.
Results only. Nobody can edit a rank. Official tournaments stay open to every division; your division sets your seeding.
```

### Screen 5c

Official rank, padel: your place, then your ranked games history

```text
Official rank
Padel, season 3
#12
430 points
15 behind #11. Tied with Khalid, your partner
Around you
of 186 ranked
#10 OM Omar M Ace Padel 470
#11 DA Dana Al-Khalifa World Padel Academy 445
#12 HH You Ace Padel 430
#13 KJ Khalid Janahi Ace Padel 430
#14 AB Ahmed Buhazza Padel Corner 395
Full ranking
Ranked games history
season 3
Final, Ace Autumn Cup
6-4 6-3 against Omar M and Sara M, with Khalid J
+30
Fri 6 Nov
Semi-final, Ace Autumn Cup
7-5 6-2 against Dana A and Yousif K
+25
Fri 6 Nov
Final, Temba Open
4-6 6-7 against Ahmed B and Faisal J
+0
Sat 24 Oct
Semi-final, Temba Open
6-3 6-4 against Omar T and Majed J
+25
Sat 24 Oct
All 17 ranked games
Only tournament games are ranked. Points are earned as a pair, credited to each player, and start again next season.
```
