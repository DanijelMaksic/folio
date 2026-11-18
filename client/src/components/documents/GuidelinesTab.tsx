import { ArrowLeft, ArrowRight } from 'lucide-react';

function GuidelinesTab() {
   return (
      <div className="flex flex-col gap-3 text-[1rem] mt-2 mb-4">
         <p>
            Once you sign up, a new Transcribe tab will appear above each page.
         </p>

         <p>
            You can transcribe pages by typing into the text field and saving
            the result. The saved result is saved in the Revision history tab.
         </p>

         <h2 className="text-lg font-semibold">
            General transcription conventions
         </h2>
         <p>Use original spelling</p>
         <p>Mark illegible words</p>
         <p>Don't forget to save your work!</p>

         <h2 className="text-lg font-semibold">Transription shortcuts</h2>
         <p>Ctrl+S - Save transcription</p>
         <p>Ctrl+Enter - Submit transcription</p>
         <p>Ctrl+I - Mark text as italic</p>
         <p>Ctrl+I - Underline text</p>
         <p>Ctrl+Alt+X - Cross out text</p>

         <h2 className="text-lg font-semibold">Navigation shortcuts</h2>

         <div className="flex items-center">
            <span className="border rounded-full px-2 flex items-center gap-1">
               Alt +
               <ArrowLeft size={14} />
            </span>
            - Previous page
         </div>

         <div className="flex items-center">
            <span className="border rounded-full px-2 flex items-center gap-1">
               Alt +
               <ArrowRight size={14} />
            </span>
            - Next page
         </div>
      </div>
   );
}

export default GuidelinesTab;
