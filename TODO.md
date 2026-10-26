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
- In `AboutTab.tsx`, for the owner or an editor, show "No description yet. Add one" with a link to the edit form, because that nudges them to fill it in

## Things to fix

- Upon approving/rejecting a transcription as editor, review queue page loses horiontal margin
- In forms, fix how errors are displayed (currently, errors are like this: `[ { "origin": "string", "code": "too_big", "maximum": 1000, "inclusive": true, "path": [ "description" ], "message": "Description cannot be longer than 1000 characters" } ]`)
- If too many images are selected, modal window becomes so large that the upload button can't be seen

## Things to refactor

- Remove `description` from `PageDetails.tsx`
- In `TranscriptionPanel.tsx`, switch textarea with rich text editor
