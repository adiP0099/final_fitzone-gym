# Local admin claim provisioning

This tool grants or revokes the Firebase Authentication custom claim
`role: "admin"` for one explicitly supplied UID in the existing project
`fitzone-b67b2`. It is a local, interactive administrative utility, not a web
feature or public endpoint. It does not change Firestore rules, deploy Firebase
resources, or create an admin account. Keep the project on the Spark plan; this
process does not use Cloud Functions or require billing.

## Requirements and credentials

- Use Node.js 22 or newer.
- An authorized project operator must install the Google Cloud CLI and use
  Application Default Credentials (ADC). Run:

  ```powershell
  gcloud auth application-default login
  ```

- The operator's Google identity must have the least IAM permissions necessary
  to look up Firebase Authentication users and set custom claims for
  `fitzone-b67b2` (for example, the Firebase Authentication Admin role, subject
  to the organization's IAM policy).
- The tool uses `applicationDefault()` and pins the Admin SDK app to project
  `fitzone-b67b2`. It does not read Vite variables or accept frontend-supplied
  identity/role data. If `GOOGLE_APPLICATION_CREDENTIALS` is used instead of
  gcloud ADC, its credential file must be outside this repository and outside
  `client/`. Never put privileged credentials in a `VITE_*` variable.
- Do not download or store a service-account key for this process unless an
  organization's approved credential policy requires it. Prefer ADC. The root
  `.gitignore` also excludes conventional Firebase service-account JSON names
  and a local credentials directory as defense in depth.

## Install and grant

From the project root, install the isolated tooling dependency:

```powershell
npm --prefix tools/admin-provisioning install
```

Find the intended user's exact Firebase Authentication UID in the Firebase
Console for `fitzone-b67b2`. Do not guess or select the first registered user.
Then, from the project root, run:

```powershell
node tools/admin-provisioning/scripts/manage-admin-claim.mjs --action grant --project fitzone-b67b2 --uid <AUTH_UID>
```

The script verifies that the UID exists, prompts for the exact project and UID
confirmation, and only then updates the custom claim. Type the displayed
confirmation exactly. It preserves all existing custom claims while setting
`role` to `admin`, verifies the resulting claim, and does not print a user
record, credentials, or tokens. It refuses non-interactive execution and any
credential-file path inside the project.

Only one operator should change custom claims for a given user at a time:
Firebase's `setCustomUserClaims` replaces the claim object, so concurrent
administrative changes can race. The script fetches the latest claims after
confirmation, then preserves them when setting the role.

## Verify and refresh

The existing Firestore rules authorize admin operations only when the verified
Firebase Auth ID token contains `role: "admin"`. A `users/{uid}` profile field
with `role: "admin"` is not sufficient. Existing emulator tests can validate
the rules with simulated claims, but cannot prove a live claim was provisioned.

After provisioning, the target user should sign out and sign in again, or
otherwise force-refresh their Firebase ID token, before testing authorized
Firestore operations. Verify the claim through an approved trusted
administrative process without printing the ID token. Other admin dashboard
sections remain demos; only the membership-request workflow is backed by
claim-protected Firestore operations.

## Revoke

From the project root, run:

```powershell
node tools/admin-provisioning/scripts/manage-admin-claim.mjs --action revoke --project fitzone-b67b2 --uid <AUTH_UID>
```

Confirm the exact revoke prompt. The script removes only the `role` claim,
preserves other custom claims, and verifies that `role` is absent. The user
must refresh their ID token or sign in again for revocation to take effect in
the client.

## Local validation

Run the script's unit tests from the project root:

```powershell
npm --prefix tools/admin-provisioning test
```

The Firestore Rules Emulator suite can be run separately from `client`:

```powershell
npm run test:rules
```

Neither test command contacts or modifies the live Firebase project. No live
custom claim should be granted as part of testing.
