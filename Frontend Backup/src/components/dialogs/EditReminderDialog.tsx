import { useMemo, useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
type AssignableUser = { id: string; name: string; role: 'admin' | 'manager' | 'user'; email?: string };

interface EditReminderDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignableUsers?: AssignableUser[];
  canAssignToOthers?: boolean;
  onSave?: (update: {
    title?: string;
    description?: string;
    due_at?: string | null;
    is_done?: boolean;
    assigned_to?: string | null;
  }) => void;
}

export function EditReminderDialog({
  task,
  open,
  onOpenChange,
  onSave,
  assignableUsers = [],
  canAssignToOthers = false,
}: EditReminderDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    status: 'pending',
    dueTime: '',
    assignToSelf: true,
    assignedToId: '',
  });

  useEffect(() => {
    if (task) {
      const anyTask = task as any;
      const dueAt = anyTask._dueAtIso ? new Date(anyTask._dueAtIso) : (task.dueDate ? new Date(task.dueDate) : null);
      const dueDate = dueAt && !Number.isNaN(dueAt.getTime()) ? dueAt.toISOString().slice(0, 10) : task.dueDate;
      const dueTime = dueAt && !Number.isNaN(dueAt.getTime()) ? dueAt.toISOString().slice(11, 16) : '';

      setFormData({
        title: task.title,
        description: task.description,
        dueDate,
        status: task.status,
        dueTime,
        assignToSelf: !anyTask._assignedToUserId,
        assignedToId: anyTask._assignedToUserId ? String(anyTask._assignedToUserId) : '',
      });
    }
  }, [task]);

  const updateForm = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const dueAtIso = useMemo(() => {
    if (!formData.dueDate) return null;
    const time = formData.dueTime || '09:00';
    const dt = new Date(`${formData.dueDate}T${time}:00`);
    if (Number.isNaN(dt.getTime())) return null;
    return dt.toISOString();
  }, [formData.dueDate, formData.dueTime]);

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
      onSave?.({
        title: formData.title,
        description: formData.description,
        due_at: dueAtIso,
        is_done: formData.status === 'completed',
        assigned_to: formData.assignToSelf ? null : formData.assignedToId || null,
      });
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dueTime">Time (optional)</Label>
              <Input
                id="dueTime"
                type="time"
                value={formData.dueTime}
                onChange={(e) => updateForm('dueTime', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select
                value={formData.assignToSelf ? 'self' : formData.assignedToId}
                onValueChange={(v) => {
                  if (v === 'self') {
                    updateForm('assignToSelf', true);
                    updateForm('assignedToId', '');
                  } else {
                    updateForm('assignToSelf', false);
                    updateForm('assignedToId', v);
                  }
                }}
                disabled={!canAssignToOthers}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Self" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">Self</SelectItem>
                  {assignableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
