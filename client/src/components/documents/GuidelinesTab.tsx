function GuidelinesTab() {
   return (
      <div className="flex flex-col gap-3 text-[1rem] mt-2">
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
      </div>
   );
}

export default GuidelinesTab;
