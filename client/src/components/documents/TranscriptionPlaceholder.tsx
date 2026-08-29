import { useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';

function TranscriptionPlaceholder({ type }: { type: string }) {
   // type prop represents the role of the user who looks at the placeholder

   const { id } = useParams<{ id: string }>();

   return (
      <div className="flex items-center justify-center flex-col gap-6 border rounded-md">
         <span>Icon Placeholder</span>
         <div className="flex flex-col gap-3 justify-center items-center opacity-50">
            <h2 className="text-lg">No transcriptions yet...</h2>

            {type === 'not-logged-in' && (
               <Link
                  to="/login"
                  className="border rounded-lg px-2 py-1 hover:bg-gray-100 border-gray-400 transition-all"
               >
                  Sign in to contribute
               </Link>
            )}

            {type === 'viewer' && (
               <span>You need to become contrubitor to transcribe</span>
            )}

            {type === 'contributor' && (
               <span className="border rounded-lg px-2 py-1 border-gray-400">
                  Go to Transcribe tab to contribute
               </span>
            )}
         </div>
      </div>
   );
}

export default TranscriptionPlaceholder;
