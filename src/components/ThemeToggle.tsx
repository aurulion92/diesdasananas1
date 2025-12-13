import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useThemeContext } from '@/context/ThemeContext';

export function ThemeToggle() {
  const { effectiveTheme, toggleTheme } = useThemeContext();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
      title={effectiveTheme === 'dark' ? 'Zum hellen Modus wechseln' : 'Zum dunklen Modus wechseln'}
    >
      {effectiveTheme === 'dark' ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      )}
    </Button>
  );
}
