// Postgres LIKE uses backslash as the escape character by default
export const escapeLike = (s: string) => s.replace(/[\\%_]/g, '\\$&');
