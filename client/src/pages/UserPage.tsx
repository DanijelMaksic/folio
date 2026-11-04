import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/lib/trpc';
import { useSession } from '@/lib/auth-client';
import PageNotFound from '@/pages/PageNotFound';
import UserDocumentsTab from '@/components/users/UserDocumentsTab';
import UserCollectionsTab from '@/components/users/UserCollectionsTab';
import UserNotesTab from '@/components/users/UserNotesTab';

const TABS = ['documents', 'collections', 'notes'] as const;

function UserPage() {
   const { username } = useParams<{ username: string }>();
   const { data: session } = useSession();
   const [params, setParams] = useSearchParams();

   const raw = params.get('tab');
   const tab = TABS.find((t) => t === raw) ?? 'documents';

   const {
      data: profile,
      isLoading,
      error,
   } = trpc.users.getPublicProfile.useQuery(
      { username: username! },
      { enabled: !!username },
   );

   if (isLoading) return <p>Loading...</p>;
   if (error?.data?.code === 'NOT_FOUND' || !profile) return <PageNotFound />;

   const isMe = session?.user.id === profile.id;

   return (
      <div className="max-w-4xl mx-auto p-6">
         <div className="flex items-center gap-5 mb-8">
            {profile.image ? (
               <img
                  src={profile.image}
                  alt={`${profile.name}'s avatar`}
                  className="size-24 rounded-full border-2 object-cover"
               />
            ) : (
               <div className="flex size-24 items-center justify-center rounded-full border bg-muted text-3xl font-medium uppercase">
                  {profile.name[0]}
               </div>
            )}

            <div className="space-y-1">
               <h1 className="text-2xl font-semibold">{profile.name}</h1>
               <p className="text-muted-foreground">@{profile.username}</p>
               <p className="text-sm text-muted-foreground">
                  <span className="capitalize">{profile.globalRole}</span>
                  {' • '}Joined{' '}
                  {new Date(profile.createdAt).toLocaleDateString(undefined, {
                     month: 'long',
                     year: 'numeric',
                  })}
                  {' • '}
                  {profile.stats.approvedTranscriptions} approved transcriptions
               </p>
            </div>

            {isMe && (
               <Link to="/profile" className="ml-auto text-sm underline">
                  Edit profile
               </Link>
            )}
         </div>

         <Tabs value={tab} onValueChange={(v) => setParams({ tab: String(v) })}>
            <TabsList>
               <TabsTrigger value="documents">
                  Documents ({profile.stats.documents})
               </TabsTrigger>
               <TabsTrigger value="collections">
                  Collections ({profile.stats.collections})
               </TabsTrigger>
               <TabsTrigger value="notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="documents">
               <UserDocumentsTab userId={profile.id} />
            </TabsContent>
            <TabsContent value="collections">
               <UserCollectionsTab userId={profile.id} />
            </TabsContent>
            <TabsContent value="notes">
               <UserNotesTab userId={profile.id} />
            </TabsContent>
         </Tabs>
      </div>
   );
}

export default UserPage;
