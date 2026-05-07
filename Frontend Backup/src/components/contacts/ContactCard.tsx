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
import { Contact } from '@/types/contact';
import { cn } from '@/lib/utils';

interface ContactCardProps {
  contact: Contact;
  onClick?: () => void;
}

export function ContactCard({ contact, onClick }: ContactCardProps) {
  const statusStyles = {
    active: 'status-active',
    inactive: 'status-inactive',
    lead: 'bg-info/10 text-info border-info/20',
    pending: 'status-pending',
  };

  const engagementStyles = {
    high: 'bg-success text-success-foreground',
    medium: 'bg-warning text-warning-foreground',
    low: 'bg-muted text-muted-foreground',
    none: 'bg-destructive/20 text-destructive',
  };

  const initials = `${contact.firstName[0]}${contact.lastName[0]}`;

  return (
    <div
      className="group rounded-xl border bg-card p-5 transition-all hover:shadow-md cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        <Avatar className="h-14 w-14 shrink-0">
          <AvatarImage src={contact.photo} alt={`${contact.firstName} ${contact.lastName}`} />
          <AvatarFallback className="text-lg font-medium">{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold truncate">
                {contact.firstName} {contact.lastName}
              </h3>
              <p className="text-sm text-muted-foreground">
                {contact.designation} • {contact.department}
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
            <Badge variant="outline" className={statusStyles[contact.status]}>
              {contact.status}
            </Badge>
            <Badge className={cn('capitalize', engagementStyles[contact.engagementLevel])}>
              {contact.engagementLevel} engagement
            </Badge>
            <Badge variant="outline" className="capitalize">
              {contact.type}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5 truncate">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{contact.email}</span>
            </div>
            {contact.currentOrganization && (
              <div className="flex items-center gap-1.5 truncate">
                <Briefcase className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{contact.currentOrganization}</span>
              </div>
            )}
            {contact.currentCity && (
              <div className="flex items-center gap-1.5 truncate">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{contact.currentCity}, {contact.currentCountry}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>{contact.tenure} years</span>
            </div>
          </div>

          {contact.tags.length > 0 && (
            <div className="flex gap-1.5 mt-3 flex-wrap">
              {contact.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {contact.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{contact.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
