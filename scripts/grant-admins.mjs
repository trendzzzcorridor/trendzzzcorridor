// One-time trusted local admin-role assignment. NEVER run this in the browser.
// Requires: npm install firebase-admin
// Authenticate locally using keyless Application Default Credentials (ADC):
// gcloud auth application-default login --impersonate-service-account=SERVICE_ACCOUNT_EMAIL
// Never commit local ADC credentials or service-account keys.
// Usage: node scripts/grant-admins.mjs UID_ONE UID_TWO
import admin from 'firebase-admin';
const ids = process.argv.slice(2);
if (ids.length !== 2 || ids.some(id => !/^[A-Za-z0-9]{15,128}$/.test(id)) || ids[0] === ids[1]) {
  console.error('Pass exactly two distinct Firebase Authentication user UIDs.');
  process.exit(1);
}
admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: 'trendzzz-corridor' });
for (const uid of ids) {
  const user = await admin.auth().getUser(uid);
  if (user.disabled) throw new Error('Refusing to grant admin to disabled user ' + uid);
  console.log('Assigning admin to UID:', uid, 'email:', user.email || '(none)');
  // Preserve any existing claims rather than deleting them.
  await admin.auth().setCustomUserClaims(uid, { ...(user.customClaims || {}), admin: true });
}
console.log('Both admin claims set. Each account must sign in again to refresh its ID token.');
