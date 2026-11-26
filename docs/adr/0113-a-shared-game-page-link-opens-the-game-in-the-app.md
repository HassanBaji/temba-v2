# A shared Game page link opens the Game in the App

**Status:** accepted. Brings the Game page forward from the Phase 7 universal links (TEM-344); ADR-0092 left every shared link opening the web App.

A played Game's result share (`games.resultLink`) and the hero share of a Game the viewer cannot mint an Invite link for both send the web Game page, `{WEB_ORIGIN}/dashboard/games/{id}`. On an iPhone with the App installed it opened Safari, and the player signed in on the web to see a Game the App already shows.

## Decision

- **The Game page is a universal link.** The web App serves `/.well-known/apple-app-site-association` (rewritten to the `/apple-app-site-association` route, which Apple also reads) from `APPLE_APP_ID` (Team ID and bundle identifier) and claims only `/dashboard/games/{id}`: the create pages and the Game's subpages (`board`, `teams`, `rate`, `share`) stay on the web. Without `APPLE_APP_ID` the file is a 404 and nothing changes.
- **The App claims the web App's host** through `ios.associatedDomains`, built in `app.config.ts` from `EXPO_PUBLIC_WEB_ORIGIN`. A build without an https origin claims nothing.
- **The link is the same URL.** No procedure changes and no new link: without the App the link opens the web page as before, so a shared message keeps working for anyone.
- **The App maps the web path to its own route** in `app/+native-intent.tsx` (`appLinkPath`): `/dashboard/games/{id}` opens `/games/{id}`. Any other path is handed on unchanged.
- **A signed-out open goes through sign-in and resumes.** The link is held until the signed-in layout first settles: signed out, it becomes the post-auth target; signed in, it is dropped. A new account still lands on the Profile checklist first.

**Considered options**: a custom-scheme link (`temba://games/{id}`), which messaging apps do not make tappable and which fails without the App; a web page that tries the scheme and falls back (a visible bounce, and iOS asks first); waiting for the whole Phase 7 deep-link spec (the result share is the link players send most).

## Consequences

- Invite links (`/g/{code}`, `/gr/{code}`, `/invites/*/link/{token}`) still open the web App; TEM-344 adds them to the same file and mapper.
- Android App Links are not set up (iOS ships first).
- Universal links need a development or store build with the entitlement; Expo Go cannot test them.
