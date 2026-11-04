## Things to add

- User page: user info, documents and collections, search bar
- Show avatar/name across the app
- "Fully transcribed" label in `DocumentCard.tsx`, and maybe in `DocumentPages.tsx` add "All pages as fully transcribed"
- In `DocumentCard.tsx` add completion %, but only if it's above 0%
- Categories/tags
- Role downgrade

## Things to fix

- Upon approving/rejecting a transcription as editor, review queue page loses horiontal margin
- If too many images are selected, modal window becomes so large that the upload button can't be seen
- On textarea elements, limit height after certian threshold, to avoid infinite vertical height growth when inputing loads of text
- On textarea elements, on zod errors for max chars, when char > 900 add counter to the error message
- On textarea elements, if user spams one character, it breaks the element
- On document upload, grey out whole upload form when `isPending` is true
- On `PageDetails.tsx`, if page pagination is user, doc viewer saved zoom breaks
- When editor signs in, they are taken to `/` instead to `/dashboard`

## Things to refactor

- In `TranscriptionPanel.tsx`, switch textarea with rich text editor (and add character limit)
