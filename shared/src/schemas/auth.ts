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
   .max(32, { message: 'Username cannot be longer than 32 characters' })
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
   email: z.string().email('Must be a valid email address'),
   password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be 128 characters or less')
      .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const loginSchema = z.object({
   username: usernameSchema,
   email: z.string().email('Must be a valid email address'),
   password: z.string().min(1, 'Password is required'),
});

export const verifyOtpSchema = z.object({
   code: z.string().length(6, 'OTP must be 6 digits'),
});

export const userSchema = z.object({
   id: z.string(),
   name: z.string(),
   username: z.string(),
   email: z.string().email(),
   emailVerified: z.boolean(),
   image: z.string().nullable(),
   globalRole: z.enum(GLOBAL_ROLES),
   twoFactorEnabled: z.boolean().nullable(),
   createdAt: z.string(),
   updatedAt: z.string(),
});

export const updateProfileSchema = z.object({
   name: z
      .string()
      .trim()
      .min(1, 'Name is required')
      .max(50, 'Name must be 50 characters or less'),
   username: z
      .string()
      .trim()
      .min(3, 'Username must be at least 3 characters')
      .max(30, 'Username must be 30 characters or less')
      .regex(
         /^[a-zA-Z0-9_.]+$/,
         'Only letters, numbers, underscores and periods',
      ),
});

export const passwordSchema = z
   .string()
   .min(8, 'Password must be at least 8 characters')
   .max(128, 'Password must be 128 characters or less')
   .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
   .regex(/[0-9]/, 'Password must contain at least one number');

export const changePasswordSchema = z
   .object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: passwordSchema,
      confirmPassword: z.string().min(1, 'Please confirm your new password'),
   })
   .refine((data) => data.newPassword === data.confirmPassword, {
      path: ['confirmPassword'],
      message: 'Passwords do not match',
   })
   .refine((data) => data.newPassword !== data.currentPassword, {
      path: ['newPassword'],
      message: 'New password must be different from the current one',
   });

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

export const uploadAvatarSchema = z.object({
   fileBase64: z
      .string()
      .startsWith('data:image/', 'File must be an image')
      // base64 inflates size by ~4/3
      .max(Math.ceil(AVATAR_MAX_BYTES * 1.37), 'Image must be 5MB or less'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type User = z.infer<typeof userSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
