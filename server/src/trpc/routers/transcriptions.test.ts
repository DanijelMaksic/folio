import { mockUser } from '@/tests/helpers/factories.js';
import { createAuthenticatedCaller } from '@/tests/helpers/trpc-helper.js';
import { describe, it, expect } from 'vitest';

describe('transcriptions.listQueue', () => {
   it('throws FORBIDDEN for viewer', async () => {
      const caller = createAuthenticatedCaller(
         mockUser({ globalRole: 'viewer' }),
      );
      await expect(caller.transcriptions.listQueue()).rejects.toMatchObject({
         code: 'FORBIDDEN',
      });
   });
});
