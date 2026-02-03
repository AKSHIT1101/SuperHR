import { Plus, Send, Calendar, UserPlus, FileText, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QuickAction {
  label: string;
  icon: React.ElementType;
  variant: 'default' | 'primary' | 'accent';
  onClick?: () => void;
}

const actions: QuickAction[] = [
  { label: 'New Event', icon: Calendar, variant: 'primary' },
  { label: 'Send Campaign', icon: Send, variant: 'accent' },
  { label: 'Add Alumni', icon: UserPlus, variant: 'default' },
  { label: 'AI Query', icon: Sparkles, variant: 'default' },
];

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Button
          key={action.label}
          variant={action.variant === 'default' ? 'outline' : 'default'}
          size="sm"
          className={cn(
            'gap-2',
            action.variant === 'primary' && 'bg-primary hover:bg-primary/90',
            action.variant === 'accent' && 'bg-accent hover:bg-accent/90'
          )}
          onClick={action.onClick}
        >
          <action.icon className="h-4 w-4" />
          {action.label}
        </Button>
      ))}
    </div>
  );
}
