# One App, not two

EWA Connect’s Workspace has two Apps because it has two products (internal and public). Temba’s Route `/public` is a stub that redirects to login, not a second product. This conversion adds one App (`temba`) and does not invent a public App. A second App is a later product decision, not a Turborepo requirement.
