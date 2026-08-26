function TranscriptionPlaceholder() {
   return (
      <div className="flex items-center justify-center flex-col gap-6 border rounded-md">
         <span>Icon</span>
         <div className="flex flex-col gap-3 justify-center items-center opacity-50">
            <h2 className="text-lg">No transcriptions yet...</h2>
            <a
               href="/login"
               className="border rounded-lg px-2 py-1 hover:bg-gray-100 border-gray-400 transition-all"
            >
               Sign in to contribute
            </a>
         </div>
      </div>
   );
}

export default TranscriptionPlaceholder;
