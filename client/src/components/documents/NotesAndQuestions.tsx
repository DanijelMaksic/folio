import Note from '@/components/documents/Note';

function NotesAndQuestions() {
   return (
      <div className="max-w-3xl mx-auto my-12">
         <div className="flex flex-col items-center">
            <h2 className="text-2xl font-semibold self-center">
               Notes & Questions
            </h2>

            <div className="self-start flex flex-col gap-3 my-8 w-full">
               <Note
                  note="Lorem ipsum dolor sit amet consectetur adipisicing elit. Enim velit accusantium illo magnam eos! Maiores labore quidem optio ullam saepe, aspernatur quisquam, blanditiis laudantium enim eius perferendis earum, corrupti nisi."
                  username="danijel99"
               />
               <Note
                  note="Lorem ipsum dolor sit amet consectetur adipisicing elit."
                  username="david8888"
               />
               <Note note="Man" username="danAdmin" />
            </div>
         </div>
      </div>
   );
}

// empty text for later: Nobody has written a note for this page yet

export default NotesAndQuestions;
