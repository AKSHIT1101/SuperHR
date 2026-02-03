import { Mail, Phone, MapPin, Briefcase, Calendar, MoreHorizontal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alumni } from '@/types/alumni';
import { cn } from '@/lib/utils';

interface AlumniCardProps {
  alumni: Alumni;
  onClick?: () => void;
}

export function AlumniCard({ alumni, onClick }: AlumniCardProps) {
  const statusStyles = {
    active: 'status-active',
    inactive: 'status-inactive',
    rejoined: 'bg-info/10 text-info border-info/20',
    pending: 'status-pending',
  };

  const engagementStyles = {
    high: 'bg-success text-success-foreground',
    medium: 'bg-warning text-warning-foreground',
    low: 'bg-muted text-muted-foreground',
    none: 'bg-destructive/20 text-destructive',
  };

  const initials = `${alumni.firstName[0]}${alumni.lastName[0]}`;

  return (
    <div
      className="group rounded-xl border bg-card p-5 transition-all hover:shadow-md cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        <Avatar className="h-14 w-14 shrink-0">
          <AvatarImage src={alumni.photo} alt={`${alumni.firstName} ${alumni.lastName}`} />
          <AvatarFallback className="text-lg font-medium">{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold truncate">
                {alumni.firstName} {alumni.lastName}
              </h3>
              <p className="text-sm text-muted-foreground">
                {alumni.designation} • {alumni.department}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>View Profile</DropdownMenuItem>
                <DropdownMenuItem>Send Email</DropdownMenuItem>
                <DropdownMenuItem>Send WhatsApp</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Edit</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">Remove</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Badge variant="outline" className={statusStyles[alumni.status]}>
              {alumni.status}
            </Badge>
            <Badge className={cn('capitalize', engagementStyles[alumni.engagementLevel])}>
              {alumni.engagementLevel} engagement
            </Badge>
            <Badge variant="outline" className="capitalize">
              {alumni.type}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5 truncate">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{alumni.email}</span>
            </div>
            {alumni.currentOrganization && (
              <div className="flex items-center gap-1.5 truncate">
                <Briefcase className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{alumni.currentOrganization}</span>
              </div>
            )}
            {alumni.currentCity && (
              <div className="flex items-center gap-1.5 truncate">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{alumni.currentCity}, {alumni.currentCountry}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>{alumni.yearsOfService} years service</span>
            </div>
          </div>

          {alumni.tags.length > 0 && (
            <div className="flex gap-1.5 mt-3 flex-wrap">
              {alumni.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {alumni.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{alumni.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
