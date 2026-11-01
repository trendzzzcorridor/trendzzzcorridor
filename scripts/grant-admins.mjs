// One-time trusted local admin-role assignment. NEVER run this in the browser.
// Requires: npm install --no-save firebase-admin
// Authenticate locally using keyless Application Default Credentials (ADC):
// gcloud auth application-default login --impersonate-service-account=SERVICE_ACCOUNT_EMAIL
// Never commit local ADC credentials or service-account keys.
// Usage: node scripts/grant-admins.mjs UID_ONE UID_TWO
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const ids = process.argv.slice(2);
if (ids.length !== 2 || ids.some(id => !/^[A-Za-z0-9]{15,128}$/.test(id)) || ids[0] === ids[1]) {
  console.error('Pass exactly two distinct Firebase Authentication user UIDs.');
  process.exit(1);
}
const app = initializeApp({ credential: applicationDefault(), projectId: 'trendzzz-corridor' });
const auth = getAuth(app);
for (const uid of ids) {
  const user = await auth.getUser(uid);
  if (user.disabled) throw new Error('Refusing to grant admin to disabled user ' + uid);
  console.log('Assigning admin to UID:', uid, 'email:', user.email || '(none)');
  await auth.setCustomUserClaims(uid, { ...(user.customClaims || {}), admin: true });
}
console.log('Both admin claims set. Each account must sign in again to refresh its ID token.');
