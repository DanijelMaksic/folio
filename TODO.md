## Things to add

- Contributor being able to suggest a category
- Home page (general info, FAQ)

## Things to fix

- Notes are misaligned
- If too many images are selected, modal window becomes so large that the upload button can't be seen
- On textarea elements, limit height after certain threshold, to avoid infinite vertical height growth when inputing loads of text
- On textarea elements, if user spams one character, it breaks the element
- On document upload, grey out the whole upload form when `isPending` is true
- On `PageDetails.tsx`, if page pagination is used, doc viewer saved zoom breaks

- Normalize the username input: The simplest way is in the shared schema, so it can’t be forgotten: `username: z.string().trim().min(1).toLowerCase()`. Otherwise use `input.username.toLowerCase()` in the router.
- When a blank transcription is approved, and user suggests a correction, textarea is locked due to blank checkbox being pre-checked

- Fix tests
- Run `tsc`

## Things to refactor

- Make functions like `handleTabChange()` a separate component
- In `TranscriptionPanel.tsx` and `GuestTranscriptionPanel.tsx` refactor the duplicate components
- Parts of UI (save and submit buttons) are used twice (`TranscriptionPanel.tsx`)
