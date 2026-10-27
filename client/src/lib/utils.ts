import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
   return twMerge(clsx(inputs));
}

export function parseErrorMessage(error: unknown): string {
   if (typeof error !== 'string') return 'Something went wrong.';
   try {
      const parsed = JSON.parse(error);
      if (Array.isArray(parsed) && parsed[0]?.message) {
         return parsed[0].message;
      }
      return error;
   } catch {
      return error;
   }
}
