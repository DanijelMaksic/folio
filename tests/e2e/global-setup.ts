import dotenv from 'dotenv';
import path from 'path';

if (!process.env.CI) {
   dotenv.config({ path: path.resolve('../server/.env') });
}

import { user } from '../../server/src/db/schema/index.js';
import { db } from '../../server/src/db/index.js';
import { eq } from 'drizzle-orm';
import cloudinary from '../../server/src/lib/cloudinary.js';

const API = 'http://localhost:3000';

const headers = {
   'Content-Type': 'application/json',
   Origin: 'http://localhost:5173',
};

export type Role = 'viewer' | 'contributor' | 'editor' | 'admin';

export interface UserPayload {
   email: string;
   password: string;
   username: string;
   name: string;
}

export async function seedUser(payload: UserPayload, role: Role) {
   await fetch(`${API}/api/auth/sign-up/email`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
   });

   await db
      .update(user)
      .set({ emailVerified: true, globalRole: role, twoFactorEnabled: false })
      .where(eq(user.email, payload.email));
}

export async function cleanupUser(email: string) {
   await db.delete(user).where(eq(user.email, email));
}

export default async function globalSetup() {}

export async function cleanupCloudinaryFolder(folder: string) {
   cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
   });

   const { resources } = await cloudinary.api.resources({
      type: 'upload',
      prefix: folder,
      max_results: 500,
   });

   if (resources.length === 0) return;

   const publicIds = resources.map((r: { public_id: string }) => r.public_id);
   await cloudinary.api.delete_resources(publicIds);
}
