import { useState, useMemo } from 'react';
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
import { Event, EventAttendee, AudienceSegment } from '@/types/alumni';
import { mockAlumni } from '@/data/mockData';
import { PersonSelector } from './PersonSelector';

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (event: Event) => void;
}

// Mock audience segments
const audienceSegments: AudienceSegment[] = [
  { id: '1', name: 'Bangalore Alumni', description: '', filters: {}, memberIds: ['1', '5'], memberCount: 2, createdAt: '', createdBy: '', updatedAt: '' },
  { id: '2', name: 'Computer Science Professors', description: '', filters: {}, memberIds: ['1'], memberCount: 1, createdAt: '', createdBy: '', updatedAt: '' },
  { id: '3', name: 'High Engagement Alumni', description: '', filters: {}, memberIds: ['1', '4'], memberCount: 2, createdAt: '', createdBy: '', updatedAt: '' },
  { id: '4', name: 'Available Mentors', description: '', filters: {}, memberIds: ['1', '2', '4', '5'], memberCount: 4, createdAt: '', createdBy: '', updatedAt: '' },
];

export function CreateEventDialog({ open, onOpenChange, onSave }: CreateEventDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<'details' | 'attendees'>('details');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'meetup' as Event['type'],
    date: '',
    time: '',
    location: '',
    isVirtual: false,
    capacity: '',
  });

  // Attendee selection state
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const [selectedIndividuals, setSelectedIndividuals] = useState<string[]>([]);

  // AI recommendation state
  const [aiRecommendations, setAiRecommendations] = useState<string[]>([]);

  const updateForm = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'meetup',
      date: '',
      time: '',
      location: '',
      isVirtual: false,
      capacity: '',
    });
    setSelectedSegments([]);
    setSelectedIndividuals([]);
    setAiRecommendations([]);
    setStep('details');
  };

  // Get all unique attendee IDs from segments + individuals
  const allAttendeeIds = useMemo(() => {
    const segmentMemberIds = selectedSegments.flatMap((segId) => {
      const segment = audienceSegments.find((s) => s.id === segId);
      return segment?.memberIds || [];
    });
    return [...new Set([...segmentMemberIds, ...selectedIndividuals])];
  }, [selectedSegments, selectedIndividuals]);

  const generateAIRecommendations = () => {
    const recommendations = mockAlumni
      .filter((a) => a.engagementLevel === 'high' || a.engagementLevel === 'medium')
      .map((a) => a.id);
    setAiRecommendations(recommendations);
    toast({ title: 'AI Recommendations', description: `Found ${recommendations.length} recommended attendees` });
  };

  const applyAIRecommendations = () => {
    setSelectedIndividuals((prev) => [...new Set([...prev, ...aiRecommendations])]);
    toast({ title: 'Applied', description: 'AI recommendations added to attendees' });
  };

  const handleNext = () => {
    if (!formData.title || !formData.date || !formData.time || !formData.location) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in required fields (Title, Date, Time, Location)',
        variant: 'destructive',
      });
      return;
    }
    setStep('attendees');
    generateAIRecommendations();
  };

  const handleSubmit = () => {
    const attendees: EventAttendee[] = allAttendeeIds.map((id) => {
      const alumni = mockAlumni.find((a) => a.id === id);
      return {
        alumniId: id,
        name: alumni ? `${alumni.firstName} ${alumni.lastName}` : 'Unknown',
        email: alumni?.email || '',
        inviteSent: false,
        confirmed: false,
        attended: false,
        addedLater: false,
      };
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
      recommendedContacts: aiRecommendations,
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
      <DialogContent className="max-w-4xl h-[90vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="p-6 pb-0 shrink-0">
          <DialogTitle>Create New Event</DialogTitle>
          <DialogDescription>
            {step === 'details' ? 'Set up event details' : 'Select attendees for this event'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden">
          {step === 'details' ? (
            <ScrollArea className="h-full">
              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Event Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => updateForm('title', e.target.value)}
                    placeholder="e.g., Annual Alumni Reunion 2024"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => updateForm('description', e.target.value)}
                    placeholder="Describe the event..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Event Type</Label>
                    <Select value={formData.type} onValueChange={(v) => updateForm('type', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reunion">Reunion</SelectItem>
                        <SelectItem value="webinar">Webinar</SelectItem>
                        <SelectItem value="meetup">Meetup</SelectItem>
                        <SelectItem value="workshop">Workshop</SelectItem>
                        <SelectItem value="hiring">Hiring Event</SelectItem>
                        <SelectItem value="mentoring">Mentoring Session</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capacity">Capacity</Label>
                    <Input
                      id="capacity"
                      type="number"
                      value={formData.capacity}
                      onChange={(e) => updateForm('capacity', e.target.value)}
                      placeholder="e.g., 100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => updateForm('date', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Time *</Label>
                    <Input
                      id="time"
                      type="time"
                      value={formData.time}
                      onChange={(e) => updateForm('time', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => updateForm('location', e.target.value)}
                    placeholder={formData.isVirtual ? 'e.g., Zoom, Google Meet' : 'e.g., Main Auditorium'}
                  />
                </div>

                <div className="flex items-center justify-between py-2">
                  <div>
                    <Label>Virtual Event</Label>
                    <p className="text-sm text-muted-foreground">This event will be held online</p>
                  </div>
                  <Switch
                    checked={formData.isVirtual}
                    onCheckedChange={(v) => updateForm('isVirtual', v)}
                  />
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="h-full px-6 pt-0 flex flex-col">
            <PersonSelector
              selectedSegments={selectedSegments}
              selectedIndividuals={selectedIndividuals}
              onSegmentsChange={setSelectedSegments}
              onIndividualsChange={setSelectedIndividuals}
              audienceSegments={audienceSegments}
              aiRecommendations={aiRecommendations}
              aiContext={`Based on event type (${formData.type}) and past engagement, we recommend ${aiRecommendations.length} alumni.`}
              onApplyAIRecommendations={applyAIRecommendations}
              className="flex-1 min-h-0"
            />

            {/* Summary */}
            <div className="bg-muted border rounded-md px-3 p-1 mt-3 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Total Attendees: {allAttendeeIds.length}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedSegments.length} segments + {selectedIndividuals.length} individuals
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between gap-3 px-6 p-3 pt-4 border-t shrink-0">
          {step === 'attendees' && (
            <Button variant="outline" onClick={() => setStep('details')}>
              Back
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
            Cancel
          </Button>
          {step === 'details' ? (
            <Button onClick={handleNext}>
              Next: Select Attendees
            </Button>
          ) : (
            <Button onClick={handleSubmit}>
              Create Event ({allAttendeeIds.length} attendees)
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
