import { z } from 'zod';
import type { Resolver, FieldValues, FieldErrors } from 'react-hook-form';

export function zodResolver<T extends z.ZodType<FieldValues, FieldValues>>(
   schema: T,
): Resolver<z.output<T>> {
   return async (values) => {
      const result = schema.safeParse(values);
      if (result.success) {
         return { values: result.data, errors: {} };
      }
      const errors: Record<string, { type: string; message: string }> = {};
      for (const issue of result.error.issues) {
         const path = issue.path.join('.');
         if (path && !errors[path]) {
            errors[path] = { type: issue.code, message: issue.message };
         }
      }
      return {
         values: {},
         errors: errors as unknown as FieldErrors<z.output<T>>,
      };
   };
}
