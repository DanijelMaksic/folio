## Things to add

- Add searching by description, not just title
- Status: indexed fromThePage
- Add number of pages on document card
- Show avatar/name across the app
- Still-open Sprint 7 work: the unwritten tests (user-stats, admin additions, deleteUserContent, profile.removeAvatar, and the e2e gaps), plus the deferred items like server-side password strength, stale session after role approval, and the express.json limit.
- On empty collection page, show `add docs to col` button
- On `/dashboard`, on view all (docs) navigate the user to filtered `/documents` where they can see only their own docs

## Things to fix

- When transcribing, if user types something, then hits save, then types some more, then hits submit, revision history will not show newest version and earlier version is submitted for review
- Remove filtering from history stack
- On sign in, navigate users with viewer role to /documents instead of /dashboard
- Change "Become a ${role}" to be more adaptive (to include "an")
- Clean up the dashboard’s redundant canContribute code. `dashboard.getOverview` runs everything in one Promise.all and returns nulls or empty lists for viewers rather than FORBIDDEN. The client gates on isContributor, and there’s leftover redundancy (canContribute && wrappers and the canContribute prop on RecentDocuments) that can be cleaned up.
- Slow initial data load on prod

## Things to refactor
