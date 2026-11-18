export const toBase64 = (file: File): Promise<string> =>
   new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result as string);
      reader.onerror = rej;
      reader.readAsDataURL(file);
   });

export const formatDate = (d: string | Date) =>
   new Date(d).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
   });

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

export const timeAgo = (date: string | Date) => {
   const seconds = Math.round((new Date(date).getTime() - Date.now()) / 1000);
   const units: [Intl.RelativeTimeFormatUnit, number][] = [
      ['year', 31536000],
      ['month', 2592000],
      ['day', 86400],
      ['hour', 3600],
      ['minute', 60],
   ];
   for (const [unit, size] of units) {
      if (Math.abs(seconds) >= size)
         return rtf.format(Math.round(seconds / size), unit);
   }
   return 'just now';
};
