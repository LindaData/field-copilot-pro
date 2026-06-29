# iOS TestFlight Start

## Goal

Ship an early iPhone build of Field Copilot Pro while keeping the website and app on one shared React/Vite codebase.

This first iOS build is a demo/local-state app. It is not production multi-user software yet.

## Current Shape

- Website and iOS app share `src/`.
- GitHub Pages can be installed to an iPhone home screen as a PWA-style shell.
- Capacitor wraps the built Vite output from `dist/`.
- The iOS bundle id is `com.lindadata.fieldcopilotpro`.
- App name is `Field Copilot Pro`.
- The app still uses seeded demo data plus browser/WebView storage.
- Production auth, backend persistence, file storage, and offline sync are future work.

## Windows Laptop Workflow

From this repository:

```bash
npm ci
npm run build:ios
npm run sync:ios
```

What those commands do:

- `build:ios` builds the app with `/` as the base path so it works inside the native WebView.
- `sync:ios` copies the latest web bundle into `ios/App/App/public` and refreshes Capacitor plugin metadata.

The normal website build still works through:

```bash
npm run build
```

GitHub Pages continues to use `VITE_BASE_PATH=/field-copilot-pro/` from the Pages workflow.

## iPhone Web Install

After `main` deploys to GitHub Pages:

1. Open `https://lindadata.github.io/field-copilot-pro/phone-test.html` in Safari on iPhone.
2. Tap **Launch technician test**.
3. Tap Share.
4. Tap **Add to Home Screen**.
5. Launch **Field Copilot** from the home screen.

This is the fastest downloadable iPhone test path from Windows. It is not the same as TestFlight, but it exercises the same shared app screens.

## Mac/Xcode Workflow

On a Mac with Xcode:

```bash
npm ci
npm run sync:ios
npm run open:ios
```

Then in Xcode:

1. Open `ios/App/App.xcodeproj`.
2. Select the `App` target.
3. Set the Apple Developer Team.
4. Confirm bundle id `com.lindadata.fieldcopilotpro`.
5. Confirm signing works on a physical iPhone first.
6. Archive the app.
7. Upload the archive to App Store Connect.
8. Add it to TestFlight.

## Smoke-Test Routes

Test these before inviting external testers:

- `/`
- `/app/today`
- `/app/jobs`
- `/app/jobs/j-1`
- `/app/jobs/j-1/diagnose`
- `/app/jobs/j-1/approval`
- `/app/jobs/j-1/report`
- `/app/scan`
- `/app/more`
- `/app/owner`

## iOS-Specific Checks

- Location permission appears with HVAC-specific copy.
- Denying location still leaves manual arrival usable.
- Share/copy actions do not break inside the native WebView.
- Reset and replay return to the app home route without opening a browser.
- Bottom navigation clears the iPhone home indicator.
- Long diagnostic and report screens scroll correctly.
- Demo sync status is understood as non-production until backend sync exists.

## Backend Decision

Do not treat this TestFlight build as the production architecture. Before real field pilots, pick and implement one backend path:

- AWS-first, matching `docs/AWS_ARCHITECTURE.md` and `docs/ROADMAP.md`.
- Or Supabase-first, replacing the current placeholder types and client assumptions.

Minimum production backend before real customer data:

- Real authentication.
- Role and company tenancy enforcement.
- Job read/update API.
- Diagnostic save API.
- Approval/signature save API.
- File upload/download storage.
- Audit events.
- Offline queue and conflict rules for technician updates.

## Known Limits

- Demo auth accepts any non-empty credentials.
- Operational state is still stored locally.
- Scan/photo/camera flows remain prototype-level.
- Voice input may simulate capture depending on iOS WebView support.
- Report printing is still browser-oriented.
- No push notifications.
- No production data should be entered.
