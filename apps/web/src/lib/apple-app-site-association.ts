/**
 * The Apple App Site Association file: which web paths iOS opens in the
 * mobile App instead of the browser. Only the Game page is claimed, the link
 * a played Game's result share sends. The first matching component wins, so
 * the Game's subpages and the create pages are excluded before the page.
 */
export function appleAppSiteAssociation(appId: string) {
  return {
    applinks: {
      details: [
        {
          appIDs: [appId],
          components: [
            { "/": "/dashboard/games/new", exclude: true },
            { "/": "/dashboard/games/new-tournament", exclude: true },
            { "/": "/dashboard/games/*/?*", exclude: true },
            { "/": "/dashboard/games/*" },
          ],
        },
      ],
    },
  };
}
