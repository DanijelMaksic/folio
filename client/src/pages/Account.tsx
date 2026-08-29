import { useSession, signOut, deleteUser } from '@/lib/auth-client';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Account() {
   const { data: session, isPending } = useSession();
   const navigate = useNavigate();
   const [confirming, setConfirming] = useState(false);
   const [deleting, setDeleting] = useState(false);

   if (isPending) return <p>Loading...</p>;
   if (!session) return <p>Not logged in...</p>;

   async function handleDeleteAccount() {
      setDeleting(true);
      await deleteUser();
      navigate('/login');
   }

   return (
      <div className="min-h-screen flex items-center justify-center">
         <Card className="w-full max-w-sm shadow-2xl">
            <CardHeader>
               <CardTitle className="text-2xl">
                  Welcome, {session.user.username ?? session.user.name}
               </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="text-sm space-y-1">
                  <p className="text-muted-foreground">
                     Email: {session.user.email}
                  </p>
                  <p className="text-muted-foreground capitalize">
                     Role: {session.user.globalRole}
                  </p>
               </div>

               <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => signOut().then(() => navigate('/login'))}
               >
                  Sign out
               </Button>

               {!confirming ? (
                  <Button
                     variant="ghost"
                     className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                     onClick={() => setConfirming(true)}
                  >
                     Delete account
                  </Button>
               ) : (
                  <div className="space-y-2">
                     <p className="text-sm text-destructive text-center">
                        Are you sure? This cannot be undone.
                     </p>
                     <div className="flex gap-2">
                        <Button
                           variant="outline"
                           className="flex-1"
                           onClick={() => setConfirming(false)}
                           disabled={deleting}
                        >
                           Cancel
                        </Button>
                        <Button
                           variant="destructive"
                           className="flex-1"
                           onClick={handleDeleteAccount}
                           disabled={deleting}
                        >
                           {deleting ? 'Deleting...' : 'Confirm'}
                        </Button>
                     </div>
                  </div>
               )}
            </CardContent>
         </Card>
      </div>
   );
}
