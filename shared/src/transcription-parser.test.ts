import { describe, it, expect } from 'vitest';
import { parseTranscription } from './transcription-parser';

const t = (text: string, o: { italic?: boolean; deleted?: boolean } = {}) => ({
   type: 'text' as const,
   text,
   italic: o.italic ?? false,
   deleted: o.deleted ?? false,
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
         t('said', { italic: true }),
         t(' no'),
      ]);
   });

   it('parses deleted', () => {
      expect(parseTranscription('a <del>b</del> c')).toEqual([
         t('a '),
         t('b', { deleted: true }),
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
         t('x', { italic: true, deleted: true }),
      ]);
   });

   it('handles partial nesting', () => {
      expect(parseTranscription('<i>a <del>b</del> c</i>')).toEqual([
         t('a ', { italic: true }),
         t('b', { italic: true, deleted: true }),
         t(' c', { italic: true }),
      ]);
   });

   it('handles illegible inside a tag', () => {
      expect(parseTranscription('<i>a [illegible] b</i>')).toEqual([
         t('a ', { italic: true }),
         illegible,
         t(' b', { italic: true }),
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
         t('b', { italic: true }),
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
});
