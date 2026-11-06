export type TextSegment = {
   type: 'text';
   text: string;
   italic: boolean;
   deleted: boolean;
};

export type IllegibleSegment = { type: 'illegible' };
export type Segment = TextSegment | IllegibleSegment;

const TOKEN = /<\/?(?:i|del)>|\[illegible\]/g;

export function parseTranscription(input: string): Segment[] {
   const segments: Segment[] = [];
   const open = { i: false, del: false };

   function pushText(text: string) {
      if (!text) return;
      const last = segments[segments.length - 1];
      if (
         last?.type === 'text' &&
         last.italic === open.i &&
         last.deleted === open.del
      ) {
         last.text += text;
      } else {
         segments.push({
            type: 'text',
            text,
            italic: open.i,
            deleted: open.del,
         });
      }
   }

   const tokens = [...input.matchAll(TOKEN)];
   let cursor = 0;

   tokens.forEach((match, idx) => {
      const token = match[0];
      const start = match.index!;
      pushText(input.slice(cursor, start));
      cursor = start + token.length;

      if (token === '[illegible]') {
         segments.push({ type: 'illegible' });
         return;
      }

      const closing = token[1] === '/';
      const tag = (closing ? token.slice(2, -1) : token.slice(1, -1)) as
         | 'i'
         | 'del';

      if (closing) {
         // stray closer stays literal
         if (open[tag]) open[tag] = false;
         else pushText(token);
      } else {
         // opener only counts if a closer exists later
         const hasCloser = tokens
            .slice(idx + 1)
            .some((m) => m[0] === `</${tag}>`);
         if (!open[tag] && hasCloser) open[tag] = true;
         else pushText(token);
      }
   });

   pushText(input.slice(cursor));
   return segments;
}
