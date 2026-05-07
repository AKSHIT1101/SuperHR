import { Clock, User, Sparkles, CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Task } from '@/types/alumni';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  onComplete?: () => void;
  onClick?: () => void;
}

export function TaskCard({ task, onComplete, onClick }: TaskCardProps) {
  const priorityStyles = {
    high: 'bg-destructive/10 text-destructive border-destructive/20',
    medium: 'bg-warning/10 text-warning border-warning/20',
    low: 'bg-muted text-muted-foreground border-border',
  };

  const statusIcon = task.status === 'completed' ? (
    <CheckCircle2 className="h-5 w-5 text-success" />
  ) : (
    <Circle className="h-5 w-5 text-muted-foreground" />
  );

  return (
    <div
      className={cn(
        'group flex items-start gap-3 rounded-lg border bg-card p-4 transition-all hover:shadow-sm cursor-pointer',
        task.status === 'completed' && 'opacity-60'
      )}
      onClick={onClick}
    >
      <button
        className="mt-0.5 shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onComplete?.();
        }}
      >
        {statusIcon}
      </button>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className={cn(
            'font-medium text-sm',
            task.status === 'completed' && 'line-through'
          )}>
            {task.title}
          </h4>
          {task.isAIGenerated && (
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
          {task.description}
        </p>
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <Badge variant="outline" className={priorityStyles[task.priority]}>
            {task.priority}
          </Badge>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            Due {new Date(task.dueDate).toLocaleDateString()}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            {task.assignedTo}
          </span>
        </div>
      </div>

      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </div>
  );
}
