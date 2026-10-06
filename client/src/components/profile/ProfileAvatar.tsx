import { useRef, useState } from 'react';
import { AVATAR_MAX_BYTES } from '@folio/shared';
import { updateUser } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Loader2, X } from 'lucide-react';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function getInitials(name: string) {
   const parts = name.trim().split(/\s+/).filter(Boolean);
   if (parts.length === 0) return '?';
   if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
   return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function readAsDataUrl(file: File): Promise<string> {
   return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
   });
}

interface ProfileAvatarProps {
   image: string | null | undefined;
   displayName: string;
}

function ProfileAvatar({ image, displayName }: ProfileAvatarProps) {
   const inputRef = useRef<HTMLInputElement>(null);
   const [busy, setBusy] = useState(false);
   const [error, setError] = useState<string | null>(null);

   const uploadAvatar = trpc.profile.uploadAvatar.useMutation();
   const removeAvatar = trpc.profile.removeAvatar.useMutation();

   async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0];
      e.target.value = ''; // allow re-selecting the same file
      if (!file) return;

      if (!ACCEPTED_TYPES.includes(file.type)) {
         setError('Use a JPG, PNG or WebP image');
         return;
      }
      if (file.size > AVATAR_MAX_BYTES) {
         setError('Image must be 5MB or less');
         return;
      }

      setError(null);
      setBusy(true);
      try {
         const fileBase64 = await readAsDataUrl(file);
         const { imageUrl } = await uploadAvatar.mutateAsync({ fileBase64 });

         // Going through BetterAuth keeps the session store in sync
         const { error: updateError } = await updateUser({ image: imageUrl });
         if (updateError) {
            setError(updateError.message ?? 'Could not save avatar');
         }
      } catch (err) {
         setError(err instanceof Error ? err.message : 'Upload failed');
      } finally {
         setBusy(false);
      }
   }

   async function handleRemove() {
      setError(null);
      setBusy(true);
      try {
         const { error: updateError } = await updateUser({ image: null });
         if (updateError) {
            setError(updateError.message ?? 'Could not remove avatar');
            return;
         }
         await removeAvatar.mutateAsync();
      } catch (err) {
         setError(err instanceof Error ? err.message : 'Removal failed');
      } finally {
         setBusy(false);
      }
   }

   return (
      <div className="flex flex-col items-center gap-2">
         <div className="relative size-24 shrink-0">
            <button
               type="button"
               onClick={() => inputRef.current?.click()}
               disabled={busy}
               aria-label="Change profile photo"
               className="group relative size-full overflow-hidden rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
               {image ? (
                  <img
                     src={image}
                     alt={`${displayName}'s avatar`}
                     className="size-full object-cover"
                  />
               ) : (
                  <span
                     aria-hidden="true"
                     className="flex size-full items-center justify-center bg-muted text-2xl font-medium text-muted-foreground"
                  >
                     {getInitials(displayName)}
                  </span>
               )}

               <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  {busy ? (
                     <Loader2 className="size-5 animate-spin" />
                  ) : image ? (
                     'Change'
                  ) : (
                     'Upload'
                  )}
               </span>
            </button>

            {image && (
               <button
                  type="button"
                  onClick={handleRemove}
                  disabled={busy}
                  aria-label="Remove profile photo"
                  className="absolute top-0.5 right-0.5 flex size-6 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm transition-colors hover:bg-destructive hover:text-white focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
               >
                  <X className="size-3.5" />
               </button>
            )}
         </div>

         <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            className="hidden"
            onChange={handleFileChange}
         />

         {error && (
            <p
               role="alert"
               className="max-w-32 text-center text-xs text-destructive"
            >
               {error}
            </p>
         )}
      </div>
   );
}

export default ProfileAvatar;
