import { useMemo } from 'react';
import { parseTranscription } from '@shared';
import { cn } from '@/lib/utils';

function TranscriptionText({
   content,
   className,
   ...props
}: React.ComponentProps<'p'> & { content: string }) {
   const segments = useMemo(() => parseTranscription(content), [content]);

   return (
      <p
         className={cn('whitespace-pre-wrap break-words', className)}
         {...props}
      >
         {segments.map((seg, i) => {
            if (seg.type === 'illegible') {
               return (
                  <span
                     key={i}
                     className="rounded border border-dashed px-1 text-muted-foreground"
                  >
                     [illegible]
                  </span>
               );
            }

            if (!seg.italic && !seg.deleted) return seg.text;

            return (
               <span
                  key={i}
                  className={cn(
                     seg.italic && 'italic',
                     seg.deleted && 'line-through text-muted-foreground',
                  )}
               >
                  {seg.text}
               </span>
            );
         })}
      </p>
   );
}

export default TranscriptionText;
