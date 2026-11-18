import PromoteAdminsTab from '@/components/role-management/PromoteAdminsTab';
import RoleRequestsTab from '@/components/role-management/RoleRequestsTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DemoteStaffTab from './DemoteStaffTab';
import AuditLogTab from './AuditLogTab';

export interface RoleManagementTabsProps {
   tab: string;
   onTabChange: (tab: string) => void;
}

function RoleManagementTabs({ tab, onTabChange }: RoleManagementTabsProps) {
   return (
      <div className="">
         <Tabs
            defaultValue="requests"
            value={tab}
            onValueChange={(value) => onTabChange(String(value))}
         >
            <div className="flex justify-between items-center gap-3 mt-1 mb-2">
               <TabsList>
                  <TabsTrigger value="requests">Role requests</TabsTrigger>
                  <TabsTrigger
                     value="promote-admins"
                     data-testid="promote-admins-tab-btn"
                  >
                     Promote admins
                  </TabsTrigger>
                  <TabsTrigger
                     value="demote-staff"
                     data-testid="demote-staff-tab-btn"
                  >
                     Demote staff
                  </TabsTrigger>
                  <TabsTrigger
                     value="audit-log"
                     data-testid="audit-log-tab-btn"
                  >
                     Audit log
                  </TabsTrigger>
               </TabsList>
            </div>

            <TabsContent value="requests">
               <RoleRequestsTab />
            </TabsContent>
            <TabsContent value="promote-admins">
               <PromoteAdminsTab />
            </TabsContent>
            <TabsContent value="demote-staff">
               <DemoteStaffTab />
            </TabsContent>
            <TabsContent value="audit-log">
               <AuditLogTab />
            </TabsContent>
         </Tabs>
      </div>
   );
}

export default RoleManagementTabs;
