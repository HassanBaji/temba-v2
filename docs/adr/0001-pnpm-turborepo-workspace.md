# Convert this git repo into a pnpm + Turborepo Workspace

Temba was a single Create T3 App at git Root. We are converting this same repository into a pnpm + Turborepo Workspace (thin Root, `apps/*` + `packages/*`) so shared code can live in Packages without a rewrite or a second repo. We keep Temba’s application stack (Next, tRPC, Clerk, Drizzle) and move the existing App rather than starting over.

**Considered Options**: stay a single-app repo; split into multiple git repos. Rejected: we want Workspace tooling now, and the product is still one App.
