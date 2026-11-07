import { describe, it, expect } from 'vitest';
import { parseTranscription } from './transcription-parser';

const t = (text: string, marks: Tag[] = []) => ({
   type: 'text' as const,
   text,
   marks,
});
const illegible = { type: 'illegible' as const };

describe('parseTranscription', () => {
   it('returns an empty array for an empty string', () => {
      expect(parseTranscription('')).toEqual([]);
   });

   it('returns plain text as one segment', () => {
      expect(parseTranscription('Hello world')).toEqual([t('Hello world')]);
   });

   it('preserves newlines', () => {
      expect(parseTranscription('a\nb\n\nc')).toEqual([t('a\nb\n\nc')]);
   });

   it('parses italic', () => {
      expect(parseTranscription('He <i>said</i> no')).toEqual([
         t('He '),
         t('said', ['i']),
         t(' no'),
      ]);
   });

   it('parses deleted', () => {
      expect(parseTranscription('a <del>b</del> c')).toEqual([
         t('a '),
         t('b', ['del']),
         t(' c'),
      ]);
   });

   it('parses [illegible] as its own segment', () => {
      expect(parseTranscription('a [illegible] b')).toEqual([
         t('a '),
         illegible,
         t(' b'),
      ]);
   });

   it('handles several illegible markers in a row', () => {
      expect(parseTranscription('[illegible][illegible]')).toEqual([
         illegible,
         illegible,
      ]);
   });

   it('handles nested tags', () => {
      expect(parseTranscription('<i><del>x</del></i>')).toEqual([
         t('x', ['i', 'del']),
      ]);
   });

   it('handles partial nesting', () => {
      expect(parseTranscription('<i>a <del>b</del> c</i>')).toEqual([
         t('a ', ['i']),
         t('b', ['i', 'del']),
         t(' c', ['i']),
      ]);
   });

   it('handles illegible inside a tag', () => {
      expect(parseTranscription('<i>a [illegible] b</i>')).toEqual([
         t('a ', ['i']),
         illegible,
         t(' b', ['i']),
      ]);
   });

   it('drops empty tag pairs', () => {
      expect(parseTranscription('a<i></i>b')).toEqual([t('ab')]);
   });

   it('keeps an unclosed opening tag as literal text', () => {
      expect(parseTranscription('<i>hello')).toEqual([t('<i>hello')]);
   });

   it('keeps a stray closing tag as literal text', () => {
      expect(parseTranscription('hello</i>')).toEqual([t('hello</i>')]);
   });

   it('keeps only the unmatched tag literal in mixed input', () => {
      expect(parseTranscription('a <i>b</i> c</i>')).toEqual([
         t('a '),
         t('b', ['i']),
         t(' c</i>'),
      ]);
   });

   it('keeps a raw < as plain text', () => {
      expect(parseTranscription('a < b and c > d')).toEqual([
         t('a < b and c > d'),
      ]);
   });

   it('is case sensitive', () => {
      expect(parseTranscription('<I>x</I> [Illegible]')).toEqual([
         t('<I>x</I> [Illegible]'),
      ]);
   });

   it('does not treat other tags as markup', () => {
      expect(parseTranscription('<b>x</b> <script>y</script>')).toEqual([
         t('<b>x</b> <script>y</script>'),
      ]);
   });

   it.each(['i', 'del', 'u', 'sub', 'sup', 'add', 'head'] as const)(
      'parses <%s>',
      (tag) => {
         expect(parseTranscription(`a <${tag}>b</${tag}> c`)).toEqual([
            t('a '),
            t('b', [tag]),
            t(' c'),
         ]);
      },
   );

   it.each(['u', 'sub', 'sup', 'add', 'head'])(
      'keeps an unclosed <%s> literal',
      (tag) => {
         expect(parseTranscription(`<${tag}>x`)).toEqual([t(`<${tag}>x`)]);
      },
   );

   it('orders marks canonically regardless of nesting order', () => {
      expect(parseTranscription('<add><u>x</u></add>')).toEqual([
         t('x', ['u', 'add']),
      ]);
   });
});
