import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';

function ThemeToggle() {
   const { theme, toggle } = useTheme();
   const label =
      theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';

   return (
      <Button
         variant="ghost"
         size="icon"
         onClick={toggle}
         aria-label={label}
         title={label}
         className="bg-primary hover:bg-teal-600 dark:hover:bg-teal-300"
      >
         {theme === 'dark' ? (
            <Sun className="size-4 text-primary-foreground" />
         ) : (
            <Moon className="size-4 text-primary-foreground" />
         )}
      </Button>
   );
}

export default ThemeToggle;
