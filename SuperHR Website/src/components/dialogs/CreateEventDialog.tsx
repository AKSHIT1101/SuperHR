import { useEffect, useMemo, useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Event, EventAttendee, AudienceSegment } from '@/types/contact';
import { PersonSelector } from './PersonSelector';

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: Array<{ id: string; firstName: string; lastName: string; email?: string; phone?: string }>;
  segments: Array<{ id: string; name: string; memberCount: number }>;
  initialForm?: Partial<{
    title: string;
    description: string;
    location: string;
    date: string;
    time: string;
    type: Event['type'];
    isVirtual: boolean;
    capacity: string;
    status: 'draft' | 'scheduled' | 'completed' | 'cancelled';
  }>;
  initialSelectedSegments?: string[];
  initialSelectedIndividuals?: string[];
  initialStep?: 'details' | 'attendees';
  aiPrompt?: string | null;
  aiQueryPlan?: unknown;
  onSave?: (payload: {
    name: string;
    description?: string;
    location?: string;
    event_date?: string | null;
    status?: 'draft' | 'scheduled' | 'completed' | 'cancelled';
    segment_ids: number[];
    contact_ids: number[];
    prompt?: string;
    query_plan?: unknown;
  }) => void;
}

export function CreateEventDialog({
  open,
  onOpenChange,
  onSave,
  contacts,
  segments,
  initialForm,
  initialSelectedSegments,
  initialSelectedIndividuals,
  initialStep,
  aiPrompt,
  aiQueryPlan,
}: CreateEventDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<'details' | 'attendees'>('details');
  const [formData, setFormData] = useState({
    title: '', description: '', type: 'meetup' as Event['type'],
    date: '', time: '', location: '', isVirtual: false, capacity: '',
    status: 'draft' as 'draft' | 'scheduled' | 'completed' | 'cancelled',
  });
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const [selectedIndividuals, setSelectedIndividuals] = useState<string[]>([]);
  const [aiPromptState, setAiPromptState] = useState<string | null>(null);
  const [aiQueryPlanState, setAiQueryPlanState] = useState<unknown>(null);

  const updateForm = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', type: 'meetup', date: '', time: '', location: '', isVirtual: false, capacity: '', status: 'draft' });
    setSelectedSegments([]);
    setSelectedIndividuals([]);
    setStep('details');
    setAiPromptState(null);
    setAiQueryPlanState(null);
  };

  const allAttendeeIds = useMemo(() => {
    return [...new Set([...selectedIndividuals])];
  }, [selectedIndividuals]);

  const estimatedSegmentMembers = useMemo(() => {
    const byId = new Map(segments.map((s) => [s.id, s.memberCount] as const));
    return selectedSegments.reduce((sum, sid) => sum + (byId.get(sid) ?? 0), 0);
  }, [selectedSegments, segments]);

  useEffect(() => {
    if (!open) return;

    const derivedIsVirtual =
      initialForm?.isVirtual ??
      (initialForm?.location
        ? initialForm.location.toLowerCase().includes('zoom') || initialForm.location.toLowerCase().includes('meet')
        : false);

    setFormData({
      title: initialForm?.title ?? '',
      description: initialForm?.description ?? '',
      type: initialForm?.type ?? ('meetup' as Event['type']),
      date: initialForm?.date ?? '',
      time: initialForm?.time ?? '',
      location: initialForm?.location ?? '',
      isVirtual: derivedIsVirtual,
      capacity: initialForm?.capacity ?? '',
      status: initialForm?.status ?? 'draft',
    });
    setSelectedSegments(initialSelectedSegments ?? []);
    setSelectedIndividuals(initialSelectedIndividuals ?? []);
    setStep(initialStep ?? 'details');
    setAiPromptState(aiPrompt ?? null);
    setAiQueryPlanState(aiQueryPlan ?? null);
  }, [
    open,
    initialForm,
    initialSelectedSegments,
    initialSelectedIndividuals,
    initialStep,
    aiPrompt,
    aiQueryPlan,
  ]);

  const handleNext = () => {
    if (!formData.title || !formData.date || !formData.time || !formData.location) {
      toast({ title: 'Validation Error', description: 'Please fill in required fields', variant: 'destructive' });
      return;
    }
    setStep('attendees');
  };

  const handleSubmit = () => {
    const attendees: EventAttendee[] = allAttendeeIds.map((id) => {
      const contact = contacts.find((a) => a.id === id);
      return { contactId: id, name: contact ? `${contact.firstName} ${contact.lastName}` : 'Unknown', email: contact?.email || '', inviteSent: false, confirmed: false, attended: false, addedLater: false };
    });

    const dt = new Date(`${formData.date}T${formData.time}:00`);
    const eventDateIso = Number.isNaN(dt.getTime()) ? null : dt.toISOString();
    onSave?.({
      name: formData.title,
      description: formData.description || undefined,
      location: formData.location || undefined,
      event_date: eventDateIso,
      status: formData.status,
      segment_ids: selectedSegments.map((s) => Number(s)).filter((n) => Number.isFinite(n)),
      contact_ids: allAttendeeIds.map((id) => Number(id)).filter((n) => Number.isFinite(n)),
      prompt: aiPromptState || undefined,
      query_plan: aiQueryPlanState ?? undefined,
    });
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="w-[96vw] max-w-[1500px] h-[92vh] p-0">
        <div className="dialog-shell">
          <DialogHeader className="dialog-header-tight">
            <DialogTitle>{step === 'details' ? 'Create Event' : 'Select Attendees'}</DialogTitle>
            <DialogDescription>{step === 'details' ? 'Enter event details, then select invitees.' : 'Select segments and individuals for the invite list.'}</DialogDescription>
          </DialogHeader>

          <div className="dialog-body-scroll">
            {step === 'details' ? (
              <div className="grid min-h-0 h-full lg:grid-cols-[1.05fr_0.95fr]">
                <div className="border-b p-6 lg:border-b-0 lg:border-r">
                  <div className="space-y-5">
                    <div className="rounded-3xl border bg-muted/40 p-5">
                      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground"><Upload className="h-4 w-4 text-primary" /> Manual creation</div>
                      <h3 className="text-2xl font-semibold">Enter the event details.</h3>
                      <p className="mt-2 text-sm text-muted-foreground">You’ll pick attendees in the next step.</p>
                    </div>
                  </div>
                </div>

                <ScrollArea className="h-full">
                  <div className="space-y-4 p-6">
                    <div className="space-y-2">
                      <Label htmlFor="title">Event Title *</Label>
                      <Input id="title" value={formData.title} onChange={(e) => updateForm('title', e.target.value)} placeholder="e.g., Annual Conference 2024" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" value={formData.description} onChange={(e) => updateForm('description', e.target.value)} placeholder="Describe the event..." rows={4} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Event Type</Label>
                        <Select value={formData.type} onValueChange={(v) => updateForm('type', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="conference">Conference</SelectItem>
                            <SelectItem value="webinar">Webinar</SelectItem>
                            <SelectItem value="meetup">Meetup</SelectItem>
                            <SelectItem value="workshop">Workshop</SelectItem>
                            <SelectItem value="networking">Networking</SelectItem>
                            <SelectItem value="training">Training</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Capacity</Label>
                        <Input type="number" value={formData.capacity} onChange={(e) => updateForm('capacity', e.target.value)} placeholder="e.g., 100" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Date *</Label>
                        <Input type="date" value={formData.date} onChange={(e) => updateForm('date', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Time *</Label>
                        <Input type="time" value={formData.time} onChange={(e) => updateForm('time', e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Location *</Label>
                      <Input value={formData.location} onChange={(e) => updateForm('location', e.target.value)} placeholder={formData.isVirtual ? 'e.g., Zoom, Google Meet' : 'e.g., Convention Center'} />
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border bg-muted/30 px-4 py-3">
                      <div>
                        <Label>Virtual Event</Label>
                        <p className="text-sm text-muted-foreground">Toggle if this event will be held online.</p>
                      </div>
                      <Switch checked={formData.isVirtual} onCheckedChange={(v) => updateForm('isVirtual', v)} />
                    </div>
                    <div className="rounded-2xl border bg-card p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Prefilled attendees</p>
                        <Badge variant="secondary">{estimatedSegmentMembers + allAttendeeIds.length}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">You’ll select the attendee list next.</p>
                    </div>
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col p-6 pt-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">Select Attendees</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Choose segments and/or individuals for the invite list.</p>
                  </div>
                  <Badge variant="secondary">{estimatedSegmentMembers + selectedIndividuals.length} total</Badge>
                </div>

                <div className="min-h-0 flex-1 grid gap-4 lg:grid-cols-[1fr_320px]">
                  <div className="min-h-0">
                    <PersonSelector
                      selectedSegments={selectedSegments}
                      selectedIndividuals={selectedIndividuals}
                      onSegmentsChange={setSelectedSegments}
                      onIndividualsChange={setSelectedIndividuals}
                      audienceSegments={segments.map((s) => ({
                        id: s.id,
                        name: s.name,
                        description: '',
                        filters: {},
                        memberIds: [],
                        memberCount: s.memberCount,
                        createdAt: '',
                        createdBy: '',
                        updatedAt: '',
                      }))}
                      contacts={contacts}
                      className="h-full min-h-0"
                    />
                  </div>

                  <div className="min-h-0 flex flex-col gap-3">
                    <div className="rounded-2xl border bg-card p-4">
                      <p className="text-sm font-medium">Invite list</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {selectedIndividuals.length} individuals selected directly.
                      </p>
                      {selectedSegments.length > 0 && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {selectedSegments.length} segments selected ({estimatedSegmentMembers} estimated members).
                        </p>
                      )}
                    </div>

                    <div className="rounded-2xl border bg-muted/40 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Total attendees</p>
                        <Badge variant="secondary">{estimatedSegmentMembers + selectedIndividuals.length}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {selectedSegments.length} segments + {selectedIndividuals.length} individuals selected.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="dialog-footer-bar flex justify-between gap-3">
            {step === 'attendees' ? <Button variant="outline" onClick={() => setStep('details')}>Back</Button> : <div />}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>Cancel</Button>
              {step === 'details' ? <Button onClick={handleNext}>Next: Review Attendees</Button> : <Button onClick={handleSubmit}>Create Event ({estimatedSegmentMembers + selectedIndividuals.length})</Button>}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
