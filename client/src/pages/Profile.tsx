import { useSession } from '@/lib/auth-client';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import EditProfileModal from '@/components/profile/EditProfileModal';
import ChangePasswordModal from '@/components/profile/ChangePasswordModal';
import ProfileAvatar from '@/components/profile/ProfileAvatar';

const dateFormatter = new Intl.DateTimeFormat(undefined, {
   year: 'numeric',
   month: 'long',
   day: 'numeric',
});

function Profile() {
   const [editOpen, setEditOpen] = useState(false);
   const [passwordOpen, setPasswordOpen] = useState(false);

   const { data: session, isPending } = useSession();

   if (isPending) {
      return (
         <div className="max-w-4xl mx-auto px-6 pt-12">
            <p className="text-muted-foreground">Loading...</p>
         </div>
      );
   }

   if (!session) return <Navigate to="/login" replace />;

   const { user } = session;
   const displayName = user.name || user.username;
   const memberSince = dateFormatter.format(new Date(user.createdAt));

   return (
      <div className="max-w-4xl mx-auto px-6 pt-12">
         <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-6">
               <ProfileAvatar image={user.image} displayName={displayName} />

               <div className="flex flex-col items-start gap-2">
                  <div>
                     <h1 className="text-3xl leading-tight">{displayName}</h1>
                     {user.username && user.name && (
                        <p className="text-muted-foreground">
                           @{user.username}
                        </p>
                     )}
                  </div>

                  <span className="rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize">
                     {user.globalRole}
                  </span>
               </div>
            </div>

            <div className="flex gap-3 self-start">
               <Button variant="outline" onClick={() => setEditOpen(true)}>
                  Edit profile
               </Button>

               <Button variant="outline" onClick={() => setPasswordOpen(true)}>
                  Change password
               </Button>
            </div>
         </div>

         <dl className="mt-8 grid gap-6 border-y py-5 sm:grid-cols-2">
            <div>
               <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Email
               </dt>
               <dd className="mt-1 break-all">{user.email}</dd>
            </div>
            <div>
               <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Member since
               </dt>
               <dd className="mt-1">{memberSince}</dd>
            </div>
         </dl>

         <EditProfileModal
            open={editOpen}
            onOpenChange={setEditOpen}
            initialName={user.name ?? ''}
            initialUsername={user.username ?? ''}
         />

         <ChangePasswordModal
            open={passwordOpen}
            onOpenChange={setPasswordOpen}
         />
      </div>
   );
}

export default Profile;
