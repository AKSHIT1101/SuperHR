import { useState, useEffect } from 'react';
import { Bell, Calendar, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
import { Task } from '@/types/alumni';
import { mockUsers } from '@/data/mockData';

interface EditReminderDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (task: Task) => void;
}

export function EditReminderDialog({ task, open, onOpenChange, onSave }: EditReminderDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'follow-up',
    priority: 'medium',
    dueDate: '',
    status: 'pending',
    assignedTo: '',
  });

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description,
        type: task.type,
        priority: task.priority,
        dueDate: task.dueDate,
        status: task.status,
        assignedTo: task.assignedTo,
      });
    }
  }, [task]);

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

    if (task) {
      const updatedTask: Task = {
        ...task,
        title: formData.title,
        description: formData.description,
        type: formData.type as Task['type'],
        priority: formData.priority as Task['priority'],
        dueDate: formData.dueDate,
        status: formData.status as Task['status'],
        assignedTo: formData.assignedTo,
      };

      onSave?.(updatedTask);
      onOpenChange(false);
    }
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Edit Reminder
          </DialogTitle>
          <DialogDescription>
            Update the reminder details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
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
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(v) => updateForm('status', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignedTo">Assigned To</Label>
            <Select value={formData.assignedTo} onValueChange={(v) => updateForm('assignedTo', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="You">Self</SelectItem>
                <SelectItem value="HR Team">HR Team</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="HR Manager">HR Manager</SelectItem>
                {mockUsers.map((user) => (
                  <SelectItem key={user.id} value={user.name}>
                    {user.name} ({user.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
