interface CloudinaryOptions {
   width?: number;
   height?: number;
   quality?: number | 'auto';
   crop?: 'fill' | 'fit' | 'limit' | 'scale' | 'thumb';
   format?: 'auto' | 'webp' | 'avif';
   dpr?: number;
}

export function cloudinaryUrl(
   url: string | null | undefined,
   options: CloudinaryOptions = {},
): string {
   if (!url) return '';

   const {
      width,
      height,
      quality = 'auto:best',
      crop = 'fill',
      format = 'auto',
      dpr,
   } = options;

   const transforms = [
      width && `w_${width}`,
      height && `h_${height}`,
      crop && `c_${crop}`,
      `q_${quality}`,
      `f_${format}`,
      dpr && `dpr_${dpr}`,
   ]
      .filter(Boolean)
      .join(',');

   return url.replace('/upload/', `/upload/${transforms}/`);
}
