import { useState } from 'react';
import { Bell, Calendar, User, Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { mockUsers } from '@/data/mockData';

interface CreateReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (reminder: any) => void;
}

const aiReminderPrompts = [
  'Remind me tomorrow to follow up with attendees from the AI webinar',
  'Create a high priority reminder for my manager to review no-show contacts',
  'Set a medium priority task for Friday to clean up inactive leads',
];

export function CreateReminderDialog({ open, onOpenChange, onSave }: CreateReminderDialogProps) {
  const { toast } = useToast();
  const [aiPrompt, setAiPrompt] = useState('');
  const [lastAiPrompt, setLastAiPrompt] = useState('');
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

  const runAiPrefill = (prompt = aiPrompt) => {
    if (!prompt.trim()) {
      toast({ title: 'Add an instruction', description: 'Tell AI what reminder to prepare.', variant: 'destructive' });
      return;
    }

    const lowerPrompt = prompt.toLowerCase();
    setFormData({
      title: prompt.length > 60 ? `${prompt.slice(0, 60)}…` : prompt,
      description: `AI prepared from: ${prompt}`,
      type: lowerPrompt.includes('event') ? 'event' : lowerPrompt.includes('update') ? 'update' : lowerPrompt.includes('outreach') ? 'outreach' : 'follow-up',
      priority: lowerPrompt.includes('urgent') || lowerPrompt.includes('high') ? 'high' : lowerPrompt.includes('low') ? 'low' : 'medium',
      dueDate: new Date().toISOString().split('T')[0],
      dueTime: '09:00',
      assignToSelf: !lowerPrompt.includes('manager') && !lowerPrompt.includes('team'),
      assignedTo: lowerPrompt.includes('manager') ? mockUsers[0]?.id || '' : '',
      relatedAlumni: '',
      relatedEvent: '',
    });
    setLastAiPrompt(prompt);
    toast({ title: 'AI draft ready', description: 'Reminder fields were prefilled for review.' });
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.dueDate) {
      toast({ title: 'Validation Error', description: 'Please fill in title and due date', variant: 'destructive' });
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
      isAIGenerated: true,
      createdAt: new Date().toISOString(),
    };

    onSave?.(reminder);
    toast({ title: 'Success', description: 'Reminder created successfully' });
    onOpenChange(false);
    setAiPrompt('');
    setLastAiPrompt('');
    setFormData({ title: '', description: '', type: 'follow-up', priority: 'medium', dueDate: '', dueTime: '', assignToSelf: true, assignedTo: '', relatedAlumni: '', relatedEvent: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-[1200px] h-[92vh] p-0">
        <div className="dialog-shell">
          <DialogHeader className="dialog-header-tight">
            <DialogTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Create Reminder</DialogTitle>
            <DialogDescription>Start with AI, then fine-tune if needed.</DialogDescription>
          </DialogHeader>

          <div className="dialog-body-scroll grid min-h-0 lg:grid-cols-[1fr_0.95fr]">
            <div className="border-b p-6 lg:border-b-0 lg:border-r">
              <div className="space-y-5">
                <div className="rounded-3xl border bg-muted/40 p-5">
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground"><Wand2 className="h-4 w-4 text-primary" /> AI reminder command</div>
                  <h3 className="text-2xl font-semibold">Tell AI what needs to happen.</h3>
                  <p className="mt-2 text-sm text-muted-foreground">AI will turn your request into a ready-to-review reminder.</p>
                  <div className="mt-4 flex flex-col gap-3">
                    <Input value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="e.g., Remind me to follow up with attendees tomorrow morning" className="h-12" />
                    <Button className="h-12 gap-2" onClick={() => runAiPrefill()}><Sparkles className="h-4 w-4" />Generate reminder draft</Button>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {aiReminderPrompts.map((prompt) => (
                      <Button key={prompt} variant="outline" size="sm" className="h-auto whitespace-normal text-left" onClick={() => { setAiPrompt(prompt); runAiPrefill(prompt); }}>{prompt}</Button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border bg-card p-4">
                  <p className="text-sm font-medium">Last AI prompt</p>
                  <p className="mt-2 text-sm text-muted-foreground">{lastAiPrompt || 'No AI prompt yet.'}</p>
                </div>
              </div>
            </div>

            <ScrollArea className="h-full">
              <div className="space-y-4 p-6 pb-6">
                <div className="space-y-2"><Label htmlFor="title">Title *</Label><Input id="title" value={formData.title} onChange={(e) => updateForm('title', e.target.value)} placeholder="e.g., Follow up with Dr. Kumar about mentoring" /></div>
                <div className="space-y-2"><Label htmlFor="description">Description</Label><Textarea id="description" value={formData.description} onChange={(e) => updateForm('description', e.target.value)} placeholder="Add details about this reminder..." rows={4} /></div>
                <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="type">Type</Label><Select value={formData.type} onValueChange={(v) => updateForm('type', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="follow-up">Follow-up</SelectItem><SelectItem value="outreach">Outreach</SelectItem><SelectItem value="reminder">General Reminder</SelectItem><SelectItem value="event">Event Related</SelectItem><SelectItem value="update">Data Update</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label htmlFor="priority">Priority</Label><Select value={formData.priority} onValueChange={(v) => updateForm('priority', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select></div></div>
                <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="dueDate">Due Date *</Label><Input id="dueDate" type="date" value={formData.dueDate} onChange={(e) => updateForm('dueDate', e.target.value)} /></div><div className="space-y-2"><Label htmlFor="dueTime">Time (optional)</Label><Input id="dueTime" type="time" value={formData.dueTime} onChange={(e) => updateForm('dueTime', e.target.value)} /></div></div>
                <div className="flex items-center justify-between rounded-2xl border bg-muted/30 px-4 py-3"><div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /><div><Label>Assign to myself</Label><p className="text-xs text-muted-foreground">This reminder is for you</p></div></div><Switch checked={formData.assignToSelf} onCheckedChange={(v) => updateForm('assignToSelf', v)} /></div>
                {!formData.assignToSelf && <div className="space-y-2"><Label htmlFor="assignedTo">Assign To</Label><Select value={formData.assignedTo} onValueChange={(v) => updateForm('assignedTo', v)}><SelectTrigger><SelectValue placeholder="Select team member" /></SelectTrigger><SelectContent>{mockUsers.map((user) => (<SelectItem key={user.id} value={user.id}>{user.name} ({user.role})</SelectItem>))}</SelectContent></Select></div>}
              </div>
            </ScrollArea>
          </div>

          <div className="dialog-footer-bar flex justify-end gap-3"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={handleSubmit}>Create Reminder</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
