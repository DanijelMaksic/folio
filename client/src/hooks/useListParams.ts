import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useListParams<S extends string>(
   sorts: readonly S[],
   defaultSort: S,
) {
   const [params, setParams] = useSearchParams();
   const page = Math.max(Number(params.get('page')) || 1, 1);
   const search = params.get('search') ?? '';
   const raw = params.get('sort') as S | null;
   const sort = raw && sorts.includes(raw) ? raw : defaultSort;
   const [input, setInput] = useState(search);

   useEffect(() => {
      if (input === search) return;
      const t = setTimeout(() => {
         setParams(
            (prev) => {
               const next = new URLSearchParams(prev);
               if (input) next.set('search', input);
               else next.delete('search');
               next.set('page', '1');
               return next;
            },
            { replace: true },
         );
      }, 300);
      return () => clearTimeout(t);
   }, [input, search, setParams]);

   const setPage = (p: number) =>
      setParams((prev) => {
         const next = new URLSearchParams(prev);
         next.set('page', String(p));
         return next;
      });

   const setSort = (s: S) =>
      setParams((prev) => {
         const next = new URLSearchParams(prev);
         if (s === defaultSort) next.delete('sort');
         else next.set('sort', s);
         next.set('page', '1');
         return next;
      });

   return { page, search, sort, input, setInput, setPage, setSort };
}
