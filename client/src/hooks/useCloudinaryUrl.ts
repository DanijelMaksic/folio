import { cloudinaryUrl } from '@/lib/cloudinary';

export function useCloudinaryUrl() {
   const dpr = Math.min(window.devicePixelRatio ?? 1, 2);

   return {
      dpr,
      detail: (url: string | null | undefined, width: number) =>
         cloudinaryUrl(url, {
            width: Math.round(width * dpr),
            crop: 'limit',
         }),
   };
}
