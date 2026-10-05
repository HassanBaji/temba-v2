# One App, not two

**Status:** superseded by [ADR-0021](./0021-three-apps-web-api-mobile.md).

EWA Connect’s Workspace has two Apps because it has two products (internal and public). Temba’s Route `/public` is a stub that redirects to login, not a second product. This conversion adds one App (`temba`) and does not invent a public App. A second App is a later product decision, not a Turborepo requirement.
