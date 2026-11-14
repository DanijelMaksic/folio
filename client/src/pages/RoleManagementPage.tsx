import RoleManagement from '@/components/role-management/RoleManagement';
import { useSession } from '@/lib/auth-client';
import { useNavigate } from 'react-router-dom';

function RoleManagementPage() {
   const { data: session } = useSession();

   const isAdmin = session?.user.globalRole === 'admin';

   const navigate = useNavigate();

   if (!isAdmin) navigate('/');

   return <div>{isAdmin && <RoleManagement />}</div>;
}

export default RoleManagementPage;
