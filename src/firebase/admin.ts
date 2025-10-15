import { initializeApp, getApp, getApps, App } from 'firebase-admin/app';
import { credential } from 'firebase-admin';

// IMPORTANT: Do not expose this to the client-side. This is for server-side use only.
const serviceAccountKey = process.env.FIREBASE_ADMIN_SDK_CONFIG;

let adminApp: App;

if (!getApps().some(app => app.name === 'admin')) {
  if (!serviceAccountKey) {
    throw new Error('FIREBASE_ADMIN_SDK_CONFIG environment variable is not set. Cannot initialize Firebase Admin SDK.');
  }

  adminApp = initializeApp({
    credential: credential.cert(JSON.parse(serviceAccountKey)),
  }, 'admin');
} else {
  adminApp = getApp('admin');
}

export { adminApp };
