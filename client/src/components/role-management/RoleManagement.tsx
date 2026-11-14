import { useSearchParams } from 'react-router-dom';
import RoleManagementTabs from '@/components/role-management/RoleManagementTabs';

const TABS = [
   'requests',
   'promote-admins',
   'demote-users',
   'audit-table',
] as const;

type Tab = (typeof TABS)[number];

function RoleManagement() {
   const [searchParams, setSearchParams] = useSearchParams();

   const rawTab = searchParams.get('tab');
   const tab: Tab = TABS.includes(rawTab as Tab) ? (rawTab as Tab) : 'requests';

   function handleTabChange(value: string) {
      setSearchParams(
         (prev) => {
            const next = new URLSearchParams(prev);
            if (value === 'requests') next.delete('tab');
            else next.set('tab', value);
            return next;
         },
         { replace: true },
      );
   }

   return (
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-3">
         <h1 className="text-2xl font-semibold">Role Management</h1>

         <RoleManagementTabs tab={tab} onTabChange={handleTabChange} />
      </div>
   );
}

export default RoleManagement;
