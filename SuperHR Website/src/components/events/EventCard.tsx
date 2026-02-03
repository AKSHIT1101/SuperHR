import { Calendar, MapPin, Users, Mail, MessageCircle, MoreHorizontal, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Event } from '@/types/alumni';
import { cn } from '@/lib/utils';

interface EventCardProps {
  event: Event;
  onClick?: () => void;
}

export function EventCard({ event, onClick }: EventCardProps) {
  const statusStyles = {
    draft: 'bg-muted text-muted-foreground',
    scheduled: 'bg-info/10 text-info',
    ongoing: 'bg-success/10 text-success',
    completed: 'bg-secondary text-secondary-foreground',
    cancelled: 'bg-destructive/10 text-destructive',
  };

  const typeStyles = {
    reunion: 'bg-primary/10 text-primary',
    webinar: 'bg-info/10 text-info',
    meetup: 'bg-success/10 text-success',
    workshop: 'bg-warning/10 text-warning',
    hiring: 'bg-accent/10 text-accent',
    mentoring: 'bg-chart-5/10 text-chart-5',
    other: 'bg-muted text-muted-foreground',
  };

  const confirmationRate = event.invitedCount > 0
    ? Math.round((event.confirmedCount / event.invitedCount) * 100)
    : 0;

  const attendanceRate = event.status === 'completed' && event.confirmedCount > 0
    ? Math.round((event.attendedCount / event.confirmedCount) * 100)
    : 0;

  return (
    <div
      className="group rounded-xl border bg-card overflow-hidden transition-all hover:shadow-md cursor-pointer"
      onClick={onClick}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={cn('capitalize', typeStyles[event.type])}>
                {event.type}
              </Badge>
              <Badge variant="outline" className={statusStyles[event.status]}>
                {event.status}
              </Badge>
              {event.isVirtual && (
                <Badge variant="outline">Virtual</Badge>
              )}
            </div>
            <h3 className="font-semibold mt-2 truncate">{event.title}</h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {event.description}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View Details</DropdownMenuItem>
              <DropdownMenuItem>Edit Event</DropdownMenuItem>
              <DropdownMenuItem>Send Invites</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">Cancel Event</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>{new Date(event.date).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 shrink-0" />
            <span>{event.time}</span>
          </div>
          <div className="flex items-center gap-1.5 truncate col-span-2">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Confirmation Rate</span>
              <span className="font-medium">{confirmationRate}%</span>
            </div>
            <Progress value={confirmationRate} className="h-2" />
          </div>

          {event.status === 'completed' && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Attendance Rate</span>
                <span className="font-medium">{attendanceRate}%</span>
              </div>
              <Progress value={attendanceRate} className="h-2" />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{event.confirmedCount}/{event.invitedCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Mail className="h-4 w-4" />
              <span>{event.emailsOpened}/{event.emailsSent}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4" />
              <span>{event.whatsappRead}/{event.whatsappSent}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
