import { useMemo } from 'react';
import { parseTranscription, Tag } from '@shared';
import { cn } from '@/lib/utils';

const MARK_CLASS: Record<Tag, string> = {
   i: 'italic',
   del: 'line-through text-muted-foreground',
   u: 'underline',
   sub: 'align-sub text-xs',
   sup: 'align-super text-xs',
   add: 'bg-yellow-100 dark:bg-yellow-900/30 rounded-sm px-0.5',
   head: 'font-bold text-lg',
};

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

            if (!seg.marks.length) return seg.text;

            return (
               <span
                  key={i}
                  className={cn(seg.marks.map((m) => MARK_CLASS[m]))}
               >
                  {seg.text}
               </span>
            );
         })}
      </p>
   );
}

export default TranscriptionText;
