## Things to add

- Contributor being able to suggest a category
- Home page (general info, FAQ)

## Things to fix

- If too many images are selected, modal window becomes so large that the upload button can't be seen
- Notes are misaligned

- Fix tests

- On textarea elements, limit height after certain threshold, to avoid infinite vertical height growth when inputing loads of text
- On textarea elements, if user spams one character, it breaks the element
- On document upload, grey out whole upload form when `isPending` is true
- On `PageDetails.tsx`, if page pagination is user, doc viewer saved zoom breaks

- When editor signs in, they are taken to `/` instead to `/dashboard`
- On sign up, navigate user to `/dashboard` instead of `/`

- Normalize the username input: The simplest way is in the shared schema, so it can’t be forgotten: `username: z.string().trim().min(1).toLowerCase()`. Otherwise use `input.username.toLowerCase()` in the router.
- In `TranscriptionPanel.tsx` and `GuestTranscriptionPanel.tsx` refactor the duplicate components
- When a blank transcription is approved, and user suggests a correction, textarea is locked due to blank checkbox being pre-checked

- Run `tsc`

## Things to refactor

- Make functions like `handleTabChange()` a separate component
- Parts of UI (save and submit buttons) are used twice (`TranscriptionPanel.tsx`)
