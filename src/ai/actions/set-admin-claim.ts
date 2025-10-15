'use server';
import { getAuth } from 'firebase-admin/auth';
import { adminApp } from '@/firebase/admin';

// This is an administrative action and should not be exposed directly to clients.
// It's intended to be run from a secure environment (e.g., a CLI or trusted server).
export async function setAdminClaim(email: string): Promise<{ success: boolean; message: string }> {
  try {
    const auth = getAuth(adminApp);
    const user = await auth.getUserByEmail(email);
    
    // Set custom user claims on this user.
    await auth.setCustomUserClaims(user.uid, { role: 'admin' });

    console.log(`Successfully set admin claim for ${email}`);
    return { success: true, message: `Admin claim set for ${email}.` };
  } catch (error: any) {
    console.error(`Error setting admin claim for ${email}:`, error);
    return { success: false, message: error.message };
  }
}
