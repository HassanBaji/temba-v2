# Home's Up next is a lifted card and Home shows only your sports

**Status:** accepted. Narrows the "ink marks the one upcoming focus" rule for the mobile Home.

The mobile Home led with an ink card for the next Game: a black card on a white page in light, and a
lifted #141414 card in dark. Home v2 rebuilds the screen around a clearer Up next card that says
when, where, who is playing and what to do next. On a white page the black card dominated everything
under it, and the two schemes drew the same card differently.

## Decision

- **Up next is a lifted surface in both schemes.** Two Color roles join `@repo/design-tokens`:
  `lifted` (#f4f4f4 light, #141414 dark) for the card, and `liftedControl` (#ffffff light, #262626
  dark) for the quiet controls on it. The card's one main button is plain `ink` on `paper`, the only
  solid thing on it. Home no longer uses `Surface tone="ink"`. Other screens keep the ink rule.
- **One card, four bands.** When (the date said once, the countdown top right), where, who (padel as
  two sides with open seats hatched; football as the pool bar and a count by position, then Black and
  White once teams are made), and one step sentence with Details and a single main button.
- **Home shows only the User's sports.** A User whose profile has one sport sees that sport only, with
  no sport switch. With two sports the switch shows each sport and its band, and opens on the sport of
  the next game. A User who has picked no sport yet sees both.
- **Additive API fields.** `users.home` standing rows carry `countedGames`, carousel Games carry
  `viewerIsOrganizer`, football rows carry `positions`, and `users.myProfile` carries `football`
  (goals, clean sheets, unbeaten run) for football. No procedure path changes.

**Considered Options**: keeping the ink card and only restyling its contents (the design's main point
is that the card follows the theme); a new `SurfaceTone` (it is shared with the web App and would
ripple through its exhaustive switches for one mobile card).
