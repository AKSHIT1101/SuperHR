import { useMemo, useState } from 'react';
import { Bell, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

type AssignableUser = { id: string; name: string; role: 'admin' | 'manager' | 'user'; email?: string };

interface CreateReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignableUsers?: AssignableUser[];
  canAssignToOthers?: boolean;
  onSave?: (reminder: {
    title: string;
    description?: string;
    due_at?: string | null;
    assigned_to?: string | null;
  }) => void;
}

export function CreateReminderDialog({
  open,
  onOpenChange,
  onSave,
  assignableUsers = [],
  canAssignToOthers = false,
}: CreateReminderDialogProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    dueTime: '',
    assignToSelf: true,
    assignedTo: '',
  });

  const updateForm = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const dueAtIso = useMemo(() => {
    if (!formData.dueDate) return null;
    const time = formData.dueTime || '09:00';
    // Local time → ISO string (backend stores TIMESTAMP).
    const dt = new Date(`${formData.dueDate}T${time}:00`);
    if (Number.isNaN(dt.getTime())) return null;
    return dt.toISOString();
  }, [formData.dueDate, formData.dueTime]);

  const handleSubmit = () => {
    if (!formData.title || !formData.dueDate) {
      toast({ title: 'Validation Error', description: 'Please fill in title and due date', variant: 'destructive' });
      return;
    }

    onSave?.({
      title: formData.title,
      description: formData.description || undefined,
      due_at: dueAtIso,
      assigned_to: formData.assignToSelf ? null : formData.assignedTo || null,
    });
    onOpenChange(false);
    setFormData({ title: '', description: '', dueDate: '', dueTime: '', assignToSelf: true, assignedTo: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-[1200px] h-[92vh] p-0">
        <div className="dialog-shell">
          <DialogHeader className="dialog-header-tight">
            <DialogTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Create Reminder</DialogTitle>
            <DialogDescription>Create a reminder and optionally assign it.</DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-full">
            <div className="space-y-4 p-6 pb-6">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" value={formData.title} onChange={(e) => updateForm('title', e.target.value)} placeholder="e.g., Follow up with Dr. Kumar about mentoring" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={formData.description} onChange={(e) => updateForm('description', e.target.value)} placeholder="Add details about this reminder..." rows={4} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date *</Label>
                  <Input id="dueDate" type="date" value={formData.dueDate} onChange={(e) => updateForm('dueDate', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueTime">Time (optional)</Label>
                  <Input id="dueTime" type="time" value={formData.dueTime} onChange={(e) => updateForm('dueTime', e.target.value)} />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-2xl border bg-muted/30 px-4 py-3">
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
                  disabled={!canAssignToOthers}
                />
              </div>
              {!canAssignToOthers && (
                <p className="text-xs text-muted-foreground">
                  Assigning reminders to other users requires admin access.
                </p>
              )}

              {!formData.assignToSelf && canAssignToOthers && (
                <div className="space-y-2">
                  <Label htmlFor="assignedTo">Assign To</Label>
                  <Select value={formData.assignedTo} onValueChange={(v) => updateForm('assignedTo', v)}>
                    <SelectTrigger><SelectValue placeholder="Select team member" /></SelectTrigger>
                    <SelectContent>
                      {assignableUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>{user.name} ({user.role})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="dialog-footer-bar flex justify-end gap-3"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={handleSubmit}>Create Reminder</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
