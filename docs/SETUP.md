# Firebase setup

The React/Vite client uses Firebase Authentication. The existing configuration module exports Authentication and Firestore instances, but the dashboards and forms remain demo-only and do not read or write Firestore.

## Firebase Authentication Console setup

1. Use the existing Firebase project `fitzone-b67b2`; do not create a replacement project, link a billing account, or upgrade the plan.
2. In **Project settings → General → Your apps**, confirm that the existing Web App is registered and that its configuration matches the ignored local `.env.local`. Do not put the real values in `.env.example`.
3. In **Authentication → Sign-in method → Email/Password**, confirm **Email/Password** is enabled. An invalid-credentials sign-in response was observed during the local check, rather than a provider-disabled response; Firebase Console was not directly inspected, so confirm the provider setting here. No other sign-in provider is required or enabled by this phase.
4. In **Authentication → Settings → Authorized domains**, confirm the local development host (normally `localhost`) and add any production host only when needed. Do not add untrusted domains.
5. Keep Firebase project configuration in local environment files only. Do not link billing or enable paid services for this phase.

## Local client configuration

From the `client` directory, copy `.env.example` to `.env.local` and replace the placeholders with the matching values from the Firebase Console:

```powershell
Copy-Item .env.example .env.local
```

Required Vite variables:

| Variable | Firebase Web App value |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_APP_ID` | `appId` |

The root `.gitignore` excludes `.env` and `.env.*` files while allowing the placeholder-only `.env.example`. Do not commit `.env.local`.

Firebase Web App configuration is client-side configuration, not a substitute for security. Do not put service-account credentials, private keys, or other server secrets in Vite environment variables. Vite values are included in client-side builds. Protect future Firestore access with reviewed Authentication and Firestore Security Rules.

## SDK module

`client/src/firebase/config.js` exports:

- `auth` — Firebase Authentication instance.
- `db` — Cloud Firestore instance.

It validates the required configuration names and reports missing variables without printing their values. The module reuses an existing default Firebase app or initializes one when necessary. It does not import or initialize Firebase Storage.

Firebase Authentication email/password account creation, display-name updates, sign-in, session restoration, and sign-out are implemented through the existing Firebase app and Auth instance. Member and admin routes require an authenticated Firebase user. The admin request-review workflow additionally requires the trusted `role: "admin"` custom claim in the verified token and Firestore Rules; other admin dashboard sections remain local demos.

## Cloud Firestore database and rules

The current schema is in [`FIRESTORE_SCHEMA.md`](./FIRESTORE_SCHEMA.md), and the rules file is [`../client/firestore.rules`](../client/firestore.rules). Neither file creates collections or records. No Firebase Console resources are changed by this repository setup.

### Create the database in Firebase Console

1. Open the existing Firebase project **fitzone-b67b2**.
2. Go to **Build → Firestore Database** and select **Create database**.
3. Choose **Production mode** (do not use open/test-mode rules) and select a region appropriate for the gym and its users. Firestore's database location cannot be changed after creation; confirm the region before continuing.
4. Keep the project on the no-cost **Spark** plan. Do not link a billing account or upgrade the project.
5. After the database is created, open its **Rules** tab, replace the editor contents with the complete contents of `client/firestore.rules`, review the project and rules, and select **Publish**. Never publish rules that grant unrestricted signed-in access.

Creating the schema document does not create any collections, documents, accounts, or records. Firestore collections appear only after documents are written. This phase has not created a database or altered any existing project resource.

### Optional Firebase CLI deployment

The client includes a Firebase CLI emulator configuration in `client/firebase.json` for local rules testing. It uses a dedicated demo project ID and does not target the live Firebase project. If you separately choose to use the Firebase CLI for deployment, make sure your deployment config points to the rules file:

```json
{
  "firestore": {
    "rules": "client/firestore.rules"
  }
}
```

From the project root, authenticate with an authorized Firebase Console user and deploy only the rules to the explicitly named existing project:

```powershell
firebase login
firebase deploy --only firestore:rules --project fitzone-b67b2
```

Review the target project and deployment diff before confirming. The CLI project must have a Firestore database. This repository does not include `firebase.json`, a Firebase CLI dependency, or emulator tests; Console deployment is available without adding those tools/configuration.

### Authorization and rule testing

The rules use an Auth token custom claim `role: "admin"`; they do not trust the Firestore profile's `role` field. A trusted operator must provision any admin claim with the Admin SDK outside browser code. The local procedure is documented in [`ADMIN_CLAIM_PROVISIONING.md`](./ADMIN_CLAIM_PROVISIONING.md); no live claim was provisioned as part of this implementation. Emulator claims do not establish that an administrator has been provisioned in the live Firebase project.

Run the local rules tests from `client`:

```powershell
npm run test:rules
```

This starts the Firestore Emulator, loads `client/firestore.rules`, and runs `client/test/firestore.rules.test.js` and `client/test/firestore.services.test.js` using the dedicated `demo-fitzone-rules` project ID. The test environment does not connect to the real Firebase project. The rules passed local emulator tests; this does not mean they have been deployed or validated against the live project. Before production use, also verify:

- Unauthenticated reads/writes are denied for private records and all writes to restricted collections.
- A member can create only their own initial profile with `role: "member"` and `accountStatus: "pending"`, read it, and update only permitted profile fields.
- Attempts to change a profile UID, email, role, account status, or another user's profile are denied to members.
- Members cannot read another member's memberships, bookings, attendance, or payments; queries without a constraint to the caller's UID are denied.
- Public reads succeed only for active plans/trainers; inactive records remain admin-only.
- A token without the trusted `role: "admin"` claim cannot manage plans, trainers, bookings, enquiries, or membership requests, even if its profile document says `role: "admin"`.
- A token with a trusted admin claim can list and review pending requests. Approval and a matching active membership creation must be one atomic operation; rejection creates no membership.
- Members can request only active plans for their own UID, cannot approve/reject requests, and cannot create or alter membership records. Only one request per member-plan pair is allowed.
- Approval keeps `paymentStatus` as `unpaid`; neither members nor admin request approval can mark a payment complete.
- Direct client writes to attendance, payments, and enquiries remain denied; a client cannot forge a successful payment.
- Unknown collection paths are denied, and member plan/trainer list queries require `active == true`.

Membership-plan reads, member membership/request reads, member request creation, and admin request review are connected to Firestore. Other admin dashboard areas, Firebase Storage, and payment processing remain unimplemented/demo-only. Rules deployment and live administrator claim provisioning are manual steps; no Firebase resource was deployed or changed by this implementation.
