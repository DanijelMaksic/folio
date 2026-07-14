import { signUp } from '@/lib/auth-client';
import { useState } from 'react';

export default function Register() {
   const [error, setError] = useState<string | null>(null);
   const [success, setSuccess] = useState(false);

   const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = new FormData(e.currentTarget);

      const { error } = await signUp.email({
         email: form.get('email') as string,
         password: form.get('password') as string,
         name: form.get('name') as string,
         username: form.get('username') as string,
         callbackURL: `${import.meta.env.VITE_CLIENT_URL}/`,
      });

      if (error) {
         setError(error.message ?? 'Registration failed');
      } else {
         setSuccess(true);
      }

      // TODO: Currently this block doesn't execute
      if (success) {
         return <p>Check your email to verify your account</p>;
      }
   };

   return (
      <form onSubmit={handleSubmit}>
         <h1>Register</h1>
         {error && <p style={{ color: 'red' }}>{error}</p>}
         <input name="name" placeholder="Full name" required />
         <input name="username" placeholder="Username" required />
         <input name="email" type="email" placeholder="Email" required />
         <input
            name="password"
            type="password"
            placeholder="Password"
            required
         />
         <button type="submit">Register</button>
      </form>
   );
}
