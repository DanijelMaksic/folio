import { z } from 'zod';

const RESERVED_USERNAMES = [
   'admin',
   'me',
   'settings',
   'profile',
   'edit',
   'explore',
   'feed',
   'login',
   'logout',
   'signup',
   'verify',
   'api',
   'static',
   'help',
   'about',
   'terms',
   'privacy',
   'support',
];

// 'as const' is a const assertion that forces the compiler to infer the narrowest, most specific literal type possible for an expression rather than widening it to a general type like string or number
export const CONTRIBUTOR_ROLES = ['contributor', 'editor', 'admin'] as const;

export const EDITOR_ROLES = ['editor', 'admin'] as const;

export const GLOBAL_ROLES = [
   'viewer',
   'contributor',
   'editor',
   'admin',
] as const;
// Without 'as const', TypeScript infers ['editor', 'admin'] as string[], which would be unusable in .includes()

export function isContributor(role: string | null | undefined): boolean {
   return CONTRIBUTOR_ROLES.includes(
      role as (typeof CONTRIBUTOR_ROLES)[number],
   );
}

export function isEditor(role: string | null | undefined): boolean {
   if (!role) return false;
   return EDITOR_ROLES.includes(role as (typeof EDITOR_ROLES)[number]);
}

export type GlobalRole = (typeof GLOBAL_ROLES)[number];

export const usernameSchema = z
   .string()
   .min(3, { message: 'Username must be at least 3 characters' })
   .max(3, { message: 'Username cannot be longer than 32 characters' })
   .regex(
      /^[a-z0-9_]+$/,
      'Username can only contain lowercase letters, numbers, and underscores',
   )
   .refine(
      (val) => !RESERVED_USERNAMES.includes(val),
      'This username is reserved',
   );

export const registerSchema = z.object({
   username: usernameSchema,
   email: z.email('Must be a valid email address'),
   password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const loginSchema = z.object({
   username: usernameSchema,
   email: z.email('Must be a valid email address'),
   password: z.string().min(1, 'Password is required'),
});

export const verifyOtpSchema = z.object({
   code: z.string().length(6, 'OTP must be 6 digits'),
});

export const userSchema = z.object({
   id: z.string(),
   username: z.string(),
   email: z.email(),
   globalRole: z.enum(GLOBAL_ROLES),
   twoFactorEnabled: z.boolean(),
   createdAt: z.date(),
   updatedAt: z.date(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type User = z.infer<typeof userSchema>;
