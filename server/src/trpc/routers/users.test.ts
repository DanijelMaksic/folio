import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
   createAuthenticatedCaller,
   createUnauthenticatedCaller,
} from '@/__tests__/helpers/trpc-helper.js';
import { mockUser } from '@/__tests__/helpers/factories.js';

const { mockSelect } = vi.hoisted(() => ({
   mockSelect: vi.fn(),
}));

vi.mock('@/db/index.js', () => ({
   db: {
      select: mockSelect,
   },
}));

vi.mock('@/lib/queue.js', () => ({
   pdfQueue: { add: vi.fn() },
}));

const contributorUser = mockUser({
   id: 'contributor-id',
   globalRole: 'contributor',
});

const createdAt = new Date('2026-01-01T00:00:00Z');

const mockProfileRow = {
   id: 'user-1',
   name: 'Test User',
   username: 'testuser',
   image: null,
   globalRole: 'contributor',
   createdAt,
};

beforeEach(() => {
   vi.resetAllMocks();
});

// ── helpers ───────────────────────

// select().from().where() -> rows (profile lookup, no limit)
const mockProfileLookup = (rows: unknown[]) => {
   const columns = vi.fn();
   const where = vi.fn((_where?: unknown) => Promise.resolve(rows));
   mockSelect.mockReturnValueOnce({
      from: vi.fn(() => ({ where })),
   });
   return { columns, where };
};

// select({ n: count() }).from().where() -> [{ n }]
const mockCount = (n: number) => {
   const where = vi.fn((_where?: unknown) => Promise.resolve([{ n }]));
   mockSelect.mockReturnValueOnce({ from: vi.fn(() => ({ where })) });
   return { where };
};

const mockCountRejecting = (err: unknown) =>
   mockSelect.mockReturnValueOnce({
      from: vi.fn(() => ({
         where: vi.fn().mockRejectedValueOnce(err),
      })),
   });

// documents, collections, approved transcriptions, notes (router order)
const mockAllCounts = (docs = 0, cols = 0, approved = 0, notes = 0) => ({
   docs: mockCount(docs),
   cols: mockCount(cols),
   approved: mockCount(approved),
   notes: mockCount(notes),
});

// ── getPublicProfile ───────────────────────

describe('users.getPublicProfile', () => {
   it('returns the profile with stats', async () => {
      mockProfileLookup([mockProfileRow]);
      mockAllCounts(4, 2, 17, 9);

      const caller = createUnauthenticatedCaller();
      const result = await caller.users.getPublicProfile({
         username: 'testuser',
      });

      expect(result).toMatchObject({
         id: 'user-1',
         name: 'Test User',
         username: 'testuser',
         globalRole: 'contributor',
         stats: {
            documents: 4,
            collections: 2,
            approvedTranscriptions: 17,
            notes: 9,
         },
      });
   });

   it('maps each count to the right stat', async () => {
      mockProfileLookup([mockProfileRow]);
      mockAllCounts(1, 2, 3, 4);

      const caller = createUnauthenticatedCaller();
      const result = await caller.users.getPublicProfile({
         username: 'testuser',
      });

      expect(result.stats).toEqual({
         documents: 1,
         collections: 2,
         approvedTranscriptions: 3,
         notes: 4,
      });
   });

   it('returns zero stats for a new user', async () => {
      mockProfileLookup([mockProfileRow]);
      mockAllCounts();

      const caller = createUnauthenticatedCaller();
      const result = await caller.users.getPublicProfile({
         username: 'testuser',
      });

      expect(result.stats).toEqual({
         documents: 0,
         collections: 0,
         approvedTranscriptions: 0,
         notes: 0,
      });
   });

   it('does not expose the email', async () => {
      mockProfileLookup([mockProfileRow]);
      mockAllCounts();

      const caller = createUnauthenticatedCaller();
      const result = await caller.users.getPublicProfile({
         username: 'testuser',
      });

      expect(result).not.toHaveProperty('email');
   });

   it('looks the user up by username', async () => {
      const lookup = mockProfileLookup([mockProfileRow]);
      mockAllCounts();

      const caller = createUnauthenticatedCaller();
      await caller.users.getPublicProfile({ username: 'testuser' });

      expect(lookup.where.mock.calls[0][0]).toBeDefined();
   });

   it('scopes every count query to the user', async () => {
      mockProfileLookup([mockProfileRow]);
      const counts = mockAllCounts();

      const caller = createUnauthenticatedCaller();
      await caller.users.getPublicProfile({ username: 'testuser' });

      expect(counts.docs.where.mock.calls[0][0]).toBeDefined();
      expect(counts.cols.where.mock.calls[0][0]).toBeDefined();
      expect(counts.approved.where.mock.calls[0][0]).toBeDefined();
      expect(counts.notes.where.mock.calls[0][0]).toBeDefined();
   });

   it('works for a signed-in user', async () => {
      mockProfileLookup([mockProfileRow]);
      mockAllCounts(1, 1, 1, 1);

      const caller = createAuthenticatedCaller(contributorUser);
      const result = await caller.users.getPublicProfile({
         username: 'testuser',
      });

      expect(result.username).toBe('testuser');
   });

   it('throws NOT_FOUND for an unknown username and runs no count queries', async () => {
      mockProfileLookup([]);

      const caller = createUnauthenticatedCaller();
      await expect(
         caller.users.getPublicProfile({ username: 'ghost' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });

      expect(mockSelect).toHaveBeenCalledTimes(1);
   });

   it('propagates an error from a count query', async () => {
      mockProfileLookup([mockProfileRow]);
      mockCount(1);
      mockCountRejecting(new Error('db down'));
      mockCount(1);
      mockCount(1);

      const caller = createUnauthenticatedCaller();
      await expect(
         caller.users.getPublicProfile({ username: 'testuser' }),
      ).rejects.toMatchObject({ code: 'INTERNAL_SERVER_ERROR' });
   });

   it('rejects a missing username', async () => {
      const caller = createUnauthenticatedCaller();
      await expect(
         caller.users.getPublicProfile({
            username: undefined as unknown as string,
         }),
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

      expect(mockSelect).not.toHaveBeenCalled();
   });
});
