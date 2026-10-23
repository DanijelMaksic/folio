## Things to add

- Show avatar/name across the app
- Statistics tab, shared between `DocumentDetails.tsx` and `CollectionDetails.tsx`
- About tab
- Categories/tags
- Notes & Questions section
- In `PageDetails.tsx` add page navigation (prev and next btns)
- In `PageDetails.tsx` add breadcrumb: collection (optional) -> doc -> page
- User page: user info, documents and collections, search bar
- "Fully transcribed" label in `DocumentCard.tsx`, and maybe in `DocumentDetails.tsx` add "All pages as fully transcribed"
- In `DocumentCard.tsx` add completion %, but only if it's above 0%
- In `TranscriptionPanel.tsx`, if panel is larger than screen height, set `sticky` on page image while scrolling, until the end of panel is reached

## Things to fix

- Upon approving/rejecting a transcription as editor, review queue page loses horiontal margin

## Things to refactor

- Remove `description` from `PageDetails.tsx`
- In `TranscriptionPanel.tsx`, switch textarea with rich text editor
