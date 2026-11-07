export const TAGS = ['i', 'del', 'u', 'sub', 'sup', 'add', 'head'] as const;
export type Tag = (typeof TAGS)[number];

export type TextSegment = { type: 'text'; text: string; marks: Tag[] };
export type IllegibleSegment = { type: 'illegible' };
export type Segment = TextSegment | IllegibleSegment;

const TOKEN = new RegExp(`</?(?:${TAGS.join('|')})>|\\[illegible\\]`, 'g');

export function parseTranscription(input: string): Segment[] {
   const segments: Segment[] = [];
   const open = new Set<Tag>();
   // always in TAGS order, so equal mark sets compare equal
   const currentMarks = () => TAGS.filter((t) => open.has(t));

   function pushText(text: string) {
      if (!text) return;
      const marks = currentMarks();
      const last = segments[segments.length - 1];
      if (last?.type === 'text' && last.marks.join() === marks.join()) {
         last.text += text;
      } else {
         segments.push({ type: 'text', text, marks });
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
      const tag = token.replace(/[<>/]/g, '') as Tag;

      if (closing) {
         if (open.has(tag)) open.delete(tag);
         else pushText(token);
      } else {
         const hasCloser = tokens
            .slice(idx + 1)
            .some((m) => m[0] === `</${tag}>`);
         if (!open.has(tag) && hasCloser) open.add(tag);
         else pushText(token);
      }
   });

   pushText(input.slice(cursor));
   return segments;
}
