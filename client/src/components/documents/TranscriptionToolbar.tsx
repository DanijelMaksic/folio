import { Italic, Strikethrough, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
   Tooltip,
   TooltipContent,
   TooltipTrigger,
} from '@/components/ui/tooltip';

type Props = {
   onItalic: () => void;
   onDeleted: () => void;
   onIllegible: () => void;
   disabled?: boolean;
};

function TranscriptionToolbar({
   onItalic,
   onDeleted,
   onIllegible,
   disabled,
}: Props) {
   const items = [
      { label: 'Italic', icon: Italic, onClick: onItalic },
      { label: 'Crossed out', icon: Strikethrough, onClick: onDeleted },
      { label: 'Illegible', icon: EyeOff, onClick: onIllegible },
   ];

   return (
      <div className="flex gap-1">
         {items.map(({ label, icon: Icon, onClick }) => (
            <Tooltip key={label}>
               <TooltipTrigger
                  render={
                     <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label={label}
                        disabled={disabled}
                        // keeps focus and selection in the textarea
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={onClick}
                     >
                        <Icon className="size-4" />
                     </Button>
                  }
               />
               <TooltipContent>{label}</TooltipContent>
            </Tooltip>
         ))}
      </div>
   );
}

export default TranscriptionToolbar;
