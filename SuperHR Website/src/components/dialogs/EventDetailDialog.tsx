import { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, MapPin, Users, Mail, MessageCircle, Clock, 
  Edit2, Save, Send, UserPlus, CheckCircle, XCircle, X, Search, 
  Archive, UserCheck, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Event, EventAttendee, AudienceSegment, MessageTemplate } from '@/types/alumni';
import { mockAlumni } from '@/data/mockData';
import { cn } from '@/lib/utils';

interface EventDetailDialogProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (event: Event) => void;
  onArchive?: (event: Event) => void;
}

// Mock audience segments
const audienceSegments: AudienceSegment[] = [
  { id: '1', name: 'Bangalore Alumni', description: '', filters: {}, memberIds: ['1', '5'], memberCount: 2, createdAt: '', createdBy: '', updatedAt: '' },
  { id: '2', name: 'Computer Science Professors', description: '', filters: {}, memberIds: ['1'], memberCount: 1, createdAt: '', createdBy: '', updatedAt: '' },
  { id: '3', name: 'High Engagement Alumni', description: '', filters: {}, memberIds: ['1', '4'], memberCount: 2, createdAt: '', createdBy: '', updatedAt: '' },
];

// Mock templates
const emailTemplates: MessageTemplate[] = [
  { id: '1', name: 'Event Invitation', type: 'email', subject: 'You are invited to {{event_name}}', content: 'Dear {{name}},\n\nWe invite you to...', createdAt: '', createdBy: '', updatedAt: '' },
  { id: '2', name: 'Event Reminder', type: 'email', subject: 'Reminder: {{event_name}}', content: 'Dear {{name}},\n\nReminder about...', createdAt: '', createdBy: '', updatedAt: '' },
  { id: '3', name: 'Thank You Follow-up', type: 'email', subject: 'Thank you for attending {{event_name}}', content: 'Dear {{name}},\n\nThank you for attending...', createdAt: '', createdBy: '', updatedAt: '' },
];

const whatsappTemplates: MessageTemplate[] = [
  { id: '4', name: 'Event Invitation WhatsApp', type: 'whatsapp', content: 'Hi {{name}}! 👋 You are invited to {{event_name}}...', createdAt: '', createdBy: '', updatedAt: '' },
  { id: '5', name: 'Event Reminder WhatsApp', type: 'whatsapp', content: 'Hi {{name}}! Reminder about {{event_name}}...', createdAt: '', createdBy: '', updatedAt: '' },
  { id: '6', name: 'Thank You WhatsApp', type: 'whatsapp', content: 'Hi {{name}}! 🙏 Thanks for attending {{event_name}}...', createdAt: '', createdBy: '', updatedAt: '' },
];

const senderOptions = [
  { id: '1', type: 'email', name: 'Alumni Relations', address: 'alumni@university.edu' },
  { id: '2', type: 'email', name: 'HR Team', address: 'hr@university.edu' },
  { id: '3', type: 'whatsapp', name: 'Main WhatsApp', address: '+91 98765 43210' },
];

const locationOptions = ['Bangalore', 'Mumbai', 'Kochi', 'Delhi', 'Chennai', 'Hyderabad'];
const departmentOptions = ['Computer Science', 'Mathematics', 'Physics', 'Biotechnology', 'Administration'];
const typeOptions = [
  { value: 'professor', label: 'Professor' },
  { value: 'ta', label: 'Teaching Assistant' },
  { value: 'staff', label: 'Staff' },
  { value: 'researcher', label: 'Researcher' },
];

