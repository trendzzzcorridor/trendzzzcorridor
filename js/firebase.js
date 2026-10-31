// Trendzzz Corridor dedicated Firebase project (public web configuration).
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, updateProfile, signOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyDlNUIDvsZKy8JO6PTPB-G00OksyaJLUPY',
  authDomain: 'trendzzz-corridor.firebaseapp.com',
  projectId: 'trendzzz-corridor',
  storageBucket: 'trendzzz-corridor.firebasestorage.app',
  messagingSenderId: '903235701175',
  appId: '1:903235701175:web:cbda381e7c048864e7c032',
  measurementId: 'G-5HQ9PDL828'
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
export const currentUser = () => auth.currentUser;
export const waitForAuth = () => new Promise(resolve => {
  const unsubscribe = onAuthStateChanged(auth, user => { unsubscribe(); resolve(user); }, () => resolve(null));
});
export const googleLogin = () => signInWithPopup(auth, googleProvider);
export const emailLogin = (email, password) => signInWithEmailAndPassword(auth, email, password);
export async function emailRegister(name, email, password) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(result.user, { displayName: name });
  await sendEmailVerification(result.user);
  return result;
}
export const logout = () => signOut(auth);
export async function loadProfile(user) {
  if (!user) return null;
  const snapshot = await getDoc(doc(db, 'customers', user.uid));
  return snapshot.exists() ? snapshot.data() : null;
}
export async function saveProfile(user, name, phone) {
  if (!user) throw new Error('Please sign in.');
  const cleanName = String(name).trim(), cleanPhone = String(phone).trim();
  if (cleanName.length < 2 || cleanName.length > 80) throw new Error('Enter your full name.');
  if (!/^\+?[0-9][0-9\s()-]{7,19}$/.test(cleanPhone)) throw new Error('Enter a valid mobile number with country code if needed.');
  await setDoc(doc(db, 'customers', user.uid), {
    uid: user.uid, name: cleanName, email: user.email || '', phone: cleanPhone,
    phoneVerified: false, updatedAt: new Date().toISOString()
  }, { merge: true });
}
export function authMessage(error) {
  const code = error?.code || '';
  if (code === 'auth/popup-closed-by-user') return 'Google sign-in was cancelled.';
  if (code === 'auth/email-already-in-use') return 'This email already has an account. Please log in.';
  if (code === 'auth/weak-password') return 'Please use a stronger password.';
  if (code === 'auth/invalid-credential') return 'Email or password is incorrect.';
  if (code === 'permission-denied') return 'Database access is not enabled yet. Configure Firestore rules before saving your profile.';
  return error?.message || 'Something went wrong. Please try again.';
}
