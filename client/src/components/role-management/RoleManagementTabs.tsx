import PromoteAdminsTab from '@/components/role-management/PromoteAdminsTab';
import RoleRequestsTab from '@/components/role-management/RoleRequestsTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
                     value="demote-users"
                     data-testid="demote-users-tab-btn"
                  >
                     Demote users
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
            <TabsContent value="demote-users">
               <span>Demote users</span>
            </TabsContent>
            <TabsContent value="audit-table">
               <span>Audit table tab</span>
            </TabsContent>
         </Tabs>
      </div>
   );
}

export default RoleManagementTabs;
