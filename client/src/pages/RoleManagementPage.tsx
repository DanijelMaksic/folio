import RoleManagement from '@/components/role-management/RoleManagement';
import { useSession } from '@/lib/auth-client';

function RoleManagementPage() {
   const { data: session } = useSession();

   const isAdmin = session?.user.globalRole === 'admin';

   return <div>{isAdmin && <RoleManagement />}</div>;
}

export default RoleManagementPage;
