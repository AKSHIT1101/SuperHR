import { Sparkles, AlertTriangle, TrendingUp, Lightbulb, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AIInsight } from '@/types/alumni';
import { cn } from '@/lib/utils';

interface AIInsightCardProps {
  insight: AIInsight;
  onAction?: () => void;
  onDismiss?: () => void;
}

export function AIInsightCard({ insight, onAction, onDismiss }: AIInsightCardProps) {
  const typeConfig = {
    engagement: {
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success/5',
      borderColor: 'border-l-success',
    },
    opportunity: {
      icon: Lightbulb,
      color: 'text-info',
      bgColor: 'bg-info/5',
      borderColor: 'border-l-info',
    },
    warning: {
      icon: AlertTriangle,
      color: 'text-warning',
      bgColor: 'bg-warning/5',
      borderColor: 'border-l-warning',
    },
    suggestion: {
      icon: Sparkles,
      color: 'text-primary',
      bgColor: 'bg-primary/5',
      borderColor: 'border-l-primary',
    },
  };

  const config = typeConfig[insight.type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'relative rounded-lg border border-l-4 p-4 transition-all hover:shadow-sm',
        config.bgColor,
        config.borderColor
      )}
    >
      <div className="flex gap-3">
        <div className={cn('mt-0.5', config.color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm">{insight.title}</h4>
          <p className="text-sm text-muted-foreground mt-1">{insight.description}</p>
          {insight.actionLabel && (
            <Button
              variant="link"
              size="sm"
              className={cn('p-0 h-auto mt-2', config.color)}
              onClick={onAction}
            >
              {insight.actionLabel}
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 opacity-50 hover:opacity-100"
          onClick={onDismiss}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
