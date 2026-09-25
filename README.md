# Afrigo Admin

The operations console for Afrigo. One place to run the web app and the iOS and Android apps, with live statistics for all 55 African markets.

## Features

| Area | What you can do |
| --- | --- |
| Overview | Live KPIs, a real time map of Africa with activity pulses, 30 day trends, web and mobile split, work queues |
| Countries | Live statistics for every market: members, active now, trades, export and import value, listings, verification rate |
| Activity | Member activity across all apps, plus a full audit log of every change made in this console |
| Members | Search and filter every buyer, seller and exporter. Verify, suspend, reactivate, change role, sign out everywhere, export CSV |
| Verification | Review KYC documents (signed preview links), verify businesses, clear compliance checks |
| Marketplace | Moderate listings, buyer requests and bids: publish, hide, archive, close, decline |
| Trades | Every contract with parties, value and shipment. Flag, open a dispute, cancel |
| Shipments | Track milestones across corridors, override a milestone with a recorded reason |
| Disputes & support | Rule for buyer or seller, cancel, internal notes, close support cases |
| Finance | Escrow and settlement totals, payout approvals with a two person rule for risky payouts, refunds |
| App control | Per platform (web, iOS, Android): latest and minimum version, force update, maintenance mode, announcement banner, feature flags, version adoption |
| Push notifications | Target by role, country and platform, live audience estimate, send history |
| Inbox | Website contact form enquiries with reply and status tracking |
| Staff & access | Grant and revoke operational roles with an audit trail |

Light, dark and system themes. Fully responsive from 360px phones to wide desktops. `⌘K` opens quick navigation.

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

The console runs on http://localhost:3100.

Set `NEXT_PUBLIC_DEMO_MODE=true` in `.env.local` to explore the console with generated data and a simulated live feed. Nothing is written to Firebase in demo mode and no sign in is needed.

## Connecting to production

The console shares the `afrigo-62e9b` Firebase project with the web and mobile apps.

1. Fill in the `NEXT_PUBLIC_FIREBASE_*` client keys and the `FIREBASE_*` service account in `.env.local`.
2. Set `NEXT_PUBLIC_DEMO_MODE=false`.
3. `SUPER_ADMIN_EMAILS` lists the owner accounts that always have full access. Everyone else needs an `operationalRole` custom claim, granted from **Staff & access**.
4. `PAYSTACK_SECRET_KEY` enables refund execution.

All reads and writes go through server routes using the Firebase Admin SDK, so the existing Firestore rules stay locked down. Every route checks the caller's ID token and role capability, and every change is written to the `adminAudit` collection.

## Roles

| Role | Access |
| --- | --- |
| Support agent | Cases, members (read), inbox |
| Dispute officer | Cases, disputes, trade and shipment actions |
| Finance operator | Finance, payouts, refunds |
| Risk officer | Verification, compliance, member management, marketplace moderation |
| Administrator | Everything except finance execution and staff management |
| Super administrator | Everything |

## Live statistics

`/api/live` streams a fresh snapshot over Server Sent Events whenever the underlying Firestore data changes. One set of listeners is shared by every open console, and the browser reconnects automatically. Country attribution uses the member's `country` or their company's `country`, trade value is converted to USD in `src/lib/fx.ts`, and "active now" means activity in the last 15 minutes.

## Contract with the web and mobile apps

For the most accurate web versus mobile statistics, the apps should write:

| Where | Field | Values |
| --- | --- | --- |
| `users/{uid}` | `platform` | `web`, `ios` or `android` (last used) |
| `users/{uid}` | `appVersion` | installed version, for example `2.5.2` |
| `users/{uid}` | `lastActiveAt` | server timestamp on each session |
| `activityLogs/{id}` | `platform`, `country` | the platform and member country |

Remote configuration lives in `appConfig/{web|ios|android}`:

```json
{
  "latestVersion": "2.5.2",
  "minSupportedVersion": "2.4.0",
  "forceUpdate": false,
  "maintenanceMode": false,
  "maintenanceMessage": "",
  "storeUrl": "https://play.google.com/store/apps/details?id=africa.afrigo",
  "banner": { "enabled": false, "text": "", "tone": "info", "link": "" },
  "flags": { "payments": false, "chat": true, "marketplace": true, "imageSearch": false, "liveTracking": true }
}
```

The apps need read access to it. Add this to `firestore.rules` in the web repository:

```
match /appConfig/{platform} { allow read: if true; }
```

Push notifications use the `notificationTokens` array already stored on each user by the web app. Mobile apps should add their FCM tokens to the same array.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server on port 3100 |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run typecheck` | TypeScript check |
