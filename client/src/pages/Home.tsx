import { authClient, useSession } from '@/lib/auth-client';
import { signOut } from 'better-auth/api';
import { Navigate, useNavigate } from 'react-router-dom';

export default function Home() {
   const { data: session, isPending } = useSession();
   const navigate = useNavigate();

   if (isPending) return <p>Loading...</p>;
   if (!session) return <p>Not logged in...</p>;

   return (
      <div>
         <h1>Welcome, {session.user.username ?? session.user.name}</h1>
         <p>Email: {session.user.email}</p>
         <p>Role: {session.user.globalRole}</p>
         <button
            onClick={() => authClient.signOut().then(() => navigate('/login'))}
         >
            Sign out
         </button>
      </div>
   );
}
