## Things to add

- Add searching by description, not just title
- Status: indexed fromThePage
- Add number of pages on document card
- Show avatar/name across the app

## Things to fix

- When transcribing, if user hits submit before save, revisions tab shows nothing and transcription is not submitted
- When transcribing, if user types something, then hits save, then types some more, then hits submit, revision history will not show newest version and earlier version is submitted for review
- Remove filtering from history stack
- On login, navigate users with viewer role to /documents instead of /dashboard
- Change "Become a ${role}" to be more adaptive (to include "an")

## Things to refactor

- Switch to ctx.user.id in trpc procedures
- Switch from doc to document (in routers escpecially)
- Choose between SQL-like db.select() and ORM-like db.query()
- Replace id (from URL params) with documentId
- Change export default on all components to be under the component
- Change Sign In and Sign up instead of Log in and Register
- Account or profile?
