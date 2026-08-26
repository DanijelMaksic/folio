function DocumentTabs() {
   return (
      <div className="flex justify-start items-center gap-6">
         <Tab title="Overview" />
         <Tab title="Transcribe" />
         <Tab title="Revision History" />
      </div>
   );
}

function Tab({ title }: { title: string }) {
   return (
      <button className="text-lg cursor-pointer hover:underline">
         {title}
      </button>
   );
}

export default DocumentTabs;
