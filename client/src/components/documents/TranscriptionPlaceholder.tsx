import { useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';

function TranscriptionPlaceholder({ type }: { type: string }) {
   // type prop represents the role of the user who looks at the placeholder

   const { id } = useParams<{ id: string }>();

   return (
      <div className="flex items-center justify-center flex-col gap-6 border rounded-md">
         <span>Icon</span>
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
               <Link
                  to={`/documents/${id}/transcribe`}
                  className="border rounded-lg px-2 py-1 hover:bg-gray-100 border-gray-400 transition-all"
               >
                  Contribute now
               </Link>
            )}
         </div>
      </div>
   );
}

export default TranscriptionPlaceholder;
