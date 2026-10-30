function Note({ note, username }: { note: string; username: string }) {
   return (
      <div className="flex gap-3">
         <div>
            <p className="border rounded-full py-3">image</p>
         </div>

         <div className="border rounded-md bg-gray-50 flex-1 py-3 px-6">
            <p className="font-semibold">{username}</p>
            <p>{note}</p>
         </div>
      </div>
   );
}

export default Note;
