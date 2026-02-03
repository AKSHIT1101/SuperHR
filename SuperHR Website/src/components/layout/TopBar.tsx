import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Search, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { mockTasks } from '@/data/mockData';

export function TopBar() {
  const navigate = useNavigate();
  
  // Only show self-generated reminders in notifications
  const selfReminders = mockTasks
    .filter((t) => !t.isAIGenerated && t.status !== 'completed')
    .slice(0, 5)
    .map((t) => ({
      id: t.id,
      type: t.priority === 'high' ? 'warning' : 'info',
      message: t.title,
      time: `Due: ${new Date(t.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    }));

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-card px-4 lg:px-6">
      <SidebarTrigger className="-ml-1" />
      
      <div className="flex flex-1 items-center gap-4">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search alumni, events, or type a query..."
            className="pl-9 bg-muted/50 border-0 focus-visible:ring-1"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              {selfReminders.length > 0 && (
                <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center bg-accent text-accent-foreground">
                  {selfReminders.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>My Reminders</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {selfReminders.length > 0 ? (
              selfReminders.map((reminder) => (
                <DropdownMenuItem 
                  key={reminder.id} 
                  className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                  onClick={() => navigate('/reminders')}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        reminder.type === 'warning' ? 'bg-warning' : 'bg-info'
                      }`}
                    />
                    <span className="font-medium text-sm">{reminder.message}</span>
                  </div>
                  <span className="text-xs text-muted-foreground pl-4">{reminder.time}</span>
                </DropdownMenuItem>
              ))
            ) : (
              <DropdownMenuItem disabled className="text-center text-muted-foreground">
                No pending reminders
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="justify-center text-primary cursor-pointer"
              onClick={() => navigate('/reminders')}
            >
              View all reminders
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
