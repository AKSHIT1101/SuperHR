import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPatch } from '@/lib/api';
import { PersonSelector } from './PersonSelector';

type BackendEvent = {
  event_id: number;
  name: string;
  description?: string | null;
  location?: string | null;
  event_date?: string | null;
  status: 'draft' | 'scheduled' | 'completed' | 'cancelled';
};

type BackendEventContact = {
  contact_id: number;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  rsvp_status?: 'invited' | 'attending' | 'declined' | 'maybe';
};

export function EventDetailDialogSimple(props: {
  eventId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: Array<{ id: string; firstName: string; lastName: string; email?: string; phone?: string }>;
  segments: Array<{ id: string; name: string; memberCount: number }>;
  onUpdated?: () => void;
}) {
  const { toast } = useToast();
  const { eventId, open, onOpenChange, contacts, segments, onUpdated } = props;

  const [loading, setLoading] = useState(false);
  const [event, setEvent] = useState<BackendEvent | null>(null);
  const [invitees, setInvitees] = useState<BackendEventContact[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showInviteeSelector, setShowInviteeSelector] = useState(false);
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const [selectedIndividuals, setSelectedIndividuals] = useState<string[]>([]);

  const [draft, setDraft] = useState({
    name: '',
    description: '',
    location: '',
    date: '',
    time: '',
    status: 'draft' as BackendEvent['status'],
  });

  const selectedContactIds = useMemo(() => {
    const ids = [...new Set(selectedIndividuals)];
    return ids.map((x) => Number(x)).filter((n) => Number.isFinite(n));
  }, [selectedIndividuals]);

  const loadEvent = async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const data = await apiGet<{ event: BackendEvent; contacts: BackendEventContact[] }>(`/events/${eventId}`);
      setEvent(data.event);
      setInvitees(data.contacts || []);

      const dt = data.event.event_date ? new Date(data.event.event_date) : null;
      const date = dt && !Number.isNaN(dt.getTime()) ? dt.toISOString().slice(0, 10) : '';
      const time = dt && !Number.isNaN(dt.getTime()) ? dt.toISOString().slice(11, 16) : '';

      setDraft({
        name: data.event.name || '',
        description: data.event.description || '',
        location: data.event.location || '',
        date,
        time,
        status: data.event.status || 'draft',
      });

      // Seed selector with current invitees (individual IDs)
      setSelectedIndividuals((data.contacts || []).map((c) => String(c.contact_id)));
      setSelectedSegments([]);
    } catch (e: any) {
      toast({ title: 'Failed to load event', description: e?.message ?? 'Unknown error', variant: 'destructive' });
      setEvent(null);
      setInvitees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadEvent();
    } else {
      setIsEditing(false);
      setShowInviteeSelector(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, eventId]);

  const handleSave = async () => {
    if (!eventId) return;
    try {
      const dt = draft.date && draft.time ? new Date(`${draft.date}T${draft.time}:00`) : null;
      const event_date = dt && !Number.isNaN(dt.getTime()) ? dt.toISOString() : null;

      await apiPatch(`/events/${eventId}`, {
        name: draft.name,
        description: draft.description || null,
        location: draft.location || null,
        event_date,
        status: draft.status,
        contact_ids: selectedContactIds,
      });

      toast({ title: 'Event updated' });
      setIsEditing(false);
      setShowInviteeSelector(false);
      await loadEvent();
      onUpdated?.();
    } catch (e: any) {
      toast({ title: 'Failed to update event', description: e?.message ?? 'Unknown error', variant: 'destructive' });
    }
  };

  const handleUpdateRsvp = async (contact_id: number, rsvp_status: string) => {
    if (!eventId) return;
    try {
      await apiPatch(`/events/${eventId}/rsvp`, { contact_id, rsvp_status });
      setInvitees((prev) => prev.map((c) => (c.contact_id === contact_id ? { ...c, rsvp_status: rsvp_status as any } : c)));
    } catch (e: any) {
      toast({ title: 'Failed to update RSVP', description: e?.message ?? 'Unknown error', variant: 'destructive' });
    }
  };

  const statusBadge: Record<string, string> = {
    draft: 'bg-muted text-muted-foreground',
    scheduled: 'bg-info/10 text-info',
    completed: 'bg-secondary text-secondary-foreground',
    cancelled: 'bg-destructive/10 text-destructive',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-[1400px] h-[92vh] p-0">
        <div className="dialog-shell">
          <DialogHeader className="dialog-header-tight">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <DialogTitle className="truncate">{event?.name || 'Event'}</DialogTitle>
                <DialogDescription>Manage event details and invitees.</DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                {event?.status && <Badge variant="outline" className={statusBadge[event.status] || statusBadge.draft}>{event.status}</Badge>}
                <Button variant={isEditing ? 'default' : 'outline'} onClick={() => (isEditing ? handleSave() : setIsEditing(true))}>
                  {isEditing ? 'Save' : 'Edit'}
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="dialog-body-scroll grid min-h-0 lg:grid-cols-[420px_minmax(0,1fr)]">
            <aside className="border-b bg-muted/20 p-6 lg:border-b-0 lg:border-r">
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Event name</Label>
                    <Input disabled={!isEditing} value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea disabled={!isEditing} value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} rows={4} />
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input disabled={!isEditing} value={draft.location} onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input disabled={!isEditing} type="date" value={draft.date} onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Time</Label>
                      <Input disabled={!isEditing} type="time" value={draft.time} onChange={(e) => setDraft((d) => ({ ...d, time: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select disabled={!isEditing} value={draft.status} onValueChange={(v) => setDraft((d) => ({ ...d, status: v as any }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="rounded-2xl border bg-card p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Invitees</p>
                      <Badge variant="secondary">{invitees.length}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">Edit invitees to replace the list.</p>
                    <Button
                      className="mt-3 w-full"
                      variant="outline"
                      disabled={!isEditing}
                      onClick={() => setShowInviteeSelector(true)}
                    >
                      Edit invitees
                    </Button>
                  </div>
                </div>
              )}
            </aside>

            <div className="flex min-h-0 flex-col p-6">
              {showInviteeSelector && isEditing ? (
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
                  className="flex-1 min-h-0"
                />
              ) : (
                <ScrollArea className="flex-1 rounded-xl border bg-card">
                  <div className="space-y-2 p-3">
                    {invitees.length === 0 ? (
                      <div className="py-10 text-center text-muted-foreground">No invitees yet.</div>
                    ) : (
                      invitees.map((c) => (
                        <div key={c.contact_id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{c.first_name} {c.last_name}</p>
                            <p className="truncate text-xs text-muted-foreground">{c.email || c.phone || ''}</p>
                          </div>
                          <Select
                            value={c.rsvp_status || 'invited'}
                            onValueChange={(v) => handleUpdateRsvp(c.contact_id, v)}
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="invited">Invited</SelectItem>
                              <SelectItem value="attending">Attending</SelectItem>
                              <SelectItem value="declined">Declined</SelectItem>
                              <SelectItem value="maybe">Maybe</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

