## Things to add

- Sorting in `/role-requests`
- Role downgrade
- Audit table on role management route
- Overview and preview show line numbers on the left of panel
- "Fully transcribed" label in `DocumentCard.tsx`, and maybe in `DocumentPages.tsx` add "All pages as fully transcribed"

- Categories
- Home page (general info, FAQ)
- Save transcription with ctrl + s shortcut (add into about this in guidelines)
- In `DocumentCard.tsx` add completion %, but only if it's above 0%

## Things to fix

- If too many images are selected, modal window becomes so large that the upload button can't be seen
- On textarea elements, limit height after certain threshold, to avoid infinite vertical height growth when inputing loads of text
- On textarea elements, on zod errors for max chars, when char > 900 add counter to the error message
- On textarea elements, if user spams one character, it breaks the element
- On document upload, grey out whole upload form when `isPending` is true
- On `PageDetails.tsx`, if page pagination is user, doc viewer saved zoom breaks
- When editor signs in, they are taken to `/` instead to `/dashboard`
- On sign up, navigate user to `/dashboard` instead of `/`
- Normalize the username input: The simplest way is in the shared schema, so it can’t be forgotten: `username: z.string().trim().min(1).toLowerCase()`. Otherwise use `input.username.toLowerCase()` in the router. Also CONFIRM that BetterAuth’s displayUsername is not what you show in the UI, because the public page should display it if you use it. `globalRole` stays in `getPublicProfile`
- When navigating while the page is scrolled down, scroll position is saved on the new page
- Run `tsc`
- Fix tests
- Notes are misaligned
- Potentially fix list flashing a loading screen when paginating/filtering/sorting by using placeholderData in trpc procedure call
- Find a way to disable filter in `ListControls.tsx` when `{data?.length! < 2}`
- In `TranscriptionPanel.tsx` and `GuestTranscriptionPanel.tsx` refactor the duplicate components

## Things to refactor

- Make functions like `handleTabChange()` a separate component
- Refactor mapped role request item into separate component (from `RoleRequestsTab.tsx`)
