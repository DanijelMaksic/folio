import PromoteAdminsTab f@/components/role-management/DemoteStaffTabeAdminsTab';
import RoleRequestsTab from '@/components/role-management/RoleRequestsTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DemoteStaffTab from './DemoteStaffTab';

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
                     value="audit-table"
                     data-testid="audit-table-tab-btn"
                  >
                     Audit table
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
            <TabsContent value="audit-table">
               <span>Audit table tab</span>
            </TabsContent>
         </Tabs>
      </div>
   );
}

export default RoleManagementTabs;
