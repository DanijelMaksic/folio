## Things to add

- Add searching by description, not just title
- Status: indexed fromThePage
- Add number of pages on document card
- Show avatar/name across the app
- Still-open Sprint 7 work: the unwritten tests (user-stats, admin additions, deleteUserContent, profile.removeAvatar, and the e2e gaps), plus the deferred items like server-side password strength, stale session after role approval, and the express.json limit.

## Things to fix

- When transcribing, if user hits submit before save, revisions tab shows nothing and transcription is not submitted
- When transcribing, if user types something, then hits save, then types some more, then hits submit, revision history will not show newest version and earlier version is submitted for review
- Remove filtering from history stack
- On login, navigate users with viewer role to /documents instead of /dashboard
- Change "Become a ${role}" to be more adaptive (to include "an")
- Clean up the dashboard’s redundant canContribute code. `dashboard.getOverview` runs everything in one Promise.all and returns nulls or empty lists for viewers rather than FORBIDDEN. The client gates on isContributor, and there’s leftover redundancy (canContribute && wrappers and the canContribute prop on RecentDocuments) that can be cleaned up.

## Things to refactor

- Switch to ctx.user.id in trpc procedures
- Switch from doc to document (in routers escpecially)
- Choose between SQL-like db.select() and ORM-like db.query()
- Replace id (from URL params) with documentId
- Change export default on all components to be under the component
- Change Sign In and Sign up instead of Log in and Register
- Account or profile?
