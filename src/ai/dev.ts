import { config } from 'dotenv';
config();

// This script should be run manually via `npm run set-admin`
// It is NOT part of the Genkit flow server.
import { setAdminClaim } from '@/ai/actions/set-admin-claim';

async function runAdminActions() {
    // This is a one-off script to set the admin claim for the initial admin user.
    // In a real application, you would have a more robust system for managing roles.
    const result = await setAdminClaim('admin@masci.com');
    console.log('Set Admin Claim Result:', result);
}

// Run the actions.
runAdminActions().catch(console.error);
