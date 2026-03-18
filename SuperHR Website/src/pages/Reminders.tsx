import { useState } from 'react';
import { Plus, Bell, Calendar, User, CheckCircle, Sparkles, Edit2, Trash2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { CreateReminderDialog } from '@/components/dialogs/CreateReminderDialog';
import { EditReminderDialog } from '@/components/dialogs/EditReminderDialog';
import { mockTasks } from '@/data/mockData';
import { Task } from '@/types/contact';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const aiReminderSuggestions = [
  'Remind me tomorrow to follow up with everyone who attended the AI webinar',
  'Create a reminder for my team to review low-engagement leads this Friday',
  'Set an urgent reminder to assign post-event follow-ups to managers',
];

export default function Reminders() {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [completingTask, setCompletingTask] = useState<Task | null>(null);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');

  const filteredTasks = tasks.filter((task) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return task.status === 'pending';
    if (activeTab === 'in-progress') return task.status === 'in-progress';
    if (activeTab === 'completed') return task.status === 'completed';
    if (activeTab === 'ai') return task.isAIGenerated;
    if (activeTab === 'self') return !task.isAIGenerated;
    return true;
  });

  const priorityStyles = { high: 'border-l-destructive bg-destructive/5', medium: 'border-l-warning bg-warning/5', low: 'border-l-muted' };
  const priorityBadgeStyles = { high: 'bg-destructive/10 text-destructive', medium: 'bg-warning/10 text-warning', low: 'bg-muted text-muted-foreground' };

  const handleTaskCheck = (task: Task) => { if (task.status !== 'completed') { setCompletingTask(task); setShowCompletionDialog(true); } else { setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: 'pending' as const } : t))); } };
  const handleCompleteTask = (notifyManager: boolean, deleteTask: boolean) => {
    if (!completingTask) return;
    if (deleteTask) { setTasks((prev) => prev.filter((t) => t.id !== completingTask.id)); toast({ title: 'Task Deleted' }); }
    else { setTasks((prev) => prev.map((t) => t.id === completingTask.id ? { ...t, status: 'completed' as const } : t)); toast({ title: 'Task Completed' }); }
    if (notifyManager) toast({ title: 'Manager Notified' });
    setShowCompletionDialog(false); setCompletingTask(null);
  };
  const handleEditTask = (task: Task) => { setEditingTask(task); setShowEditDialog(true); };
  const handleUpdateTask = (updatedTask: Task) => { setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))); toast({ title: 'Updated' }); };
  const handleDeleteTask = (id: string) => { setTasks((prev) => prev.filter((t) => t.id !== id)); toast({ title: 'Deleted' }); };
  const handleSaveReminder = (reminder: any) => { setTasks((prev) => [{ ...reminder, status: 'pending' as const, assignedTo: reminder.assignedTo === 'self' ? 'You' : reminder.assignedTo, createdAt: new Date().toISOString() }, ...prev]); };
  const taskCounts = { all: tasks.length, pending: tasks.filter((t) => t.status === 'pending').length, 'in-progress': tasks.filter((t) => t.status === 'in-progress').length, completed: tasks.filter((t) => t.status === 'completed').length, ai: tasks.filter((t) => t.isAIGenerated).length, self: tasks.filter((t) => !t.isAIGenerated).length };

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground"><Wand2 className="h-4 w-4 text-primary" /> AI-first reminders</div>
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr] lg:items-start">
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">What reminder should AI create?</h1>
              <p className="mt-2 text-muted-foreground">Use natural language first; the structured reminder editor is just for review.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="e.g., Remind my managers to follow up with no-show attendees tomorrow" className="h-12 flex-1" />
              <Button className="h-12 gap-2" onClick={() => setShowCreateDialog(true)}><Sparkles className="h-4 w-4" />Create with AI</Button>
            </div>
          </div>
          <div className="rounded-2xl border bg-muted/40 p-4">
            <p className="text-sm font-medium">Suggested prompts</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {aiReminderSuggestions.map((suggestion) => (
                <Button key={suggestion} variant="outline" size="sm" className="h-auto whitespace-normal text-left" onClick={() => { setAiPrompt(suggestion); setShowCreateDialog(true); }}>{suggestion}</Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-semibold">Reminder queue</h2><p className="text-sm text-muted-foreground">AI suggestions should feel like the primary workflow.</p></div><Button variant="outline" onClick={() => setShowCreateDialog(true)}><Plus className="mr-2 h-4 w-4" />Open editor</Button></div>
      <Card className="nudge-card border-l-4 border-l-primary"><CardContent className="flex items-start gap-3 pt-4"><div className="rounded-lg bg-primary/10 p-2"><Sparkles className="h-5 w-5 text-primary" /></div><div className="flex-1"><h4 className="font-medium">AI-Generated Tasks</h4><p className="mt-1 text-sm text-muted-foreground">Based on engagement patterns, we've suggested {taskCounts.ai} tasks that need attention.</p></div></CardContent></Card>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap"><TabsTrigger value="all" className="gap-2">All <Badge variant="secondary">{taskCounts.all}</Badge></TabsTrigger><TabsTrigger value="self" className="gap-2"><User className="h-3 w-3" />Self <Badge variant="secondary">{taskCounts.self}</Badge></TabsTrigger><TabsTrigger value="ai" className="gap-2"><Sparkles className="h-3 w-3" />AI <Badge variant="secondary">{taskCounts.ai}</Badge></TabsTrigger><TabsTrigger value="pending" className="gap-2">Pending <Badge variant="secondary">{taskCounts.pending}</Badge></TabsTrigger><TabsTrigger value="in-progress" className="gap-2">In Progress <Badge variant="secondary">{taskCounts['in-progress']}</Badge></TabsTrigger><TabsTrigger value="completed" className="gap-2">Completed <Badge variant="secondary">{taskCounts.completed}</Badge></TabsTrigger></TabsList>
        <TabsContent value={activeTab} className="mt-6"><div className="space-y-3">{filteredTasks.map((task) => (
          <div key={task.id} className={cn('rounded-lg border border-l-4 p-4 transition-all hover:shadow-sm', priorityStyles[task.priority], task.status === 'completed' && 'opacity-60')}>
            <div className="flex items-start gap-3">
              <Checkbox checked={task.status === 'completed'} onCheckedChange={() => handleTaskCheck(task)} className="mt-1" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2"><div><h4 className={cn('font-medium', task.status === 'completed' && 'line-through text-muted-foreground')}>{task.title}</h4><p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{task.description}</p></div><div className="flex shrink-0 items-center gap-2"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditTask(task)}><Edit2 className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteTask(task.id)}><Trash2 className="h-4 w-4" /></Button></div></div>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">{task.isAIGenerated ? <Badge variant="outline" className="gap-1"><Sparkles className="h-3 w-3" />AI</Badge> : <Badge variant="outline" className="gap-1"><User className="h-3 w-3" />Self</Badge>}<Badge className={priorityBadgeStyles[task.priority]}>{task.priority}</Badge></div>
                  <div className="flex items-center gap-1"><Calendar className="h-3 w-3" /><span>Due: {new Date(task.dueDate).toLocaleDateString()}</span></div>
                  <div className="flex items-center gap-1"><User className="h-3 w-3" /><span>{task.assignedTo}</span></div>
                  <Badge variant="outline" className="text-xs capitalize">{task.type}</Badge>
                </div>
              </div>
            </div>
          </div>
        ))}{filteredTasks.length === 0 && <div className="flex flex-col items-center justify-center py-12 text-center"><div className="mb-4 rounded-full bg-muted p-4"><Bell className="h-8 w-8 text-muted-foreground" /></div><h3 className="font-semibold">No tasks found</h3><p className="mt-1 text-muted-foreground">Try creating one with AI.</p></div>}</div></TabsContent>
      </Tabs>
      <CreateReminderDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} onSave={handleSaveReminder} />
      <EditReminderDialog task={editingTask} open={showEditDialog} onOpenChange={setShowEditDialog} onSave={handleUpdateTask} />
      <AlertDialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-success" />Complete Task</AlertDialogTitle><AlertDialogDescription>You're marking "{completingTask?.title}" as complete.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter className="flex-col gap-2 sm:flex-row"><AlertDialogCancel>Cancel</AlertDialogCancel><Button variant="outline" onClick={() => handleCompleteTask(true, false)}>Complete & Notify</Button><Button variant="outline" onClick={() => handleCompleteTask(false, true)}>Complete & Delete</Button><AlertDialogAction onClick={() => handleCompleteTask(false, false)}>Just Complete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
