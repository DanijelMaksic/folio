import { trpc } from '../lib/trpc';
import { useNavigate } from 'react-router-dom';
import { Document } from '@shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
   Card,
   CardAction,
   CardDescription,
   CardFooter,
   CardHeader,
   CardTitle,
} from '@/components/ui/card';
// import { format } from 'date-fns';
import { Link } from 'react-router-dom';

export default function Documents() {
   const navigate = useNavigate();

   const { data, isLoading } = trpc.documents.list.useQuery({
      page: 1,
      limit: 20,
   });

   if (isLoading) return <p>Loading...</p>;

   return (
      <div className="max-w-4xl mx-auto p-6">
         <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold">Documents</h1>
            <Button onClick={() => navigate('/documents/upload')}>
               Upload
            </Button>
         </div>

         {!data?.length ? (
            <p className="text-muted-foreground">No documents yet.</p>
         ) : (
            <div className="grid grid-cols-3 gap-4">
               {data.map((doc: Document) => (
                  <DocumentCard doc={doc} />
               ))}
            </div>
         )}
      </div>
   );
}

// function DocumentCard({ doc }: { doc: Document }) {
//    const navigate = useNavigate();
//    const { id, title, description, status, cloudinaryUrl } = doc;

//    return (
//       <Card className="relative mx-auto w-full max-w-sm pt-0 gap-4">
//          <div className="absolute inset-0 z-30 aspect-video bg-black/35" />
//          <img
//             src={cloudinaryUrl}
//             alt="Document cover"
//             className="relative z-20 aspect-video w-full object-cover"
//          />
//          <CardHeader>
//             <CardAction>
//                <Badge variant="secondary" className="capitalize">
//                   {status}
//                </Badge>
//             </CardAction>
//             <CardTitle>{title}</CardTitle>
//             <CardDescription>{description}</CardDescription>
//          </CardHeader>

//          <CardFooter className="mt-auto">
//             <Button
//                className="w-full"
//                onClick={() => navigate(`/documents/${id}`)}
//             >
//                View Document
//             </Button>
//          </CardFooter>
//       </Card>
//    );
// }

function DocumentCard({ doc }: { doc: Document }) {
   const { id, title, status, cloudinaryUrl } = doc;
   // const date = format(new Date(article.first_published_at), 'MMM dd, yyyy');

   return (
      <Link
         to={`/documents/${id}`}
         className="relative flex flex-col justify-between h-90 rounded-xl p-6 group cursor-pointer hover:translate-y-[-6px] transition duration-300 hover:shadow-2xl"
      >
         <span className="absolute -inset-px m-0 bg-linear-to-t from-gray-800 group-hover:from-gray-900 z-10 pointer-events-none rounded-xl md:rounded-2xl transition duration-300 group-hover:saturate-120" />

         <img
            src={cloudinaryUrl}
            alt="Document image"
            className="absolute inset-0 h-full w-full object-cover rounded-xl md:rounded-2xl"
         />

         <span />

         <div className="z-20 space-y-0.5">
            <div className="space-x-2 text-sm text-gray-300/70">
               <span>date</span>
               <span>•</span>
               <span>author.full_name</span>
            </div>

            <h2
               className="text-gray-50 text-xl font-medium font-title leading-9.5 2xl:leading-9 lg:leading-8 md:leading-10"
               style={{ textShadow: '2px 2px 12px rgba(0, 0, 0, 1)' }}
            >
               {title}
            </h2>
         </div>
      </Link>
   );
}
