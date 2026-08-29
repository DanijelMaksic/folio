import { Document } from '@shared';

function DocumentViewer({ doc }: { doc: Document }) {
   return (
      <div className="bg-gray-500 min-h-130 flex justify-center items-center rounded-md overflow-hidden">
         <img
            src={doc.cloudinaryUrl}
            alt={doc.title}
            className="w-full object-contain max-h-[70vh]"
         />
      </div>
   );
}

export default DocumentViewer;
