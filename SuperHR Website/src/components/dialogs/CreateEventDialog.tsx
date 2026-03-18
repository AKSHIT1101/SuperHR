import { useMemo, useState } from 'react';
import { Wand2, Sparkles, Upload } from 'lucide-react';
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
import { mockContacts } from '@/data/mockData';
import { PersonSelector } from './PersonSelector';

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (event: Event) => void;
}

const audienceSegments: AudienceSegment[] = [
  { id: '1', name: 'Bangalore Contacts', description: '', filters: {}, memberIds: ['1', '5'], memberCount: 2, createdAt: '', createdBy: '', updatedAt: '' },
  { id: '2', name: 'Technology Leaders', description: '', filters: {}, memberIds: ['1'], memberCount: 1, createdAt: '', createdBy: '', updatedAt: '' },
  { id: '3', name: 'High Engagement', description: '', filters: {}, memberIds: ['1', '4'], memberCount: 2, createdAt: '', createdBy: '', updatedAt: '' },
  { id: '4', name: 'Available Consultants', description: '', filters: {}, memberIds: ['1', '2', '4', '5'], memberCount: 4, createdAt: '', createdBy: '', updatedAt: '' },
];

const quickPrompts = [
  'Host a Bangalore founders meetup next Thursday evening and invite high-engagement contacts',
  'Create a virtual AI webinar for technology leaders and prefill the best attendees',
  'Plan a workshop for medium-engagement Mumbai leads with 40 seats',
];

