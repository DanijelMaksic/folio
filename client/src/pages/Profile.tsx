import { Navigate, useSearchParams } from 'react-router-dom';
import { useSession } from '@/lib/auth-client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProfileAvatar from '@/components/profile/ProfileAvatar';
import ContributionStats from '@/components/profile/ContributionStats';
import ProfileSettings from '@/components/profile/ProfileSettings';
import RoleRequestCard from '@/components/profile/RoleRequestCard';

const TABS = ['stats', 'settings'] as const;
type ProfileTab = (typeof TABS)[number];

const dateFormatter = new Intl.DateTimeFormat(undefined, {
   year: 'numeric',
   month: 'long',
   day: 'numeric',
});

function Profile() {
   const { data: session, isPending } = useSession();
   const [searchParams, setSearchParams] = useSearchParams();

   const rawTab = searchParams.get('tab') as ProfileTab | null;
   const tab: ProfileTab = rawTab && TABS.includes(rawTab) ? rawTab : 'stats';

   const handleTabChange = (value: string) => {
      setSearchParams(
         (prev) => {
            const next = new URLSearchParams(prev);
            if (value === 'stats') {
               next.delete('tab');
            } else {
               next.set('tab', value);
            }
            return next;
         },
         { replace: true },
      );
   };

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
      <div className="max-w-3xl mx-auto px-6 pt-12 pb-16">
         <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
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

            <RoleRequestCard globalRole={user.globalRole!} />
         </header>

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

         <Tabs value={tab} onValueChange={handleTabChange} className="mt-6">
            <TabsList>
               <TabsTrigger value="stats">Contribution stats</TabsTrigger>
               <TabsTrigger value="settings">Profile settings</TabsTrigger>
            </TabsList>

            <TabsContent value="stats" className="mt-6">
               <ContributionStats />
            </TabsContent>

            <TabsContent value="settings" className="mt-6">
               <ProfileSettings
                  name={user.name ?? ''}
                  username={user.username ?? ''}
               />
            </TabsContent>
         </Tabs>
      </div>
   );
}

export default Profile;
