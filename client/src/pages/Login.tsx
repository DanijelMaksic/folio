import { signIn } from '@/lib/auth-client';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
   const [error, setError] = useState<string | null>(null);
   const navigate = useNavigate();

   const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = new FormData(e.currentTarget);

      const { error } = await signIn.email({
         email: form.get('email') as string,
         password: form.get('password') as string,
      });

      if (error) {
         setError(error.message ?? 'Login failed');
      } else {
         navigate('/');
      }
   };

   return (
      <form onSubmit={handleSubmit}>
         <h1>Login</h1>
         {error && <p style={{ color: 'red' }}>{error}</p>}
         <input name="email" type="email" placeholder="Email" required />
         <input
            name="password"
            type="password"
            placeholder="Password"
            required
         />
         <button type="submit">Login</button>
      </form>
   );
}
