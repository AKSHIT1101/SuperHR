import { useEffect, useMemo, useState } from 'react';
import { Calendar, MapPin, Users, Mail, MessageCircle, Clock, Edit2, Save, Send, UserPlus, CheckCircle, XCircle, Archive, UserCheck, Upload, Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Event, EventAttendee, AudienceSegment, MessageTemplate } from '@/types/contact';
import { mockContacts } from '@/data/mockData';
import { cn } from '@/lib/utils';

interface EventDetailDialogProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (event: Event) => void;
  onArchive?: (event: Event) => void;
}

const audienceSegments: AudienceSegment[] = [
  { id: '1', name: 'Bangalore Contacts', description: '', filters: {}, memberIds: ['1', '5'], memberCount: 2, createdAt: '', createdBy: '', updatedAt: '' },
  { id: '2', name: 'Tech Department', description: '', filters: {}, memberIds: ['1'], memberCount: 1, createdAt: '', createdBy: '', updatedAt: '' },
  { id: '3', name: 'High Engagement', description: '', filters: {}, memberIds: ['1', '4'], memberCount: 2, createdAt: '', createdBy: '', updatedAt: '' },
];

const emailTemplates: MessageTemplate[] = [
  { id: '1', name: 'Event Invitation', type: 'email', subject: 'You are invited to {{event_name}}', content: 'Dear {{name}},\n\nWe invite you to...', createdAt: '', createdBy: '', updatedAt: '' },
  { id: '2', name: 'Event Reminder', type: 'email', subject: 'Reminder: {{event_name}}', content: 'Dear {{name}},\n\nReminder about...', createdAt: '', createdBy: '', updatedAt: '' },
  { id: '3', name: 'Thank You Follow-up', type: 'email', subject: 'Thank you for attending {{event_name}}', content: 'Dear {{name}},\n\nThank you...', createdAt: '', createdBy: '', updatedAt: '' },
];

const whatsappTemplates: MessageTemplate[] = [
  { id: '4', name: 'Event Invitation WhatsApp', type: 'whatsapp', content: 'Hi {{name}}! 👋 You are invited to {{event_name}}...', createdAt: '', createdBy: '', updatedAt: '' },
  { id: '5', name: 'Event Reminder WhatsApp', type: 'whatsapp', content: 'Hi {{name}}! Reminder about {{event_name}}...', createdAt: '', createdBy: '', updatedAt: '' },
];

const senderOptions = [
  { id: '1', type: 'email', name: 'CRM Team', address: 'crm@company.com' },
  { id: '2', type: 'email', name: 'Events Team', address: 'events@company.com' },
  { id: '3', type: 'whatsapp', name: 'Main WhatsApp', address: '+1 555 123 4567' },
];

const locationOptions = ['Bangalore', 'Mumbai', 'Kochi', 'Delhi', 'Chennai', 'Hyderabad'];
const departmentOptions = ['Technology', 'Analytics', 'Operations', 'R&D', 'Biotech'];
const typeOptions = [
  { value: 'customer', label: 'Customer' },
  { value: 'lead', label: 'Lead' },
  { value: 'partner', label: 'Partner' },
  { value: 'employee', label: 'Employee' },
];

