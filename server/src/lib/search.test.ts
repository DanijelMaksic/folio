import { describe, it, expect } from 'vitest';
import { escapeLike } from '@/lib/search.js';

describe('escapeLike', () => {
   it('escapes %, _ and backslash', () => {
      expect(escapeLike('50%_off\\')).toBe('50\\%\\_off\\\\');
   });

   it('leaves plain text unchanged', () => {
      expect(escapeLike('hello world')).toBe('hello world');
   });
});
