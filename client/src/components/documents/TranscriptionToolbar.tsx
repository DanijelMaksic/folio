import {
   Italic,
   Strikethrough,
   Underline,
   Subscript,
   Superscript,
   Plus,
   Heading,
   EyeOff,
   type LucideIcon,
} from 'lucide-react';
import type { Tag } from '@shared';
import { Button } from '@/components/ui/button';
import {
   Tooltip,
   TooltipContent,
   TooltipTrigger,
} from '@/components/ui/tooltip';

type Props = {
   onWrap: (tag: Tag) => void;
   onIllegible: () => void;
   disabled?: boolean;
};

type Item = { label: string; icon: LucideIcon; onClick: () => void };

function TranscriptionToolbar({ onWrap, onIllegible, disabled }: Props) {
   const items: Item[] = [
      { label: 'Italic', icon: Italic, onClick: () => onWrap('i') },
      {
         label: 'Crossed out',
         icon: Strikethrough,
         onClick: () => onWrap('del'),
      },
      { label: 'Underline', icon: Underline, onClick: () => onWrap('u') },
      { label: 'Subscript', icon: Subscript, onClick: () => onWrap('sub') },
      { label: 'Superscript', icon: Superscript, onClick: () => onWrap('sup') },
      { label: 'Added text', icon: Plus, onClick: () => onWrap('add') },
      { label: 'Heading', icon: Heading, onClick: () => onWrap('head') },
      { label: 'Illegible', icon: EyeOff, onClick: onIllegible },
   ];

   return (
      <div className="flex flex-wrap gap-1">
         {items.map(({ label, icon: Icon, onClick }) => (
            <Tooltip key={label}>
               <TooltipTrigger
                  render={
                     <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        aria-label={label}
                        disabled={disabled}
                        // keeps focus and selection in the textarea
                        onMouseDown={(e: React.MouseEvent<HTMLButtonElement>) =>
                           e.preventDefault()
                        }
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
