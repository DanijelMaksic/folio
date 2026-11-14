import { Navigate } from 'react-router-dom';
import { useSession } from '@/lib/auth-client';
import ProfileAvatar from '@/components/settings/ProfileAvatar';
import ProfileSettings from '@/components/settings/ProfileSettings';
import RoleRequestCard from '@/components/role-management/RoleRequestCard';

const dateFormatter = new Intl.DateTimeFormat(undefined, {
   year: 'numeric',
   month: 'long',
   day: 'numeric',
});

function Settings() {
   const { data: session, isPending } = useSession();

   if (isPending) {
      return (
         <div className="max-w-4xl mx-auto px-6 pt-12">
            <p className="text-muted-foreground">Loading...</p>
         </div>
      );
   }

   if (!session) return <Navigate to="/sign-in" replace />;

   const { user } = session;
   const displayName = user.name || user.username;
   const memberSince = dateFormatter.format(new Date(user.createdAt));

   return (
      <div className="max-w-3xl mx-auto px-6 pt-12 pb-16">
         <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-6">
               <ProfileAvatar image={user.image} displayName={displayName} />

               <div className="flex flex-col items-start gap-2">
                  <div>
                     <h1 className="text-2xl leading-tight">{displayName}</h1>
                     {user.username && user.name && (
                        <p className="text-muted-foreground">
                           @{user.username}
                        </p>
                     )}
                  </div>
               </div>
            </div>

            <RoleRequestCard globalRole={user.globalRole!} />
         </header>

         <dl className="mt-8 grid gap-6 border-y py-5 grid-cols-[1.4fr_1fr_0.7fr] [&_dt]:text-[0.65rem]">
            <div>
               <dt className="uppercase tracking-wide text-muted-foreground">
                  Email
               </dt>
               <dd className="mt-1 break-all">{user.email}</dd>
            </div>

            <div>
               <dt className="uppercase tracking-wide text-muted-foreground">
                  Member since
               </dt>
               <dd className="mt-1">{memberSince}</dd>
            </div>

            <div>
               <dt className="uppercase tracking-wide text-muted-foreground">
                  Role
               </dt>
               <dd className="capitalize">{user.globalRole}</dd>
            </div>
         </dl>

         <ProfileSettings
            name={user.name ?? ''}
            username={user.username ?? ''}
         />
      </div>
   );
}

export default Settings;
