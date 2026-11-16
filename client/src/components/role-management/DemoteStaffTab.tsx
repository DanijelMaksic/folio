import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from '@/components/ui/dialog';
import { Link } from 'react-router-dom';

type Staff = { id: string; username: string; name: string };

function DemoteStaffTab() {
   const utils = trpc.useUtils();
   const [selected, setSelected] = useState<Staff | null>(null);

   const { data: staff, isLoading } = trpc.admin.listStaff.useQuery();

   return <div>Demote staff</div>;
}

export default DemoteStaffTab;
