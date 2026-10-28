## Things to add

- Show avatar/name across the app
- Statistics tab, shared between `DocumentDetails.tsx` and `CollectionDetails.tsx`
- Enchance `AboutTab.tsx` with additional data: uploader, upload date, page count, collection info, status
- Categories/tags
- Notes & Questions section
- User page: user info, documents and collections, search bar
- "Fully transcribed" label in `DocumentCard.tsx`, and maybe in `DocumentDetails.tsx` add "All pages as fully transcribed"
- In `DocumentCard.tsx` add completion %, but only if it's above 0%
- In `TranscriptionPanel.tsx`, if panel is larger than screen height, set `sticky` on page image while scrolling, until the end of panel is reached

## Things to fix

- Upon approving/rejecting a transcription as editor, review queue page loses horiontal margin
- In forms, fix how errors are displayed (currently, errors are like this: `[ { "origin": "string", "code": "too_big", "maximum": 1000, "inclusive": true, "path": [ "description" ], "message": "Description cannot be longer than 1000 characters" } ]`)
- If too many images are selected, modal window becomes so large that the upload button can't be seen
- On textarea elements, limit height after certian treshhold, to avoid infinite vertical height growth when inputing loads of text
- On textarea elements, on zod errors for max chars, when char > 900 add counter to the error message
- On textarea elements, if user spams one character, it breaks the element
- In dashboard, update "needs your attention" block to include better view of rejected transcription reason

## Things to refactor

- Remove `description` from `PageDetails.tsx`
- In `TranscriptionPanel.tsx`, switch textarea with rich text editor
