import { useEffect, useState } from 'react';

export default function App() {
   const [status, setStatus] = useState<string>('loading...');

   useEffect(() => {
      fetch('/api/health')
         .then((r) => {
            console.log('status:', r.status);
            return r.text();
         })
         .then((text) => {
            console.log('body:', text);
            const data = JSON.parse(text);
            setStatus(data.status);
         })
         .catch((err) => {
            console.error(err);
            setStatus('error');
         });
   }, []);

   return (
      <div>
         <h1>Folio</h1>
         <p>API status: {status}</p>
      </div>
   );
}
