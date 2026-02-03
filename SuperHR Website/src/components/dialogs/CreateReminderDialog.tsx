import { useState } from 'react';
import { Bell, Calendar, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { mockUsers } from '@/data/mockData';

interface CreateReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (reminder: any) => void;
}

export function CreateReminderDialog({ open, onOpenChange, onSave }: CreateReminderDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'follow-up',
    priority: 'medium',
    dueDate: '',
    dueTime: '',
    assignToSelf: true,
    assignedTo: '',
    relatedAlumni: '',
    relatedEvent: '',
  });

  const updateForm = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.dueDate) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in title and due date',
        variant: 'destructive',
      });
      return;
    }

    const reminder = {
      id: crypto.randomUUID(),
      title: formData.title,
      description: formData.description,
      type: formData.type,
      priority: formData.priority,
      dueDate: formData.dueDate,
      dueTime: formData.dueTime,
      assignedTo: formData.assignToSelf ? 'self' : formData.assignedTo,
      status: 'pending',
      isAIGenerated: false,
      createdAt: new Date().toISOString(),
    };

    onSave?.(reminder);
    toast({ title: 'Success', description: 'Reminder created successfully' });
    onOpenChange(false);

    // Reset form
    setFormData({
      title: '',
      description: '',
      type: 'follow-up',
      priority: 'medium',
      dueDate: '',
      dueTime: '',
      assignToSelf: true,
      assignedTo: '',
      relatedAlumni: '',
      relatedEvent: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Create Reminder
          </DialogTitle>
          <DialogDescription>
            Set up a reminder for yourself or assign it to a team member.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 px-6">
          <div className="space-y-4 pb-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => updateForm('title', e.target.value)}
                placeholder="e.g., Follow up with Dr. Kumar about mentoring"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => updateForm('description', e.target.value)}
                placeholder="Add details about this reminder..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={formData.type} onValueChange={(v) => updateForm('type', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="follow-up">Follow-up</SelectItem>
                    <SelectItem value="outreach">Outreach</SelectItem>
                    <SelectItem value="reminder">General Reminder</SelectItem>
                    <SelectItem value="event">Event Related</SelectItem>
                    <SelectItem value="update">Data Update</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(v) => updateForm('priority', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date *</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => updateForm('dueDate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueTime">Time (optional)</Label>
                <Input
                  id="dueTime"
                  type="time"
                  value={formData.dueTime}
                  onChange={(e) => updateForm('dueTime', e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label>Assign to myself</Label>
                  <p className="text-xs text-muted-foreground">This reminder is for you</p>
                </div>
              </div>
              <Switch
                checked={formData.assignToSelf}
                onCheckedChange={(v) => updateForm('assignToSelf', v)}
              />
            </div>

            {!formData.assignToSelf && (
              <div className="space-y-2">
                <Label htmlFor="assignedTo">Assign To</Label>
                <Select value={formData.assignedTo} onValueChange={(v) => updateForm('assignedTo', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-3 p-6 pt-4 border-t shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Create Reminder</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
