import { NavLink, useParams } from 'react-router-dom';

function DocumentTabs() {
   const { id } = useParams<{ id: string }>();

   return (
      <div className="flex justify-start items-center gap-6">
         <Tab title="Overview" to={`/documents/${id}/display`} />
         <Tab title="Transcribe" to={`/documents/${id}/transcribe`} />
         <Tab
            title="Revision History"
            to={`/documents/${id}/revision-history`}
         />
      </div>
   );
}

function Tab({ title, to }: { title: string; to: string }) {
   return (
      <NavLink
         to={to}
         className={({ isActive }: { isActive: boolean }) =>
            isActive
               ? 'bg-gray-100 transition-all px-3 py-1.5 rounded-md'
               : 'transition-all px-3 py-1.5'
         }
      >
         {title}
      </NavLink>
   );
}

export default DocumentTabs;