export function CreateEventDialog({ open, onOpenChange, onSave }: CreateEventDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<'details' | 'attendees'>('details');
  const [aiPrompt, setAiPrompt] = useState('');
  const [lastAiPrompt, setLastAiPrompt] = useState('');
  const [formData, setFormData] = useState({
    title: '', description: '', type: 'meetup' as Event['type'],
    date: '', time: '', location: '', isVirtual: false, capacity: '',
  });
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const [selectedIndividuals, setSelectedIndividuals] = useState<string[]>([]);

  const updateForm = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({ title: '', description: '', type: 'meetup', date: '', time: '', location: '', isVirtual: false, capacity: '' });
    setSelectedSegments([]);
    setSelectedIndividuals([]);
    setAiPrompt('');
    setLastAiPrompt('');
    setStep('details');
  };

  const allAttendeeIds = useMemo(() => {
    const segmentMemberIds = selectedSegments.flatMap((segId) => audienceSegments.find((s) => s.id === segId)?.memberIds || []);
    return [...new Set([...segmentMemberIds, ...selectedIndividuals])];
  }, [selectedSegments, selectedIndividuals]);

  const runAiPrefill = (prompt = aiPrompt) => {
    if (!prompt.trim()) {
      toast({ title: 'Add an instruction', description: 'Tell AI what event to create first.', variant: 'destructive' });
      return;
    }

    const lowerPrompt = prompt.toLowerCase();
    const isVirtual = lowerPrompt.includes('virtual') || lowerPrompt.includes('webinar') || lowerPrompt.includes('zoom');
    const suggestedContacts = mockContacts.filter((contact) => {
      const locationMatch = lowerPrompt.includes('bangalore') ? contact.currentCity === 'Bangalore'
        : lowerPrompt.includes('mumbai') ? contact.currentCity === 'Mumbai'
        : true;
      const engagementMatch = lowerPrompt.includes('high-engagement') || lowerPrompt.includes('high engagement')
        ? contact.engagementLevel === 'high'
        : lowerPrompt.includes('medium-engagement') || lowerPrompt.includes('medium engagement')
          ? contact.engagementLevel === 'medium'
          : true;
      const departmentMatch = lowerPrompt.includes('technology') || lowerPrompt.includes('tech') ? contact.department === 'Technology' : true;
      return locationMatch && engagementMatch && departmentMatch;
    });

    setFormData({
      title: lowerPrompt.includes('webinar') ? 'AI Webinar Draft' : lowerPrompt.includes('workshop') ? 'AI Workshop Draft' : 'AI Event Draft',
      description: `AI prepared this event from: ${prompt}`,
      type: lowerPrompt.includes('webinar') ? 'webinar' : lowerPrompt.includes('workshop') ? 'workshop' : lowerPrompt.includes('conference') ? 'conference' : 'meetup',
      date: new Date().toISOString().split('T')[0],
      time: lowerPrompt.includes('evening') ? '18:00' : '10:00',
      location: isVirtual ? 'Zoom' : lowerPrompt.includes('bangalore') ? 'Bangalore' : lowerPrompt.includes('mumbai') ? 'Mumbai' : 'Main Venue',
      isVirtual,
      capacity: lowerPrompt.includes('40') ? '40' : lowerPrompt.includes('100') ? '100' : '50',
    });
    setSelectedIndividuals(suggestedContacts.map((contact) => contact.id));
    setSelectedSegments([]);
    setLastAiPrompt(prompt);
    setStep('details');
    toast({ title: 'AI draft ready', description: `${suggestedContacts.length} attendees were prefilled for review.` });
  };

  const handleNext = () => {
    if (!formData.title || !formData.date || !formData.time || !formData.location) {
      toast({ title: 'Validation Error', description: 'Please fill in required fields', variant: 'destructive' });
      return;
    }
    setStep('attendees');
  };

  const handleSubmit = () => {
    const attendees: EventAttendee[] = allAttendeeIds.map((id) => {
      const contact = mockContacts.find((a) => a.id === id);
      return { contactId: id, name: contact ? `${contact.firstName} ${contact.lastName}` : 'Unknown', email: contact?.email || '', inviteSent: false, confirmed: false, attended: false, addedLater: false };
    });

    const event: Event = {
      id: crypto.randomUUID(),
      title: formData.title,
      description: formData.description,
      type: formData.type,
      date: formData.date,
      time: formData.time,
      location: formData.location,
      isVirtual: formData.isVirtual,
      capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
      targetAudience: selectedSegments.map((id) => audienceSegments.find((s) => s.id === id)?.name || ''),
      recommendedContacts: allAttendeeIds,
      attendees,
      invitedCount: attendees.length,
      confirmedCount: 0,
      attendedCount: 0,
      status: 'draft',
      emailsSent: 0,
      emailsOpened: 0,
      emailsClicked: 0,
      whatsappSent: 0,
      whatsappRead: 0,
      createdAt: new Date().toISOString(),
      createdBy: 'current_user',
    };

    onSave?.(event);
    toast({ title: 'Success', description: 'Event created successfully' });
    onOpenChange(false);
    resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="w-[96vw] max-w-[1500px] h-[92vh] p-0">
        <div className="dialog-shell">
          <DialogHeader className="dialog-header-tight">
            <DialogTitle>{step === 'details' ? 'Create Event with AI' : 'Review Attendees'}</DialogTitle>
            <DialogDescription>{step === 'details' ? 'Natural language comes first. Review the AI draft before saving.' : 'Attendees are already prefilled — adjust only if needed.'}</DialogDescription>
          </DialogHeader>

          <div className="dialog-body-scroll">
            {step === 'details' ? (
              <div className="grid min-h-0 h-full lg:grid-cols-[1.05fr_0.95fr]">
                <div className="border-b p-6 lg:border-b-0 lg:border-r">
                  <div className="space-y-5">
                    <div className="rounded-3xl border bg-muted/40 p-5">
                      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground"><Wand2 className="h-4 w-4 text-primary" /> AI event command</div>
                      <h3 className="text-2xl font-semibold">Describe the event and let AI draft it.</h3>
                      <p className="mt-2 text-sm text-muted-foreground">AI will prefill title, format, location, timing, and attendees before you review.</p>
                      <div className="mt-4 flex flex-col gap-3">
                        <Input value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="e.g., Host a virtual AI webinar for technology leaders next week" className="h-12" />
                        <Button className="h-12 gap-2" onClick={() => runAiPrefill()}><Sparkles className="h-4 w-4" />Generate event draft</Button>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {quickPrompts.map((prompt) => (
                          <Button key={prompt} variant="outline" size="sm" className="h-auto whitespace-normal text-left" onClick={() => { setAiPrompt(prompt); runAiPrefill(prompt); }}>{prompt}</Button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border bg-card p-4">
                      <p className="text-sm font-medium">Last AI instruction</p>
                      <p className="mt-2 text-sm text-muted-foreground">{lastAiPrompt || 'No AI instruction yet.'}</p>
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
                        <Badge variant="secondary">{allAttendeeIds.length}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">AI will send you to the attendee review step next.</p>
                    </div>
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="flex h-full min-h-0 flex-col p-6 pt-5">
                <PersonSelector
                  selectedSegments={selectedSegments}
                  selectedIndividuals={selectedIndividuals}
                  onSegmentsChange={setSelectedSegments}
                  onIndividualsChange={setSelectedIndividuals}
                  audienceSegments={audienceSegments}
                  className="flex-1 min-h-0"
                />
                <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_280px]">
                  <div className="rounded-2xl border bg-card p-4">
                    <p className="text-sm font-medium">Event prompt</p>
                    <p className="mt-2 text-sm text-muted-foreground">{lastAiPrompt || 'Manual attendee selection.'}</p>
                  </div>
                  <div className="rounded-2xl border bg-muted/40 p-4">
                    <div className="flex items-center justify-between"><p className="text-sm font-medium">Total attendees</p><Badge variant="secondary">{allAttendeeIds.length}</Badge></div>
                    <p className="mt-2 text-sm text-muted-foreground">{selectedSegments.length} segments + {selectedIndividuals.length} individuals selected.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="dialog-footer-bar flex justify-between gap-3">
            {step === 'attendees' ? <Button variant="outline" onClick={() => setStep('details')}>Back</Button> : <div />}
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>Cancel</Button>
              {step === 'details' ? <Button onClick={handleNext}>Next: Review Attendees</Button> : <Button onClick={handleSubmit}>Create Event ({allAttendeeIds.length})</Button>}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
