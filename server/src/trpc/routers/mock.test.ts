// import {
//    mockTestPost,
//    mockCategory,
//    mockProfile,
//    mockImage,
//    mockUser,
//    mockPost,
// } from '@/tests/helpers/factories.js';
// import {
//    createAuthenticatedCaller,
//    createCaller,
// } from '@/tests/helpers/trpc-helper.js';
// import { describe, it, expect, vi, beforeEach } from 'vitest';
// import { db } from '@/db/index.js';

// vi.mock('@/db/index.js', () => ({
//    db: {
//       query: {
//          profile: {
//             findFirst: vi.fn(),
//          },
//          post: {
//             findMany: vi.fn(),
//          },
//       },
//       insert: vi.fn(() => ({
//          values: vi.fn(),
//       })),
//       transaction: vi.fn((fn) => fn(db)),
//    },
// }));

// vi.mock('@/lib/cloudinary.js', () => ({
//    cloudinary: {
//       utils: {
//          api_sign_request: vi.fn(() => 'mock-signature'),
//       },
//    },
//    generateUploadSignature: vi.fn(() => ({
//       signature: 'mock-signature',
//       timestamp: 123456789,
//       folder: 'artfolio/posts',
//       apiKey: 'mock-api-key',
//       cloudName: 'mock-cloud-name',
//    })),
// }));

// const mockProfileFindFirst = db.query.profile.findFirst as ReturnType<
//    typeof vi.fn
// >;
// const mockPostFindMany = db.query.post.findMany as ReturnType<typeof vi.fn>;
// const mockInsert = db.insert as ReturnType<typeof vi.fn>;

// const user = mockUser();
// const profile = mockProfile();

// beforeEach(() => {
//    vi.clearAllMocks();
// });

// // ── create ───────────────────────

// describe('post.create', () => {
//    it('creates a post and returns its id', async () => {
//       mockProfileFindFirst.mockResolvedValueOnce(profile);
//       mockInsert.mockReturnValue({
//          values: vi.fn().mockResolvedValue(undefined),
//       });

//       const caller = createAuthenticatedCaller(user);
//       const result = await caller.post.create(mockTestPost());

//       expect(result).toMatchObject({ id: expect.any(String) });
//    });

//    it('throws NOT_FOUND if profile does not exist', async () => {
//       mockProfileFindFirst.mockResolvedValueOnce(undefined);

//       const caller = createAuthenticatedCaller(user);
//       await expect(caller.post.create(mockTestPost())).rejects.toMatchObject({
//          code: 'NOT_FOUND',
//       });
//    });

//    it('throws UNAUTHORIZED if not signed in', async () => {
//       const caller = createCaller();
//       await expect(caller.post.create(mockTestPost())).rejects.toMatchObject({
//          code: 'UNAUTHORIZED',
//       });
//    });
// });

// // ── getByUsername ───────────────────────

// describe('post.getByUsername', () => {
//    it('returns posts for a valid username', async () => {
//       const post = mockPost();
//       mockProfileFindFirst.mockResolvedValueOnce(profile);
//       mockPostFindMany.mockResolvedValueOnce([
//          {
//             ...post,
//             images: [mockImage()],
//             category: mockCategory(),
//             postTags: [],
//          },
//       ]);

//       const caller = createCaller();
//       const result = await caller.post.getByUsername({ username: 'testuser' });

//       expect(result.items).toHaveLength(1);
//       expect(result.items[0]).toMatchObject({ id: post.id, title: post.title });
//    });

//    it('throws NOT_FOUND for unknown username', async () => {
//       mockProfileFindFirst.mockResolvedValueOnce(undefined);

//       const caller = createCaller();
//       await expect(
//          caller.post.getByUsername({ username: 'nobody' }),
//       ).rejects.toMatchObject({
//          code: 'NOT_FOUND',
//       });
//    });
// });

// // ── getPostImageUploadSignature ───────────────────────

// describe('post.getPostImageUploadSignature', () => {
//    it('returns signature fields', async () => {
//       const caller = createAuthenticatedCaller(user);
//       const result = await caller.post.getPostImageUploadSignature();

//       expect(result).toMatchObject({
//          signature: expect.any(String),
//          timestamp: expect.any(Number),
//          folder: 'artfolio/posts',
//          apiKey: expect.any(String),
//          cloudName: expect.any(String),
//       });
//    });

//    it('throws UNAUTHORIZED if not logged in', async () => {
//       const caller = createCaller();
//       await expect(
//          caller.post.getPostImageUploadSignature(),
//       ).rejects.toMatchObject({
//          code: 'UNAUTHORIZED',
//       });
//    });
// });
