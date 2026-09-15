// import { db } from '@/db/index.js';
// import { TRPCError } from '@trpc/server';
// import { eq } from 'drizzle-orm';

// export async function getProfileByUserId(userId: string) {
//    const userProfile = await db.query.profile.findFirst({
//       where: eq(profile.userId, userId),
//    });

//    if (!userProfile) {
//       throw new TRPCError({
//          code: 'NOT_FOUND',
//          message: 'Profile not found',
//       });
//    }

//    return userProfile;
// }
