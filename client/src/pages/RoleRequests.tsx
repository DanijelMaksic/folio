import RoleManagement from '@/components/settings/RoleManagement';
import { useSession } from '@/lib/auth-client';

function RoleRequests() {
   const { data: session } = useSession();

   const isAdmin = session?.user.globalRole === 'admin';

   return <div>{isAdmin && <RoleManagement />}</div>;
}

export default RoleRequests;
