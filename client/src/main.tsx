import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc, trpcClient } from './lib/trpc.js';

const queryClient = new QueryClient();

// trpc.Provider makes it possible to use useQuery() hooks anywhere in the component tree
// QueryClientProvider sets up the cache for hooks to use
function Root() {
   return (
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
         <QueryClientProvider client={queryClient}>
            <App />
         </QueryClientProvider>
      </trpc.Provider>
   );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
   <React.StrictMode>
      <Root />
   </React.StrictMode>,
);
