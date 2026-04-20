// Run with: node scripts/generate-vapid.mjs
import webPush from 'web-push';

const keys = webPush.generateVAPIDKeys();
console.log('\nAdd these to your .env.local:\n');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:you@example.com\n`);