export function EventDetailDialog({ event, open, onOpenChange, onSave, onArchive }: EventDetailDialogProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedEvent, setEditedEvent] = useState<Event | null>(null);
  const [showAddAttendeesDialog, setShowAddAttendeesDialog] = useState(false);
  const [showSendInviteDialog, setShowSendInviteDialog] = useState(false);
  const [showCompleteEventDialog, setShowCompleteEventDialog] = useState(false);
  const [attendeeTab, setAttendeeTab] = useState<'not-sent' | 'sent'>('not-sent');
  
  // Send invite state
  const [sendType, setSendType] = useState<'email' | 'whatsapp'>('email');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedSender, setSelectedSender] = useState('');
  const [sendToNew, setSendToNew] = useState(false);

  // Add attendees state
  const [addMode, setAddMode] = useState<'segments' | 'individuals'>('segments');
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const [selectedIndividuals, setSelectedIndividuals] = useState<string[]>([]);
  const [alumniSearch, setAlumniSearch] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterType, setFilterType] = useState('all');

  // Complete event state
  const [attendedIds, setAttendedIds] = useState<string[]>([]);
  const [sendFollowUp, setSendFollowUp] = useState(false);
  const [followUpType, setFollowUpType] = useState<'email' | 'whatsapp'>('email');
  const [followUpTemplate, setFollowUpTemplate] = useState('');
  const [followUpSender, setFollowUpSender] = useState('');

  // Segment search for scalability
  const [segmentSearch, setSegmentSearch] = useState('');

  useEffect(() => {
    if (event) {
      setEditedEvent(event);
      if (!event.attendees && event.invitedCount > 0) {
        const initialAttendees: EventAttendee[] = mockAlumni.slice(0, Math.min(event.invitedCount, 5)).map((a) => ({
          alumniId: a.id,
          name: `${a.firstName} ${a.lastName}`,
          email: a.email,
          inviteSent: true,
          inviteSentDate: event.createdAt,
          confirmed: Math.random() > 0.3,
          attended: event.status === 'completed' && Math.random() > 0.2,
          addedLater: false,
        }));
        setEditedEvent({ ...event, attendees: initialAttendees });
      }
    }
  }, [event]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setIsEditing(false);
      setShowAddAttendeesDialog(false);
      setShowSendInviteDialog(false);
      setShowCompleteEventDialog(false);
      setSelectedSegments([]);
      setSelectedIndividuals([]);
      setAttendedIds([]);
      setSendFollowUp(false);
      setSegmentSearch('');
      setAlumniSearch('');
    }
  }, [open]);

  // Filter alumni for add attendees - before any early return
  const attendees = editedEvent?.attendees || [];
  
  const filteredAlumni = useMemo(() => {
    const existingIds = attendees.map((a) => a.alumniId);
    return mockAlumni.filter((alumni) => {
      if (existingIds.includes(alumni.id)) return false;
      const matchesSearch = alumniSearch === '' ||
        `${alumni.firstName} ${alumni.lastName} ${alumni.email}`.toLowerCase().includes(alumniSearch.toLowerCase());
      const matchesLocation = filterLocation === 'all' ||
        alumni.currentCity?.toLowerCase().includes(filterLocation.toLowerCase());
      const matchesDepartment = filterDepartment === 'all' || alumni.department === filterDepartment;
      const matchesType = filterType === 'all' || alumni.type === filterType;
      return matchesSearch && matchesLocation && matchesDepartment && matchesType;
    });
  }, [alumniSearch, filterLocation, filterDepartment, filterType, attendees]);

  // Filter segments for search
  const filteredSegments = useMemo(() => {
    if (!segmentSearch) return audienceSegments;
    return audienceSegments.filter((s) =>
      s.name.toLowerCase().includes(segmentSearch.toLowerCase())
    );
  }, [segmentSearch]);

  // Derived values - computed before early return
  const displayEvent = isEditing ? editedEvent! : (editedEvent || event);
  
  const notSentAttendees = attendees.filter((a) => !a.inviteSent);
  const sentAttendees = attendees.filter((a) => a.inviteSent);

  const confirmationRate = displayEvent && displayEvent.invitedCount > 0
    ? Math.round((displayEvent.confirmedCount / displayEvent.invitedCount) * 100)
    : 0;

  const attendanceRate = displayEvent && displayEvent.status === 'completed' && displayEvent.confirmedCount > 0
    ? Math.round((displayEvent.attendedCount / displayEvent.confirmedCount) * 100)
    : 0;

  const emailOpenRate = displayEvent && displayEvent.emailsSent > 0
    ? Math.round((displayEvent.emailsOpened / displayEvent.emailsSent) * 100)
    : 0;

  const filteredSenders = senderOptions.filter((s) => s.type === sendType);
  const filteredTemplates = sendType === 'email' ? emailTemplates : whatsappTemplates;
  const followUpSenders = senderOptions.filter((s) => s.type === followUpType);
  const followUpTemplates = followUpType === 'email' ? emailTemplates : whatsappTemplates;

  const statusStyles: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    scheduled: 'bg-info/10 text-info',
    ongoing: 'bg-success/10 text-success',
    completed: 'bg-secondary text-secondary-foreground',
    cancelled: 'bg-destructive/10 text-destructive',
    archived: 'bg-muted text-muted-foreground',
  };

  const typeStyles: Record<string, string> = {
    reunion: 'bg-primary/10 text-primary',
    webinar: 'bg-info/10 text-info',
    meetup: 'bg-success/10 text-success',
    workshop: 'bg-warning/10 text-warning',
    hiring: 'bg-accent/10 text-accent',
    mentoring: 'bg-chart-5/10 text-chart-5',
    other: 'bg-muted text-muted-foreground',
  };

  if (!event) return null;

  const handleSave = () => {
    if (editedEvent) {
      onSave?.(editedEvent);
      setIsEditing(false);
      toast({ title: 'Success', description: 'Event updated successfully' });
    }
  };

  const updateField = (field: keyof Event, value: any) => {
    if (editedEvent) {
      setEditedEvent({ ...editedEvent, [field]: value });
    }
  };

  const handleSendInvites = (onlyNew: boolean = false) => {
    setSendToNew(onlyNew);
    setShowSendInviteDialog(true);
  };

  const handleConfirmSendInvites = () => {
    if (!selectedTemplate || !selectedSender) {
      toast({ title: 'Error', description: 'Please select a template and sender', variant: 'destructive' });
      return;
    }

    if (editedEvent) {
      const targetAttendees = sendToNew ? notSentAttendees : attendees.filter((a) => !a.inviteSent);
      const updatedAttendees = (editedEvent.attendees || []).map((a) => {
        const shouldUpdate = !a.inviteSent;
        return shouldUpdate ? { ...a, inviteSent: true, inviteSentDate: new Date().toISOString() } : a;
      });
      
      const updated: Event = {
        ...editedEvent,
        attendees: updatedAttendees,
        emailsSent: sendType === 'email' ? (editedEvent.emailsSent || 0) + targetAttendees.length : editedEvent.emailsSent,
        whatsappSent: sendType === 'whatsapp' ? (editedEvent.whatsappSent || 0) + targetAttendees.length : editedEvent.whatsappSent,
      };
      
      setEditedEvent(updated);
      onSave?.(updated);
    }
    
    setShowSendInviteDialog(false);
    setSelectedTemplate('');
    setSelectedSender('');
    toast({
      title: 'Invites Sent',
      description: `${sendType === 'email' ? 'Email' : 'WhatsApp'} invitations sent successfully`,
    });
  };

  const handleCancelEvent = () => {
    if (editedEvent) {
      const updated = { ...editedEvent, status: 'cancelled' as const };
      setEditedEvent(updated);
      onSave?.(updated);
      toast({ title: 'Event Cancelled', description: 'This event has been cancelled' });
    }
  };

  const handleOpenCompleteEvent = () => {
    // Pre-select confirmed attendees as attended
    const confirmedIds = attendees.filter((a) => a.confirmed).map((a) => a.alumniId);
    setAttendedIds(confirmedIds);
    setShowCompleteEventDialog(true);
  };

  const handleCompleteEvent = () => {
    if (!editedEvent) return;

    const updatedAttendees = editedEvent.attendees?.map((a) => ({
      ...a,
      attended: attendedIds.includes(a.alumniId),
    })) || [];

    const updated: Event = {
      ...editedEvent,
      status: 'completed' as const,
      attendees: updatedAttendees,
      attendedCount: attendedIds.length,
    };

    setEditedEvent(updated);
    onSave?.(updated);

    if (sendFollowUp && followUpTemplate && followUpSender) {
      toast({
        title: 'Follow-up Sent',
        description: `${followUpType === 'email' ? 'Email' : 'WhatsApp'} sent to ${attendedIds.length} attendees`,
      });
    }

    setShowCompleteEventDialog(false);
    toast({ title: 'Event Completed', description: 'Event has been marked as completed' });
  };

  const handleArchiveEvent = () => {
    if (editedEvent) {
      const archived = { ...editedEvent, status: 'archived' as Event['status'] };
      onArchive?.(archived);
      onOpenChange(false);
      toast({ title: 'Event Archived', description: 'Event has been moved to archives' });
    }
  };

  const toggleSegment = (segmentId: string) => {
    setSelectedSegments((prev) =>
      prev.includes(segmentId) ? prev.filter((id) => id !== segmentId) : [...prev, segmentId]
    );
  };

  const toggleIndividual = (alumniId: string) => {
    setSelectedIndividuals((prev) =>
      prev.includes(alumniId) ? prev.filter((id) => id !== alumniId) : [...prev, alumniId]
    );
  };

  const toggleAttended = (alumniId: string) => {
    setAttendedIds((prev) =>
      prev.includes(alumniId) ? prev.filter((id) => id !== alumniId) : [...prev, alumniId]
    );
  };

  const handleAddAttendees = () => {
    if (!editedEvent) return;

    const segmentMemberIds = selectedSegments.flatMap((segId) => {
      const segment = audienceSegments.find((s) => s.id === segId);
      return segment?.memberIds || [];
    });

    const allNewIds = [...new Set([...segmentMemberIds, ...selectedIndividuals])];
    const existingIds = attendees.map((a) => a.alumniId);
    const uniqueNewIds = allNewIds.filter((id) => !existingIds.includes(id));

    if (uniqueNewIds.length === 0) {
      toast({ title: 'No new attendees', description: 'All selected attendees are already added' });
      return;
    }

    const newAttendees: EventAttendee[] = uniqueNewIds.map((id) => {
      const alumni = mockAlumni.find((a) => a.id === id);
      return {
        alumniId: id,
        name: alumni ? `${alumni.firstName} ${alumni.lastName}` : 'Unknown',
        email: alumni?.email || '',
        inviteSent: false,
        confirmed: false,
        attended: false,
        addedLater: true,
      };
    });

    const updated: Event = {
      ...editedEvent,
      attendees: [...(editedEvent.attendees || []), ...newAttendees],
      invitedCount: (editedEvent.invitedCount || 0) + newAttendees.length,
    };
    setEditedEvent(updated);
    onSave?.(updated);
    setSelectedSegments([]);
    setSelectedIndividuals([]);
    setShowAddAttendeesDialog(false);
    setSegmentSearch('');
    setAlumniSearch('');
    toast({ title: 'Attendees Added', description: `${newAttendees.length} attendees added (invite not sent yet)` });
  };

  const clearFilters = () => {
    setAlumniSearch('');
    setFilterLocation('all');
    setFilterDepartment('all');
    setFilterType('all');
  };

  const selectAllFiltered = () => {
    const ids = filteredAlumni.map((a) => a.id);
    setSelectedIndividuals((prev) => [...new Set([...prev, ...ids])]);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="flex flex-row items-start justify-between p-6 pb-4 shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className={cn('capitalize', typeStyles[displayEvent.type] || typeStyles.other)}>
                  {displayEvent.type}
                </Badge>
                <Badge variant="outline" className={statusStyles[displayEvent.status] || statusStyles.draft}>
                  {displayEvent.status}
                </Badge>
                {displayEvent.isVirtual && <Badge variant="outline">Virtual</Badge>}
              </div>
              <DialogTitle className="text-xl">{displayEvent.title}</DialogTitle>
              <DialogDescription className="sr-only">Event details and management</DialogDescription>
            </div>
            <Button
              variant={isEditing ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                if (isEditing) {
                  handleSave();
                } else {
                  setEditedEvent(displayEvent);
                  setIsEditing(true);
                }
              }}
            >
              {isEditing ? <><Save className="h-4 w-4 mr-2" /> Save</> : <><Edit2 className="h-4 w-4 mr-2" /> Edit</>}
            </Button>
          </DialogHeader>

          {/* Quick Actions */}
          <div className="flex gap-2 px-6 py-4 border-b flex-wrap shrink-0">
            <Button size="sm" onClick={() => handleSendInvites(false)} disabled={notSentAttendees.length === 0}>
              <Send className="h-4 w-4 mr-2" />
              Send Invites ({notSentAttendees.length})
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowAddAttendeesDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Attendees
            </Button>
            {displayEvent.status !== 'cancelled' && displayEvent.status !== 'completed' && displayEvent.status !== 'archived' && (
              <>
                <Button size="sm" variant="outline" onClick={handleOpenCompleteEvent}>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Mark Complete
                </Button>
                <Button size="sm" variant="outline" className="text-destructive" onClick={handleCancelEvent}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Event
                </Button>
              </>
            )}
            {displayEvent.status === 'completed' && (
              <Button size="sm" variant="outline" onClick={handleArchiveEvent}>
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </Button>
            )}
          </div>

          <ScrollArea className="flex-1">
            <Tabs defaultValue="overview" className="p-6">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="attendees">Attendees ({attendees.length})</TabsTrigger>
                <TabsTrigger value="metrics">Metrics</TabsTrigger>
                <TabsTrigger value="outreach">Outreach</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label>Description</Label>
                  {isEditing ? (
                    <Textarea
                      value={editedEvent?.description}
                      onChange={(e) => updateField('description', e.target.value)}
                      rows={3}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">{displayEvent.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Date</Label>
                    {isEditing ? (
                      <Input type="date" value={editedEvent?.date} onChange={(e) => updateField('date', e.target.value)} />
                    ) : (
                      <p className="text-sm">{new Date(displayEvent.date).toLocaleDateString()}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Clock className="h-4 w-4" /> Time</Label>
                    {isEditing ? (
                      <Input type="time" value={editedEvent?.time} onChange={(e) => updateField('time', e.target.value)} />
                    ) : (
                      <p className="text-sm">{displayEvent.time}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Location</Label>
                  {isEditing ? (
                    <Input value={editedEvent?.location} onChange={(e) => updateField('location', e.target.value)} />
                  ) : (
                    <p className="text-sm">{displayEvent.location}</p>
                  )}
                </div>

                {displayEvent.capacity && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Users className="h-4 w-4" /> Capacity</Label>
                    {isEditing ? (
                      <Input type="number" value={editedEvent?.capacity} onChange={(e) => updateField('capacity', parseInt(e.target.value))} />
                    ) : (
                      <p className="text-sm">{displayEvent.capacity}</p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Target Audience</Label>
                  <div className="flex flex-wrap gap-2">
                    {displayEvent.targetAudience.map((audience) => (
                      <Badge key={audience} variant="secondary">{audience}</Badge>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="attendees" className="mt-4 space-y-4">
                <Tabs value={attendeeTab} onValueChange={(v) => setAttendeeTab(v as any)}>
                  <TabsList>
                    <TabsTrigger value="not-sent" className="gap-2">
                      Invite Not Sent
                      <Badge variant="secondary">{notSentAttendees.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="sent" className="gap-2">
                      Invite Sent
                      <Badge variant="secondary">{sentAttendees.length}</Badge>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {attendeeTab === 'not-sent' && notSentAttendees.length > 0 && (
                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => handleSendInvites(true)}>
                      <Send className="h-4 w-4 mr-2" />
                      Send to All ({notSentAttendees.length})
                    </Button>
                  </div>
                )}

                <div className="space-y-2">
                  {(attendeeTab === 'not-sent' ? notSentAttendees : sentAttendees).map((attendee) => (
                    <div key={attendee.alumniId} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium">{attendee.name.split(' ').map((n) => n[0]).join('')}</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{attendee.name}</p>
                          <p className="text-xs text-muted-foreground">{attendee.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {attendee.addedLater && <Badge variant="outline" className="text-xs">Added Later</Badge>}
                        {attendee.inviteSent ? (
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Invited
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-warning">Pending</Badge>
                        )}
                        {attendee.confirmed && <Badge className="text-xs bg-success text-success-foreground">Confirmed</Badge>}
                        {attendee.attended && <Badge className="text-xs bg-primary text-primary-foreground">Attended</Badge>}
                      </div>
                    </div>
                  ))}

                  {(attendeeTab === 'not-sent' ? notSentAttendees : sentAttendees).length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No attendees in this category</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="metrics" className="mt-4 space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-3xl font-bold">{displayEvent.invitedCount}</p>
                    <p className="text-sm text-muted-foreground">Invited</p>
                  </div>
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-3xl font-bold text-success">{displayEvent.confirmedCount}</p>
                    <p className="text-sm text-muted-foreground">Confirmed</p>
                  </div>
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-3xl font-bold text-primary">{displayEvent.attendedCount}</p>
                    <p className="text-sm text-muted-foreground">Attended</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Confirmation Rate</span>
                      <span className="text-sm font-medium">{confirmationRate}%</span>
                    </div>
                    <Progress value={confirmationRate} />
                  </div>

                  {displayEvent.status === 'completed' && (
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm font-medium">Attendance Rate</span>
                        <span className="text-sm font-medium">{attendanceRate}%</span>
                      </div>
                      <Progress value={attendanceRate} />
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="outreach" className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Mail className="h-4 w-4 text-primary" />
                      <span className="font-medium">Email Outreach</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sent</span>
                        <span>{displayEvent.emailsSent}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Opened</span>
                        <span>{displayEvent.emailsOpened} ({emailOpenRate}%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Clicked</span>
                        <span>{displayEvent.emailsClicked}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageCircle className="h-4 w-4 text-success" />
                      <span className="font-medium">WhatsApp Outreach</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sent</span>
                        <span>{displayEvent.whatsappSent}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Read</span>
                        <span>
                          {displayEvent.whatsappRead} (
                          {displayEvent.whatsappSent > 0
                            ? Math.round((displayEvent.whatsappRead / displayEvent.whatsappSent) * 100)
                            : 0}
                          %)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleSendInvites(false)}>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Email
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setSendType('whatsapp'); handleSendInvites(false); }}>
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Send WhatsApp
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Send Invite Dialog */}
      <Dialog open={showSendInviteDialog} onOpenChange={setShowSendInviteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Invitations</DialogTitle>
            <DialogDescription>
              Send {sendToNew ? 'to new attendees' : 'to all pending attendees'} ({notSentAttendees.length})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <Tabs value={sendType} onValueChange={(v) => setSendType(v as 'email' | 'whatsapp')}>
              <TabsList className="w-full">
                <TabsTrigger value="email" className="flex-1">
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="whatsapp" className="flex-1">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  WhatsApp
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-2">
              <Label>Select Template</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template" />
                </SelectTrigger>
                <SelectContent>
                  {filteredTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Send From</Label>
              <Select value={selectedSender} onValueChange={setSelectedSender}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose sender" />
                </SelectTrigger>
                <SelectContent>
                  {filteredSenders.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.address})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowSendInviteDialog(false)}>Cancel</Button>
              <Button onClick={handleConfirmSendInvites}>
                <Send className="h-4 w-4 mr-2" />
                Send ({notSentAttendees.length})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Attendees Dialog */}
      <Dialog open={showAddAttendeesDialog} onOpenChange={setShowAddAttendeesDialog}>
        <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 shrink-0">
            <DialogTitle>Add Attendees</DialogTitle>
            <DialogDescription>Select from segments or individual alumni</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col px-6">
            <Tabs value={addMode} onValueChange={(v) => setAddMode(v as any)} className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="shrink-0 mb-4">
                <TabsTrigger value="segments">Audience Segments</TabsTrigger>
                <TabsTrigger value="individuals">Individual Selection</TabsTrigger>
              </TabsList>

              <TabsContent value="segments" className="flex-1 overflow-hidden flex flex-col mt-0">
                {/* Segment Search */}
                <div className="mb-4 shrink-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search segments..."
                      value={segmentSearch}
                      onChange={(e) => setSegmentSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  <div className="space-y-2 pb-4">
                    {filteredSegments.map((segment) => (
                      <div
                        key={segment.id}
                        className={cn(
                          'flex items-center justify-between p-4 rounded-lg border cursor-pointer hover:bg-muted',
                          selectedSegments.includes(segment.id) && 'bg-primary/10 border-primary/20'
                        )}
                        onClick={() => toggleSegment(segment.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox checked={selectedSegments.includes(segment.id)} />
                          <div>
                            <p className="font-medium">{segment.name}</p>
                            <p className="text-sm text-muted-foreground">{segment.memberCount} members</p>
                          </div>
                        </div>
                        <Badge variant="secondary">{segment.memberCount}</Badge>
                      </div>
                    ))}
                    {filteredSegments.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No segments found</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="individuals" className="flex-1 overflow-hidden flex flex-col mt-0">
                {/* Filters */}
                <div className="flex flex-wrap gap-2 mb-4 shrink-0">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search alumni..."
                      value={alumniSearch}
                      onChange={(e) => setAlumniSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={filterLocation} onValueChange={setFilterLocation}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {locationOptions.map((loc) => (
                        <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Dept" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {departmentOptions.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {(filterLocation !== 'all' || filterDepartment !== 'all' || filterType !== 'all') && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Selection Actions */}
                <div className="flex items-center justify-between mb-3 shrink-0">
                  <Button variant="outline" size="sm" onClick={selectAllFiltered}>
                    Select All ({filteredAlumni.length})
                  </Button>
                  <Badge variant="secondary">{selectedIndividuals.length} selected</Badge>
                </div>

                <ScrollArea className="flex-1 border rounded-lg">
                  <div className="p-2 space-y-1">
                    {filteredAlumni.map((alumni) => (
                      <div
                        key={alumni.id}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted',
                          selectedIndividuals.includes(alumni.id) && 'bg-primary/10'
                        )}
                        onClick={() => toggleIndividual(alumni.id)}
                      >
                        <Checkbox checked={selectedIndividuals.includes(alumni.id)} />
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-medium">{alumni.firstName[0]}{alumni.lastName[0]}</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{alumni.firstName} {alumni.lastName}</p>
                          <p className="text-xs text-muted-foreground">{alumni.email}</p>
                        </div>
                        <Badge variant="outline" className="text-xs capitalize">{alumni.type}</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>

            <div className="bg-muted/50 rounded-lg p-4 mt-4 shrink-0">
              <p className="font-medium">
                Selected: {selectedSegments.length} segments, {selectedIndividuals.length} individuals
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 p-6 pt-4 border-t shrink-0">
            <Button variant="outline" onClick={() => { setSelectedSegments([]); setSelectedIndividuals([]); setShowAddAttendeesDialog(false); }}>
              Cancel
            </Button>
            <Button onClick={handleAddAttendees} disabled={selectedSegments.length === 0 && selectedIndividuals.length === 0}>
              Add Attendees
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Complete Event Dialog */}
      <Dialog open={showCompleteEventDialog} onOpenChange={setShowCompleteEventDialog}>
        <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 shrink-0">
            <DialogTitle>Complete Event</DialogTitle>
            <DialogDescription>Mark which attendees came and optionally send follow-up messages</DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 px-6">
            <div className="space-y-6 pb-6">
              {/* Attendance Selection */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Mark Attendance</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAttendedIds(attendees.map((a) => a.alumniId))}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAttendedIds([])}
                    >
                      Deselect All
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 border rounded-lg p-4 max-h-[300px] overflow-y-auto">
                  {attendees.filter((a) => a.inviteSent).map((attendee) => (
                    <div
                      key={attendee.alumniId}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted',
                        attendedIds.includes(attendee.alumniId) && 'bg-success/10'
                      )}
                      onClick={() => toggleAttended(attendee.alumniId)}
                    >
                      <Checkbox checked={attendedIds.includes(attendee.alumniId)} />
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-medium">{attendee.name.split(' ').map((n) => n[0]).join('')}</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{attendee.name}</p>
                        <p className="text-xs text-muted-foreground">{attendee.email}</p>
                      </div>
                      {attendee.confirmed && <Badge variant="secondary" className="text-xs">Confirmed</Badge>}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  {attendedIds.length} of {attendees.filter((a) => a.inviteSent).length} marked as attended
                </p>
              </div>

              {/* Follow-up Option */}
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="send-followup"
                    checked={sendFollowUp}
                    onCheckedChange={(c) => setSendFollowUp(c === true)}
                  />
                  <Label htmlFor="send-followup" className="cursor-pointer">
                    Send follow-up message to attendees
                  </Label>
                </div>

                {sendFollowUp && (
                  <div className="space-y-4 pl-6">
                    <Tabs value={followUpType} onValueChange={(v) => setFollowUpType(v as 'email' | 'whatsapp')}>
                      <TabsList>
                        <TabsTrigger value="email">
                          <Mail className="h-4 w-4 mr-2" />
                          Email
                        </TabsTrigger>
                        <TabsTrigger value="whatsapp">
                          <MessageCircle className="h-4 w-4 mr-2" />
                          WhatsApp
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>

                    <div className="space-y-2">
                      <Label>Template</Label>
                      <Select value={followUpTemplate} onValueChange={setFollowUpTemplate}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select template" />
                        </SelectTrigger>
                        <SelectContent>
                          {followUpTemplates.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Send From</Label>
                      <Select value={followUpSender} onValueChange={setFollowUpSender}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select sender" />
                        </SelectTrigger>
                        <SelectContent>
                          {followUpSenders.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name} ({s.address})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-3 p-6 pt-4 border-t shrink-0">
            <Button variant="outline" onClick={() => setShowCompleteEventDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCompleteEvent}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete Event
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
