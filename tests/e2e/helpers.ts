// import { db } from '../../server/src/db/index.js';
// import { user } from '../../server/src/db/schema.js';
// import { eq } from 'drizzle-orm';

// export const API = 'http://localhost:3000';

// export const headers = {
//    'Content-Type': 'application/json',
//    Origin: 'http://localhost:5173',
// };

// export async function seedUser(
//    payload: {
//       email: string;
//       password: string;
//       username: string;
//       name: string;
//    },
//    role: 'viewer' | 'contributor' | 'editor' | 'admin',
// ) {
//    await fetch(`${API}/api/auth/sign-up/email`, {
//       method: 'POST',
//       headers,
//       body: JSON.stringify(payload),
//    });

//    await db
//       .update(user)
//       .set({ emailVerified: true, globalRole: role, twoFactorEnabled: false })
//       .where(eq(user.email, payload.email));
// }

// export async function cleanupUser(email: string) {
//    await db.delete(user).where(eq(user.email, email));
// }