export function EventDetailDialog({ event, open, onOpenChange, onSave, onArchive }: EventDetailDialogProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedEvent, setEditedEvent] = useState<Event | null>(null);
  const [showAddAttendeesDialog, setShowAddAttendeesDialog] = useState(false);
  const [showSendInviteDialog, setShowSendInviteDialog] = useState(false);
  const [showCompleteEventDialog, setShowCompleteEventDialog] = useState(false);
  const [attendeeTab, setAttendeeTab] = useState<'not-sent' | 'sent'>('not-sent');
  const [sendType, setSendType] = useState<'email' | 'whatsapp'>('email');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedSender, setSelectedSender] = useState('');
  const [sendToNew, setSendToNew] = useState(false);
  const [addMode, setAddMode] = useState<'segments' | 'individuals'>('segments');
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const [selectedIndividuals, setSelectedIndividuals] = useState<string[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [attendedIds, setAttendedIds] = useState<string[]>([]);
  const [attendanceFileName, setAttendanceFileName] = useState('');
  const [sendFollowUp, setSendFollowUp] = useState(false);
  const [followUpType, setFollowUpType] = useState<'email' | 'whatsapp'>('email');
  const [followUpTemplate, setFollowUpTemplate] = useState('');
  const [followUpSender, setFollowUpSender] = useState('');
  const [segmentSearch, setSegmentSearch] = useState('');

  useEffect(() => {
    if (event) {
      setEditedEvent(event);
      if (!event.attendees && event.invitedCount > 0) {
        const initialAttendees: EventAttendee[] = mockContacts.slice(0, Math.min(event.invitedCount, 5)).map((c) => ({
          contactId: c.id,
          name: `${c.firstName} ${c.lastName}`,
          email: c.email,
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
      setContactSearch('');
      setAttendanceFileName('');
    }
  }, [open]);

  const attendees = editedEvent?.attendees || [];

  const filteredContacts = useMemo(() => {
    const existingIds = attendees.map((a) => a.contactId);
    return mockContacts.filter((c) => {
      if (existingIds.includes(c.id)) return false;
      const matchesSearch = contactSearch === '' || `${c.firstName} ${c.lastName} ${c.email}`.toLowerCase().includes(contactSearch.toLowerCase());
      const matchesLocation = filterLocation === 'all' || c.currentCity?.toLowerCase().includes(filterLocation.toLowerCase());
      const matchesDepartment = filterDepartment === 'all' || c.department === filterDepartment;
      const matchesType = filterType === 'all' || c.type === filterType;
      return matchesSearch && matchesLocation && matchesDepartment && matchesType;
    });
  }, [contactSearch, filterLocation, filterDepartment, filterType, attendees]);

  const filteredSegments = useMemo(() => {
    if (!segmentSearch) return audienceSegments;
    return audienceSegments.filter((s) => s.name.toLowerCase().includes(segmentSearch.toLowerCase()));
  }, [segmentSearch]);

  const displayEvent = isEditing ? editedEvent! : (editedEvent || event);
  const notSentAttendees = attendees.filter((a) => !a.inviteSent);
  const sentAttendees = attendees.filter((a) => a.inviteSent);
  const confirmationRate = displayEvent && displayEvent.invitedCount > 0 ? Math.round((displayEvent.confirmedCount / displayEvent.invitedCount) * 100) : 0;
  const attendanceRate = displayEvent && displayEvent.status === 'completed' && displayEvent.confirmedCount > 0 ? Math.round((displayEvent.attendedCount / displayEvent.confirmedCount) * 100) : 0;
  const emailOpenRate = displayEvent && displayEvent.emailsSent > 0 ? Math.round((displayEvent.emailsOpened / displayEvent.emailsSent) * 100) : 0;
  const filteredSenders = senderOptions.filter((s) => s.type === sendType);
  const filteredTemplates = sendType === 'email' ? emailTemplates : whatsappTemplates;
  const followUpSenders = senderOptions.filter((s) => s.type === followUpType);
  const followUpTemplates = followUpType === 'email' ? emailTemplates : whatsappTemplates;
  const attendedCount = attendedIds.length;
  const notAttendedCount = attendees.filter((a) => a.inviteSent).length - attendedIds.length;

  const statusStyles: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground', scheduled: 'bg-info/10 text-info', ongoing: 'bg-success/10 text-success',
    completed: 'bg-secondary text-secondary-foreground', cancelled: 'bg-destructive/10 text-destructive', archived: 'bg-muted text-muted-foreground',
  };
  const typeStyles: Record<string, string> = {
    conference: 'bg-primary/10 text-primary', webinar: 'bg-info/10 text-info', meetup: 'bg-success/10 text-success',
    workshop: 'bg-warning/10 text-warning', networking: 'bg-accent/10 text-accent', training: 'bg-chart-5/10 text-chart-5', other: 'bg-muted text-muted-foreground',
  };

  if (!event) return null;

  const handleSave = () => {
    if (editedEvent) {
      onSave?.(editedEvent);
      setIsEditing(false);
      toast({ title: 'Success', description: 'Event updated successfully' });
    }
  };
  const updateField = (field: keyof Event, value: any) => { if (editedEvent) setEditedEvent({ ...editedEvent, [field]: value }); };
  const handleSendInvites = (onlyNew: boolean = false) => { setSendToNew(onlyNew); setShowSendInviteDialog(true); };

  const handleConfirmSendInvites = () => {
    if (!selectedTemplate || !selectedSender) { toast({ title: 'Error', description: 'Please select a template and sender', variant: 'destructive' }); return; }
    if (editedEvent) {
      const targetAttendees = sendToNew ? notSentAttendees : attendees.filter((a) => !a.inviteSent);
      const updatedAttendees = (editedEvent.attendees || []).map((a) => !a.inviteSent ? { ...a, inviteSent: true, inviteSentDate: new Date().toISOString() } : a);
      const updated: Event = { ...editedEvent, attendees: updatedAttendees, emailsSent: sendType === 'email' ? (editedEvent.emailsSent || 0) + targetAttendees.length : editedEvent.emailsSent, whatsappSent: sendType === 'whatsapp' ? (editedEvent.whatsappSent || 0) + targetAttendees.length : editedEvent.whatsappSent };
      setEditedEvent(updated); onSave?.(updated);
    }
    setShowSendInviteDialog(false); setSelectedTemplate(''); setSelectedSender('');
    toast({ title: 'Invites Sent', description: `${sendType === 'email' ? 'Email' : 'WhatsApp'} invitations sent successfully` });
  };

  const handleCancelEvent = () => { if (editedEvent) { const updated = { ...editedEvent, status: 'cancelled' as const }; setEditedEvent(updated); onSave?.(updated); toast({ title: 'Event Cancelled' }); } };
  const handleOpenCompleteEvent = () => { const confirmedIds = attendees.filter((a) => a.confirmed).map((a) => a.contactId); setAttendedIds(confirmedIds); setShowCompleteEventDialog(true); };

  const handleCompleteEvent = () => {
    if (!editedEvent) return;
    const updatedAttendees = editedEvent.attendees?.map((a) => ({ ...a, attended: attendedIds.includes(a.contactId) })) || [];
    const updated: Event = { ...editedEvent, status: 'completed' as const, attendees: updatedAttendees, attendedCount: attendedIds.length };
    setEditedEvent(updated); onSave?.(updated);
    if (sendFollowUp && followUpTemplate && followUpSender) {
      toast({ title: 'AI follow-up queued', description: `Prepared one message for ${attendedIds.length} attendees and another for ${notAttendedCount} no-shows.` });
    }
    setShowCompleteEventDialog(false); toast({ title: 'Event Completed' });
  };

  const handleArchiveEvent = () => { if (editedEvent) { onArchive?.({ ...editedEvent, status: 'archived' as Event['status'] }); onOpenChange(false); toast({ title: 'Event Archived' }); } };
  const toggleSegment = (id: string) => setSelectedSegments((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  const toggleIndividual = (id: string) => setSelectedIndividuals((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  const toggleAttended = (id: string) => setAttendedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);

  const handleAddAttendees = () => {
    if (!editedEvent) return;
    const segmentMemberIds = selectedSegments.flatMap((segId) => audienceSegments.find((s) => s.id === segId)?.memberIds || []);
    const allNewIds = [...new Set([...segmentMemberIds, ...selectedIndividuals])];
    const existingIds = attendees.map((a) => a.contactId);
    const uniqueNewIds = allNewIds.filter((id) => !existingIds.includes(id));
    if (uniqueNewIds.length === 0) { toast({ title: 'No new attendees' }); return; }
    const newAttendees: EventAttendee[] = uniqueNewIds.map((id) => {
      const c = mockContacts.find((a) => a.id === id);
      return { contactId: id, name: c ? `${c.firstName} ${c.lastName}` : 'Unknown', email: c?.email || '', inviteSent: false, confirmed: false, attended: false, addedLater: true };
    });
    const updated: Event = { ...editedEvent, attendees: [...(editedEvent.attendees || []), ...newAttendees], invitedCount: (editedEvent.invitedCount || 0) + newAttendees.length };
    setEditedEvent(updated); onSave?.(updated); setSelectedSegments([]); setSelectedIndividuals([]);
    setShowAddAttendeesDialog(false); toast({ title: 'Attendees Added', description: `${newAttendees.length} attendees added` });
  };

  const clearFilters = () => { setContactSearch(''); setFilterLocation('all'); setFilterDepartment('all'); setFilterType('all'); };
  const selectAllFiltered = () => { const ids = filteredContacts.map((c) => c.id); setSelectedIndividuals((prev) => [...new Set([...prev, ...ids])]); };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[96vw] max-w-[1500px] h-[92vh] flex flex-col p-0">
          <DialogHeader className="flex flex-row items-start justify-between border-b p-6 pb-4 shrink-0">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Badge className={cn('capitalize', typeStyles[displayEvent.type] || typeStyles.other)}>{displayEvent.type}</Badge>
                <Badge variant="outline" className={statusStyles[displayEvent.status] || statusStyles.draft}>{displayEvent.status}</Badge>
                {displayEvent.isVirtual && <Badge variant="outline">Virtual</Badge>}
              </div>
              <DialogTitle className="text-xl">{displayEvent.title}</DialogTitle>
              <DialogDescription className="text-sm">AI-first event orchestration with attendee review, attendance upload, and follow-up generation.</DialogDescription>
            </div>
            <Button variant={isEditing ? 'default' : 'outline'} size="sm" onClick={() => { if (isEditing) handleSave(); else { setEditedEvent(displayEvent); setIsEditing(true); } }}>{isEditing ? <><Save className="mr-2 h-4 w-4" /> Save</> : <><Edit2 className="mr-2 h-4 w-4" /> Edit</>}</Button>
          </DialogHeader>

          <div className="flex gap-2 border-b px-6 py-4 flex-wrap shrink-0">
            <Button size="sm" onClick={() => handleSendInvites(false)} disabled={notSentAttendees.length === 0}><Send className="mr-2 h-4 w-4" />Send Invites ({notSentAttendees.length})</Button>
            <Button size="sm" variant="outline" onClick={() => setShowAddAttendeesDialog(true)}><UserPlus className="mr-2 h-4 w-4" />Add Attendees</Button>
            {displayEvent.status !== 'cancelled' && displayEvent.status !== 'completed' && displayEvent.status !== 'archived' && (<><Button size="sm" variant="outline" onClick={handleOpenCompleteEvent}><UserCheck className="mr-2 h-4 w-4" />Mark Complete</Button><Button size="sm" variant="outline" className="text-destructive" onClick={handleCancelEvent}><XCircle className="mr-2 h-4 w-4" />Cancel Event</Button></>)}
            {displayEvent.status === 'completed' && <Button size="sm" variant="outline" onClick={handleArchiveEvent}><Archive className="mr-2 h-4 w-4" />Archive</Button>}
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
                <div className="space-y-2"><Label>Description</Label>{isEditing ? <Textarea value={editedEvent?.description} onChange={(e) => updateField('description', e.target.value)} rows={4} /> : <p className="text-sm text-muted-foreground">{displayEvent.description}</p>}</div>
                <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Date</Label>{isEditing ? <Input type="date" value={editedEvent?.date} onChange={(e) => updateField('date', e.target.value)} /> : <p className="text-sm">{new Date(displayEvent.date).toLocaleDateString()}</p>}</div><div className="space-y-2"><Label className="flex items-center gap-2"><Clock className="h-4 w-4" /> Time</Label>{isEditing ? <Input type="time" value={editedEvent?.time} onChange={(e) => updateField('time', e.target.value)} /> : <p className="text-sm">{displayEvent.time}</p>}</div></div>
                <div className="space-y-2"><Label className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Location</Label>{isEditing ? <Input value={editedEvent?.location} onChange={(e) => updateField('location', e.target.value)} /> : <p className="text-sm">{displayEvent.location}</p>}</div>
              </TabsContent>

              <TabsContent value="attendees" className="mt-4 space-y-4">
                <Tabs value={attendeeTab} onValueChange={(v) => setAttendeeTab(v as any)}><TabsList><TabsTrigger value="not-sent" className="gap-2">Invite Not Sent<Badge variant="secondary">{notSentAttendees.length}</Badge></TabsTrigger><TabsTrigger value="sent" className="gap-2">Invite Sent<Badge variant="secondary">{sentAttendees.length}</Badge></TabsTrigger></TabsList></Tabs>
                {attendeeTab === 'not-sent' && notSentAttendees.length > 0 && (<div className="flex justify-end"><Button size="sm" onClick={() => handleSendInvites(true)}><Send className="mr-2 h-4 w-4" />Send to All ({notSentAttendees.length})</Button></div>)}
                <div className="space-y-2">{(attendeeTab === 'not-sent' ? notSentAttendees : sentAttendees).map((attendee) => (<div key={attendee.contactId} className="flex items-center justify-between rounded-lg border bg-muted/30 p-3"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10"><span className="text-sm font-medium">{attendee.name.split(' ').map((n) => n[0]).join('')}</span></div><div><p className="text-sm font-medium">{attendee.name}</p><p className="text-xs text-muted-foreground">{attendee.email}</p></div></div><div className="flex items-center gap-2 flex-wrap justify-end">{attendee.addedLater && <Badge variant="outline" className="text-xs">Added Later</Badge>}{attendee.inviteSent ? <Badge variant="secondary" className="text-xs"><CheckCircle className="mr-1 h-3 w-3" />Invited</Badge> : <Badge variant="outline" className="text-xs text-warning">Pending</Badge>}{attendee.confirmed && <Badge className="text-xs bg-success text-success-foreground">Confirmed</Badge>}{attendee.attended && <Badge className="text-xs bg-primary text-primary-foreground">Attended</Badge>}</div></div>))}{(attendeeTab === 'not-sent' ? notSentAttendees : sentAttendees).length === 0 && (<div className="py-8 text-center text-muted-foreground"><Users className="mx-auto mb-2 h-8 w-8 opacity-50" /><p>No attendees in this category</p></div>)}</div>
              </TabsContent>

              <TabsContent value="metrics" className="mt-4 space-y-6"><div className="grid grid-cols-3 gap-4"><div className="rounded-lg border p-4 text-center"><p className="text-3xl font-bold">{displayEvent.invitedCount}</p><p className="text-sm text-muted-foreground">Invited</p></div><div className="rounded-lg border p-4 text-center"><p className="text-3xl font-bold text-success">{displayEvent.confirmedCount}</p><p className="text-sm text-muted-foreground">Confirmed</p></div><div className="rounded-lg border p-4 text-center"><p className="text-3xl font-bold text-primary">{displayEvent.attendedCount}</p><p className="text-sm text-muted-foreground">Attended</p></div></div><div className="space-y-4"><div><div className="mb-2 flex justify-between"><span className="text-sm font-medium">Confirmation Rate</span><span className="text-sm font-medium">{confirmationRate}%</span></div><Progress value={confirmationRate} /></div>{displayEvent.status === 'completed' && <div><div className="mb-2 flex justify-between"><span className="text-sm font-medium">Attendance Rate</span><span className="text-sm font-medium">{attendanceRate}%</span></div><Progress value={attendanceRate} /></div>}</div></TabsContent>

              <TabsContent value="outreach" className="mt-4 space-y-4"><div className="grid grid-cols-2 gap-4"><div className="rounded-lg border p-4"><div className="mb-3 flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /><span className="font-medium">Email Outreach</span></div><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Sent</span><span>{displayEvent.emailsSent}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Opened</span><span>{displayEvent.emailsOpened} ({emailOpenRate}%)</span></div></div></div><div className="rounded-lg border p-4"><div className="mb-3 flex items-center gap-2"><MessageCircle className="h-4 w-4 text-success" /><span className="font-medium">WhatsApp Outreach</span></div><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Sent</span><span>{displayEvent.whatsappSent}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Read</span><span>{displayEvent.whatsappRead} ({displayEvent.whatsappSent > 0 ? Math.round((displayEvent.whatsappRead / displayEvent.whatsappSent) * 100) : 0}%)</span></div></div></div></div></TabsContent>
            </Tabs>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={showSendInviteDialog} onOpenChange={setShowSendInviteDialog}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Send Invitations</DialogTitle><DialogDescription>Send to {notSentAttendees.length} pending attendees</DialogDescription></DialogHeader><div className="mt-4 space-y-4"><Tabs value={sendType} onValueChange={(v) => setSendType(v as 'email' | 'whatsapp')}><TabsList className="w-full"><TabsTrigger value="email" className="flex-1"><Mail className="mr-2 h-4 w-4" />Email</TabsTrigger><TabsTrigger value="whatsapp" className="flex-1"><MessageCircle className="mr-2 h-4 w-4" />WhatsApp</TabsTrigger></TabsList></Tabs><div className="space-y-2"><Label>Select Template</Label><Select value={selectedTemplate} onValueChange={setSelectedTemplate}><SelectTrigger><SelectValue placeholder="Choose a template" /></SelectTrigger><SelectContent>{filteredTemplates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Send From</Label><Select value={selectedSender} onValueChange={setSelectedSender}><SelectTrigger><SelectValue placeholder="Choose sender" /></SelectTrigger><SelectContent>{filteredSenders.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.address})</SelectItem>)}</SelectContent></Select></div><div className="flex justify-end gap-3 border-t pt-4"><Button variant="outline" onClick={() => setShowSendInviteDialog(false)}>Cancel</Button><Button onClick={handleConfirmSendInvites}><Send className="mr-2 h-4 w-4" />Send ({notSentAttendees.length})</Button></div></div></DialogContent>
      </Dialog>

      <Dialog open={showAddAttendeesDialog} onOpenChange={setShowAddAttendeesDialog}>
        <DialogContent className="w-[96vw] max-w-[1450px] h-[92vh] flex flex-col p-0">
          <DialogHeader className="dialog-header-tight"><DialogTitle>Add Attendees</DialogTitle><DialogDescription>Use the wide layout to see filters and many people at once.</DialogDescription></DialogHeader>
          <div className="dialog-body-scroll grid min-h-0 lg:grid-cols-[300px_minmax(0,1fr)]">
            <aside className="border-b bg-muted/30 p-5 lg:border-b-0 lg:border-r">
              <div className="space-y-4">
                <div className="rounded-2xl border bg-card p-4"><div className="mb-2 flex items-center gap-2 text-sm font-medium"><Wand2 className="h-4 w-4 text-primary" /> AI-first flow</div><p className="text-sm text-muted-foreground">This dialog is for review after AI suggests attendees elsewhere.</p></div>
                <div className="rounded-2xl border bg-card p-4"><div className="flex items-center justify-between"><p className="text-sm font-medium">Selected</p><Badge variant="secondary">{selectedSegments.length + selectedIndividuals.length}</Badge></div><p className="mt-2 text-sm text-muted-foreground">{selectedSegments.length} segments and {selectedIndividuals.length} individuals chosen.</p></div>
              </div>
            </aside>
            <div className="flex min-h-0 flex-col p-5">
              <Tabs value={addMode} onValueChange={(v) => setAddMode(v as any)} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <TabsList className="mb-4 shrink-0"><TabsTrigger value="segments">Segments</TabsTrigger><TabsTrigger value="individuals">Individuals</TabsTrigger></TabsList>
                <TabsContent value="segments" className="mt-0 flex min-h-0 flex-1 flex-col"><div className="mb-4 shrink-0"><div className="relative"><Input placeholder="Search segments..." value={segmentSearch} onChange={(e) => setSegmentSearch(e.target.value)} className="pl-9" /><Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /></div></div><ScrollArea className="flex-1 rounded-xl border bg-card"><div className="space-y-2 p-3">{filteredSegments.map((segment) => (<div key={segment.id} className={cn('flex items-center justify-between rounded-xl border p-4 cursor-pointer hover:bg-muted/50', selectedSegments.includes(segment.id) && 'bg-primary/10 border-primary/20')} onClick={() => toggleSegment(segment.id)}><div className="flex items-center gap-3"><Checkbox checked={selectedSegments.includes(segment.id)} /><div><p className="font-medium">{segment.name}</p><p className="text-sm text-muted-foreground">{segment.memberCount} members</p></div></div><Badge variant="secondary">{segment.memberCount}</Badge></div>))}</div></ScrollArea></TabsContent>
                <TabsContent value="individuals" className="mt-0 flex min-h-0 flex-1 flex-col"><div className="mb-4 flex flex-wrap gap-2 shrink-0"><div className="relative min-w-[220px] flex-1"><Input placeholder="Search contacts..." value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} className="pl-9" /><Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /></div><Select value={filterLocation} onValueChange={setFilterLocation}><SelectTrigger className="w-[140px]"><SelectValue placeholder="Location" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{locationOptions.map((loc) => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}</SelectContent></Select><Select value={filterDepartment} onValueChange={setFilterDepartment}><SelectTrigger className="w-[140px]"><SelectValue placeholder="Dept" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{departmentOptions.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select><Select value={filterType} onValueChange={setFilterType}><SelectTrigger className="w-[120px]"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem>{typeOptions.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select>{(filterLocation !== 'all' || filterDepartment !== 'all' || filterType !== 'all') && <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button>}</div><div className="mb-3 flex items-center justify-between shrink-0"><Button variant="outline" size="sm" onClick={selectAllFiltered}>Select All ({filteredContacts.length})</Button><Badge variant="secondary">{selectedIndividuals.length} selected</Badge></div><ScrollArea className="flex-1 rounded-xl border bg-card"><div className="space-y-2 p-3">{filteredContacts.map((c) => (<div key={c.id} className={cn('flex items-center gap-3 rounded-xl border p-3 cursor-pointer hover:bg-muted/50', selectedIndividuals.includes(c.id) && 'bg-primary/10 border-primary/20')} onClick={() => toggleIndividual(c.id)}><Checkbox checked={selectedIndividuals.includes(c.id)} /><div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10"><span className="text-xs font-medium">{c.firstName[0]}{c.lastName[0]}</span></div><div className="min-w-0 flex-1"><p className="text-sm font-medium">{c.firstName} {c.lastName}</p><p className="truncate text-xs text-muted-foreground">{c.email}</p></div><Badge variant="outline" className="text-xs capitalize">{c.type}</Badge></div>))}</div></ScrollArea></TabsContent>
              </Tabs>
            </div>
          </div>
          <div className="dialog-footer-bar flex justify-end gap-3"><Button variant="outline" onClick={() => { setSelectedSegments([]); setSelectedIndividuals([]); setShowAddAttendeesDialog(false); }}>Cancel</Button><Button onClick={handleAddAttendees} disabled={selectedSegments.length === 0 && selectedIndividuals.length === 0}>Add Attendees</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCompleteEventDialog} onOpenChange={setShowCompleteEventDialog}>
        <DialogContent className="w-[96vw] max-w-[1450px] h-[92vh] flex flex-col p-0">
          <DialogHeader className="dialog-header-tight"><DialogTitle>Complete Event</DialogTitle><DialogDescription>Upload attendance if you have it, mark attendees, then trigger AI follow-ups for attendees and no-shows.</DialogDescription></DialogHeader>
          <div className="dialog-body-scroll grid min-h-0 lg:grid-cols-[300px_minmax(0,1fr)]">
            <aside className="border-b bg-muted/30 p-5 lg:border-b-0 lg:border-r">
              <div className="space-y-4">
                <div className="rounded-2xl border bg-card p-4"><div className="mb-2 flex items-center gap-2 text-sm font-medium"><Upload className="h-4 w-4 text-primary" /> Attendance upload</div><Label htmlFor="attendance-upload" className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 px-4 py-6 text-sm text-muted-foreground"><Upload className="h-4 w-4" />{attendanceFileName || 'Upload CSV or sheet'}<Input id="attendance-upload" type="file" className="hidden" onChange={(e) => setAttendanceFileName(e.target.files?.[0]?.name || '')} /></Label><p className="mt-2 text-xs text-muted-foreground">This is a UI placeholder for attendance import in the AI-first flow.</p></div>
                <div className="rounded-2xl border bg-card p-4"><div className="flex items-center justify-between"><p className="text-sm font-medium">Attendance summary</p><Badge variant="secondary">{attendedCount}</Badge></div><p className="mt-2 text-sm text-muted-foreground">{attendedCount} attended, {notAttendedCount} did not attend.</p></div>
              </div>
            </aside>
            <div className="flex min-h-0 flex-col p-5">
              <div className="mb-4 flex items-center justify-between shrink-0"><Label className="text-base font-medium">Mark Attendance</Label><div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => setAttendedIds(attendees.map((a) => a.contactId))}>Select All</Button><Button variant="outline" size="sm" onClick={() => setAttendedIds([])}>Deselect All</Button></div></div>
              <ScrollArea className="flex-1 rounded-xl border bg-card"><div className="space-y-2 p-3">{attendees.filter((a) => a.inviteSent).map((attendee) => (<div key={attendee.contactId} className={cn('flex items-center gap-3 rounded-xl border p-3 cursor-pointer hover:bg-muted/50', attendedIds.includes(attendee.contactId) && 'bg-success/10 border-success/20')} onClick={() => toggleAttended(attendee.contactId)}><Checkbox checked={attendedIds.includes(attendee.contactId)} /><div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10"><span className="text-xs font-medium">{attendee.name.split(' ').map((n) => n[0]).join('')}</span></div><div className="min-w-0 flex-1"><p className="text-sm font-medium">{attendee.name}</p><p className="truncate text-xs text-muted-foreground">{attendee.email}</p></div>{attendee.confirmed && <Badge variant="secondary" className="text-xs">Confirmed</Badge>}</div>))}</div></ScrollArea>
              <div className="mt-4 rounded-2xl border bg-muted/30 p-4"><div className="mb-3 flex items-center gap-2 text-sm font-medium"><Sparkles className="h-4 w-4 text-primary" /> AI follow-up everywhere</div><div className="flex items-center gap-3"><Checkbox id="send-followup" checked={sendFollowUp} onCheckedChange={(c) => setSendFollowUp(c === true)} /><Label htmlFor="send-followup" className="cursor-pointer">Prepare AI follow-ups for attendees and absentees</Label></div>{sendFollowUp && (<div className="mt-4 space-y-4"><Tabs value={followUpType} onValueChange={(v) => setFollowUpType(v as 'email' | 'whatsapp')}><TabsList><TabsTrigger value="email"><Mail className="mr-2 h-4 w-4" />Email</TabsTrigger><TabsTrigger value="whatsapp"><MessageCircle className="mr-2 h-4 w-4" />WhatsApp</TabsTrigger></TabsList></Tabs><div className="grid gap-4 md:grid-cols-2"><div className="rounded-xl border bg-card p-4"><p className="text-sm font-medium">Attended</p><p className="mt-2 text-sm text-muted-foreground">AI will prepare a bulk message for {attendedCount} attendees.</p></div><div className="rounded-xl border bg-card p-4"><p className="text-sm font-medium">Did not attend</p><p className="mt-2 text-sm text-muted-foreground">AI will prepare a separate bulk message for {notAttendedCount} absentees.</p></div></div><div className="space-y-2"><Label>Template</Label><Select value={followUpTemplate} onValueChange={setFollowUpTemplate}><SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger><SelectContent>{followUpTemplates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Send From</Label><Select value={followUpSender} onValueChange={setFollowUpSender}><SelectTrigger><SelectValue placeholder="Select sender" /></SelectTrigger><SelectContent>{followUpSenders.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.address})</SelectItem>)}</SelectContent></Select></div></div>)}</div>
            </div>
          </div>
          <div className="dialog-footer-bar flex justify-end gap-3"><Button variant="outline" onClick={() => setShowCompleteEventDialog(false)}>Cancel</Button><Button onClick={handleCompleteEvent}><CheckCircle className="mr-2 h-4 w-4" />Complete Event</Button></div>
        </DialogContent>
      </Dialog>
    </>
  );
}
