export function mockUser(overrides = {}) {
   return {
      id: 'user-test-id',
      email: 'test@example.com',
      username: 'testUser',
      globalRole: 'viewer',
      ...overrides,
   };
}
