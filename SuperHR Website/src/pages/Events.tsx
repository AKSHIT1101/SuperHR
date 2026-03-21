import { useEffect, useMemo, useState } from 'react';
import { Plus, Calendar as CalendarIcon, Filter, Search, Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EventCard } from '@/components/events/EventCard';
import { CreateEventDialog } from '@/components/dialogs/CreateEventDialog';
import { EventDetailDialogSimple } from '@/components/dialogs/EventDetailDialogSimple';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Event } from '@/types/contact';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const aiEventSuggestions = [
  'Create a Bangalore meetup for high-engagement contacts next Friday evening',
  'Plan a virtual AI webinar for technology leaders and prefill attendees',
  'Set up a client workshop for medium-engagement Mumbai leads',
];

export default function Events() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [eventEditorOpen, setEventEditorOpen] = useState(false);
  const [eventEditorMode, setEventEditorMode] = useState<'create' | 'edit'>('create');
  const [eventEditorEventId, setEventEditorEventId] = useState<number | null>(null);
  const [eventEditorInitialForm, setEventEditorInitialForm] = useState<Partial<{
    title: string;
    description: string;
    location: string;
    date: string;
    time: string;
    type: Event['type'];
    isVirtual: boolean;
    capacity: string;
    status: 'draft' | 'scheduled' | 'completed' | 'cancelled';
  }>>({});
  const [eventEditorInitialSelectedSegments, setEventEditorInitialSelectedSegments] = useState<string[]>([]);
  const [eventEditorInitialSelectedIndividuals, setEventEditorInitialSelectedIndividuals] = useState<string[]>([]);
  const [eventEditorInitialStep, setEventEditorInitialStep] = useState<'details' | 'attendees'>('details');
  const [eventEditorAiPrompt, setEventEditorAiPrompt] = useState<string | null>(null);
  const [eventEditorAiQueryPlan, setEventEditorAiQueryPlan] = useState<unknown>(null);
  const [eventEditorLoading, setEventEditorLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filters, setFilters] = useState({ type: 'all', location: 'all', isVirtual: 'all' });
  const [aiPrompt, setAiPrompt] = useState('');
  const [contacts, setContacts] = useState<Array<{ id: string; firstName: string; lastName: string; email?: string; phone?: string }>>([]);
  const [segments, setSegments] = useState<Array<{ id: string; name: string; memberCount: number }>>([]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const rows = await apiGet<any[]>('/events');
      const mapped: Event[] = (rows || []).map((e: any) => {
        const dt = e.event_date ? new Date(e.event_date) : null;
        const date = dt && !Number.isNaN(dt.getTime()) ? dt.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
        const time = dt && !Number.isNaN(dt.getTime()) ? dt.toISOString().slice(11, 16) : '09:00';
        return {
          id: String(e.event_id),
          title: e.name,
          description: e.description || '',
          type: 'other',
          date,
          time,
          location: e.location || '',
          isVirtual: (e.location || '').toLowerCase().includes('zoom') || (e.location || '').toLowerCase().includes('meet'),
          targetAudience: [],
          recommendedContacts: [],
          invitedCount: Number(e.invited_count || 0),
          confirmedCount: 0,
          attendedCount: 0,
          status: (e.status || 'draft') as any,
          emailsSent: 0,
          emailsOpened: 0,
          emailsClicked: 0,
          whatsappSent: 0,
          whatsappRead: 0,
          createdAt: e.created_at || new Date().toISOString(),
          createdBy: String(e.created_by || ''),
        };
      });
      setEvents(mapped);
    } catch (e: any) {
      toast({ title: 'Failed to load events', description: e?.message ?? 'Unknown error', variant: 'destructive' });
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchContactsAndSegments = async () => {
    try {
      const segmentsRes = await apiGet<any[]>('/segments');

      // Load enough contacts so edits/AI-previews have their invitees available in the selector.
      const allContacts: any[] = [];
      let offset = 0;
      const limit = 500;
      const maxFetch = 5000;
      let total = Infinity;
      while (offset < total && offset < maxFetch) {
        const page = await apiGet<any>(`/contacts?limit=${limit}&offset=${offset}`);
        const pageContacts = page?.contacts ?? [];
        allContacts.push(...pageContacts);
        total = typeof page?.total === 'number' ? page.total : offset + pageContacts.length;
        if (!pageContacts.length) break;
        offset += limit;
      }

      setContacts(
        (allContacts || []).map((c: any) => ({
          id: String(c.contact_id),
          firstName: c.first_name,
          lastName: c.last_name,
          email: c.email || undefined,
          phone: c.phone || undefined,
        })),
      );

      setSegments(
        (segmentsRes || []).map((s: any) => ({
          id: String(s.segment_id),
          name: s.name,
          memberCount: Number(s.contact_count || 0),
        })),
      );
    } catch {
      setContacts([]);
      setSegments([]);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchContactsAndSegments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredEvents = events.filter((event) => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' || (activeTab === 'upcoming' && event.status === 'scheduled') || (activeTab === 'ongoing' && event.status === 'ongoing') || (activeTab === 'completed' && event.status === 'completed') || (activeTab === 'draft' && event.status === 'draft');
    const matchesType = filters.type === 'all' || event.type === filters.type;
    const matchesLocation = filters.location === 'all' || event.location.toLowerCase().includes(filters.location.toLowerCase());
    const matchesVirtual = filters.isVirtual === 'all' || (filters.isVirtual === 'virtual' && event.isVirtual) || (filters.isVirtual === 'in-person' && !event.isVirtual);
    return matchesSearch && matchesTab && matchesType && matchesLocation && matchesVirtual;
  });

  const eventCounts = {
    all: events.length,
    upcoming: events.filter((e) => e.status === 'scheduled').length,
    ongoing: events.filter((e) => e.status === 'ongoing').length,
    completed: events.filter((e) => e.status === 'completed').length,
    draft: events.filter((e) => e.status === 'draft').length,
  };

  const resolveContactIds = async (segment_ids: number[], contact_ids: number[]) => {
    const out = new Set<number>(contact_ids);
    for (const sid of segment_ids) {
      try {
        const seg = await apiGet<any>(`/segments/${sid}`);
        const segContacts = (seg?.contacts || []).map((c: any) => Number(c.contact_id)).filter((n: number) => Number.isFinite(n));
        segContacts.forEach((n: number) => out.add(n));
      } catch {
        // ignore bad segment
      }
    }
    return Array.from(out);
  };

  const handleAddEvent = async (payload: any) => {
    try {
      const contact_ids = await resolveContactIds(payload.segment_ids || [], payload.contact_ids || []);
      if (eventEditorMode === 'edit' && eventEditorEventId) {
        await apiPatch(`/events/${eventEditorEventId}`, {
          name: payload.name,
          description: payload.description ?? null,
          location: payload.location ?? null,
          event_date: payload.event_date ?? null,
          status: payload.status ?? 'draft',
          contact_ids,
        });
        toast({ title: 'Event updated' });
      } else {
        await apiPost('/events', {
          name: payload.name,
          description: payload.description ?? null,
          location: payload.location ?? null,
          event_date: payload.event_date ?? null,
          status: payload.status ?? 'draft',
          prompt: payload.prompt ?? null,
          query_plan: payload.query_plan ?? null,
          contact_ids,
        });
        toast({ title: 'Event created' });
      }
      await fetchEvents();
    } catch (e: any) {
      toast({ title: eventEditorMode === 'edit' ? 'Failed to update event' : 'Failed to create event', description: e?.message ?? 'Unknown error', variant: 'destructive' });
    }
  };

  const extractKeywordFromPrompt = (prompt: string) => {
    const cleaned = prompt.trim().replace(/^["']|["']$/g, '').toLowerCase();
    let tail = '';
    if (cleaned.includes(' in ')) tail = cleaned.split(' in ').slice(-1)[0] || '';
    else if (cleaned.includes(' for ')) tail = cleaned.split(' for ').slice(-1)[0] || '';
    else tail = cleaned;

    const tokens = (tail.match(/[a-z0-9]+/gi) || []).slice(0, 3).map((t) => t.toLowerCase());
    return tokens.join(' ');
  };

  const openManualCreate = () => {
    setEventEditorMode('create');
    setEventEditorEventId(null);
    setEventEditorInitialForm({});
    setEventEditorInitialSelectedSegments([]);
    setEventEditorInitialSelectedIndividuals([]);
    setEventEditorInitialStep('details');
    setEventEditorAiPrompt(null);
    setEventEditorAiQueryPlan(null);
    setEventEditorOpen(true);
  };

  const openCreateWithAi = async (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    setEventEditorLoading(true);
    try {
      const res = await apiPost<any>('/events/preview', { prompt: trimmed });
      if (!res?.valid) {
        toast({ title: 'AI preview failed', description: res?.error ?? 'Unknown error', variant: 'destructive' });
        return;
      }

      const ids = (res?.contacts ?? []).map((c: any) => String(c.contact_id)).filter((id: string) => id);
      const segIds = (res?.segment_ids ?? []).map((x: any) => String(x)).filter((id: string) => id);
      const draft = res?.draft ?? {};
      const draftTitle = draft?.title ? String(draft.title) : '';
      const draftDescription = draft?.description ? String(draft.description) : '';
      const draftLocation = draft?.location ? String(draft.location) : '';
      const draftIsVirtual = draft?.is_virtual === true;
      const draftEventType = draft?.event_type ? String(draft.event_type) : 'other';
      const draftDate = draft?.event_date ? String(draft.event_date) : '';
      const draftTime = draft?.time ? String(draft.time) : '';
      const draftCapacity =
        draft?.capacity === null || typeof draft?.capacity === 'undefined' ? '' : String(draft.capacity);

      setEventEditorMode('create');
      setEventEditorEventId(null);
      setEventEditorInitialForm({
        title: draftTitle || extractKeywordFromPrompt(trimmed),
        description: draftDescription || '',
        location: draftLocation || '',
        date: draftDate || '',
        time: draftTime || '',
        type: (draftEventType as any) || 'other',
        isVirtual: draftIsVirtual,
        capacity: draftCapacity,
        status: 'draft',
      });
      setEventEditorInitialSelectedSegments(segIds);
      setEventEditorInitialSelectedIndividuals(ids);
      setEventEditorInitialStep('details');
      setEventEditorAiPrompt(trimmed);
      setEventEditorAiQueryPlan(res?.query_plan ?? null);
      setEventEditorOpen(true);

      toast({
        title: 'Event preview ready',
        description: `${segIds.length} segments + ${ids.length} individuals preselected. Fill in details and review.`,
        duration: 2500,
      });
    } catch (e: any) {
      toast({ title: 'Failed to preview event', description: e?.message ?? 'Unknown error', variant: 'destructive' });
    } finally {
      setEventEditorLoading(false);
    }
  };

  const openEditEvent = async (event: Event) => {
    setEventEditorMode('edit');
    setEventEditorEventId(Number(event.id));

    setEventEditorLoading(true);
    try {
      const data = await apiGet<any>(`/events/${event.id}`);
      const be = data?.event;
      const contacts = data?.contacts ?? [];

      const dt = be?.event_date ? new Date(be.event_date) : null;
      const date = dt && !Number.isNaN(dt.getTime()) ? dt.toISOString().slice(0, 10) : '';
      const time = dt && !Number.isNaN(dt.getTime()) ? dt.toISOString().slice(11, 16) : '';

      let ids = contacts.map((c: any) => String(c.contact_id));
      let aiPromptUsed: string | null = null;
      let aiQueryPlanUsed: unknown = null;
      let aiDraft: any = null;
      // Reset segment preselection; we will set it from AI preview (if any) below.
      setEventEditorInitialSelectedSegments([]);

      const trimmedAiPrompt = aiPrompt.trim();
      if (trimmedAiPrompt) {
        // If the user typed an AI prompt, allow them to regenerate the invite list.
        const res = await apiPost<any>('/events/preview', { prompt: trimmedAiPrompt });
        if (res?.valid) {
          ids = (res?.contacts ?? []).map((c: any) => String(c.contact_id));
          aiPromptUsed = trimmedAiPrompt;
          aiQueryPlanUsed = res?.query_plan ?? null;
          aiDraft = res?.draft ?? null;
          const segIds = (res?.segment_ids ?? []).map((x: any) => String(x)).filter((id: string) => id);
          // If we regenerated, carry segment preselection forward.
          setEventEditorInitialSelectedSegments(segIds);
        }
      }

      setEventEditorInitialForm({
        title: aiDraft?.title ? String(aiDraft.title) : (be?.name ?? event.title),
        description: aiDraft?.description ? String(aiDraft.description) : (be?.description ?? event.description ?? ''),
        location: aiDraft?.location ? String(aiDraft.location) : (be?.location ?? event.location ?? ''),
        date: aiDraft?.event_date ? String(aiDraft.event_date) : date,
        time: aiDraft?.time ? String(aiDraft.time) : time,
        type: aiDraft?.event_type ? (String(aiDraft.event_type) as any) : (event.type ?? 'other'),
        isVirtual: aiDraft?.is_virtual === true ? true : (
          typeof (be?.location ?? event.location) === 'string'
            ? (be.location ?? event.location).toLowerCase().includes('zoom') || (be.location ?? event.location).toLowerCase().includes('meet')
            : false
        ),
        capacity:
          aiDraft?.capacity === null || typeof aiDraft?.capacity === 'undefined'
            ? ''
            : String(aiDraft.capacity || ''),
        status: (be?.status ?? event.status) as any,
      });
      if (!trimmedAiPrompt) {
        setEventEditorInitialSelectedSegments([]);
      }
      setEventEditorInitialSelectedIndividuals(ids);
      setEventEditorInitialStep('details');
      setEventEditorAiPrompt(aiPromptUsed);
      setEventEditorAiQueryPlan(aiQueryPlanUsed);
      setEventEditorOpen(true);
    } catch (e: any) {
      toast({ title: 'Failed to load event', description: e?.message ?? 'Unknown error', variant: 'destructive' });
    } finally {
      setEventEditorLoading(false);
    }
  };

  const sendToCampaigns = async (event: Event, action: 'invite' | 'cancel') => {
    setEventEditorLoading(true);
    try {
      const data = await apiGet<any>(`/events/${event.id}`);
      const contacts = data?.contacts ?? [];

      const contactIds =
        action === 'invite'
          ? contacts.map((c: any) => String(c.contact_id))
          : contacts
              .filter((c: any) => c?.email_invite_sent === true || c?.whatsapp_invite_sent === true)
              .map((c: any) => String(c.contact_id));

      navigate('/communications', {
        state: {
          mode: 'event_outreach',
          eventId: Number(event.id),
          eventAction: action,
          eventName: event.title,
          contactIds,
          prompt: data?.event?.prompt ?? aiPrompt,
          messageType: 'email',
        },
      });
    } catch (e: any) {
      toast({ title: 'Failed to route to campaigns', description: e?.message ?? 'Unknown error', variant: 'destructive' });
    } finally {
      setEventEditorLoading(false);
    }
  };

  const handleEventClick = (event: Event) => { setSelectedEvent(event); setShowDetailDialog(true); };

  const handleDeleteEvent = async (event: Event) => {
    const ok = window.confirm(`Delete event "${event.title}"? This cannot be undone.`);
    if (!ok) return;
    try {
      await apiDelete(`/events/${event.id}`);
      toast({ title: 'Event deleted' });
      await fetchEvents();
    } catch (e: any) {
      toast({
        title: 'Failed to delete event',
        description: e?.message ?? 'Unknown error',
        variant: 'destructive',
      });
    }
  };
  const clearFilters = () => setFilters({ type: 'all', location: 'all', isVirtual: 'all' });
  const activeFiltersCount = (filters.type !== 'all' ? 1 : 0) + (filters.location !== 'all' ? 1 : 0) + (filters.isVirtual !== 'all' ? 1 : 0);
  const eventsOnSelectedDate = selectedDate ? filteredEvents.filter((e) => { const d = new Date(e.date); return d.getDate() === selectedDate.getDate() && d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear(); }) : [];
  const eventDatesSet = new Set(events.map((e) => { const d = new Date(e.date); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }));
  const hasEventOnDate = (date: Date) => eventDatesSet.has(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground"><Wand2 className="h-4 w-4 text-primary" /> AI-first events</div>
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr] lg:items-start">
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">What event should AI set up?</h1>
              <p className="mt-2 text-muted-foreground">Describe the event in natural language and then review the prefilled event draft.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="e.g., Create a virtual AI webinar for tech leaders and prefill attendees" className="h-12 flex-1" />
              <Button
                className="h-12 gap-2"
                onClick={() => openCreateWithAi(aiPrompt)}
                disabled={eventEditorLoading || !aiPrompt.trim()}
              >
                <Sparkles className="h-4 w-4" />{eventEditorLoading ? 'Generating…' : 'Create with AI'}
              </Button>
            </div>
          </div>
          <div className="rounded-2xl border bg-muted/40 p-4">
            <p className="text-sm font-medium">Suggested prompts</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {aiEventSuggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  className="h-auto whitespace-normal text-left"
                  onClick={() => {
                    setAiPrompt(suggestion);
                    openCreateWithAi(suggestion);
                  }}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Event pipeline</h2>
          <p className="text-sm text-muted-foreground">AI creates first drafts, humans review details.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border"><Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="sm" className="rounded-r-none" onClick={() => setViewMode('list')}>List</Button><Button variant={viewMode === 'calendar' ? 'secondary' : 'ghost'} size="sm" className="rounded-l-none" onClick={() => setViewMode('calendar')}><CalendarIcon className="mr-2 h-4 w-4" />Calendar</Button></div>
          <Button variant="outline" size="sm" onClick={openManualCreate}><Plus className="mr-2 h-4 w-4" />Open editor</Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search events..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" /></div>
        <Select value={filters.type} onValueChange={(v) => setFilters((f) => ({ ...f, type: v }))}><SelectTrigger className="w-[140px]"><SelectValue placeholder="Event Type" /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="conference">Conference</SelectItem><SelectItem value="webinar">Webinar</SelectItem><SelectItem value="meetup">Meetup</SelectItem><SelectItem value="workshop">Workshop</SelectItem><SelectItem value="networking">Networking</SelectItem><SelectItem value="training">Training</SelectItem></SelectContent></Select>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}><SheetTrigger asChild><Button variant="outline" size="icon" className="relative"><Filter className="h-4 w-4" />{activeFiltersCount > 0 && <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">{activeFiltersCount}</span>}</Button></SheetTrigger><SheetContent><SheetHeader><SheetTitle>Filter Events</SheetTitle><SheetDescription>Narrow down events</SheetDescription></SheetHeader><div className="mt-6 space-y-6"><div className="space-y-2"><Label>Location</Label><Select value={filters.location} onValueChange={(v) => setFilters((f) => ({ ...f, location: v }))}><SelectTrigger><SelectValue placeholder="All Locations" /></SelectTrigger><SelectContent><SelectItem value="all">All Locations</SelectItem><SelectItem value="bangalore">Bangalore</SelectItem><SelectItem value="mumbai">Mumbai</SelectItem><SelectItem value="zoom">Zoom (Virtual)</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Format</Label><Select value={filters.isVirtual} onValueChange={(v) => setFilters((f) => ({ ...f, isVirtual: v }))}><SelectTrigger><SelectValue placeholder="All Formats" /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="virtual">Virtual</SelectItem><SelectItem value="in-person">In-Person</SelectItem></SelectContent></Select></div><Separator /><Button variant="outline" className="w-full" onClick={() => { clearFilters(); setSheetOpen(false); }}>Clear All Filters</Button></div></SheetContent></Sheet>
      </div>

      {viewMode === 'list' ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList><TabsTrigger value="all" className="gap-2">All <Badge variant="secondary">{eventCounts.all}</Badge></TabsTrigger><TabsTrigger value="upcoming" className="gap-2">Upcoming <Badge variant="secondary">{eventCounts.upcoming}</Badge></TabsTrigger><TabsTrigger value="ongoing" className="gap-2">Ongoing <Badge variant="secondary">{eventCounts.ongoing}</Badge></TabsTrigger><TabsTrigger value="completed" className="gap-2">Completed <Badge variant="secondary">{eventCounts.completed}</Badge></TabsTrigger><TabsTrigger value="draft" className="gap-2">Draft <Badge variant="secondary">{eventCounts.draft}</Badge></TabsTrigger></TabsList>
          <TabsContent value={activeTab} className="mt-6">
            {loading ? (
              <div className="py-10 text-center text-muted-foreground">Loading events…</div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onClick={() => handleEventClick(event)}
                      onViewDetails={() => handleEventClick(event)}
                      onEdit={() => openEditEvent(event)}
                      onSendInvites={() => sendToCampaigns(event, 'invite')}
                      onDeleteEvent={() => handleDeleteEvent(event)}
                    />
                  ))}
                </div>
                {filteredEvents.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-4 rounded-full bg-muted p-4"><CalendarIcon className="h-8 w-8 text-muted-foreground" /></div>
                    <h3 className="font-semibold">No events found</h3>
                    <p className="mt-1 text-muted-foreground">Create an event to get started.</p>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2"><div className="rounded-lg border bg-card p-4"><Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} month={currentMonth} onMonthChange={setCurrentMonth} className="w-full" modifiers={{ hasEvent: (date) => hasEventOnDate(date) }} modifiersClassNames={{ hasEvent: 'bg-primary/20 font-bold text-primary rounded-full' }} /></div></div>
          <div className="space-y-4"><h3 className="font-semibold">{selectedDate ? <>Events on {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</> : 'Select a date'}</h3>{eventsOnSelectedDate.length > 0 ? eventsOnSelectedDate.map((event) => <div key={event.id} className="cursor-pointer rounded-lg border bg-card p-4 hover:shadow-sm" onClick={() => handleEventClick(event)}><div className="mb-2 flex items-center gap-2"><Badge variant="outline" className="capitalize">{event.type}</Badge><Badge variant={event.status === 'scheduled' ? 'default' : 'secondary'} className="capitalize">{event.status}</Badge></div><h4 className="font-medium">{event.title}</h4><p className="mt-1 text-sm text-muted-foreground">{event.time} • {event.location}</p></div>) : <div className="py-8 text-center text-muted-foreground"><CalendarIcon className="mx-auto mb-2 h-8 w-8 opacity-50" /><p>No events on this date</p></div>}</div>
        </div>
      )}

      <CreateEventDialog
        open={eventEditorOpen}
        onOpenChange={setEventEditorOpen}
        onSave={handleAddEvent}
        contacts={contacts}
        segments={segments}
        initialForm={eventEditorInitialForm}
        initialSelectedSegments={eventEditorInitialSelectedSegments}
        initialSelectedIndividuals={eventEditorInitialSelectedIndividuals}
        initialStep={eventEditorInitialStep}
        aiPrompt={eventEditorAiPrompt}
        aiQueryPlan={eventEditorAiQueryPlan}
      />
      <EventDetailDialogSimple
        eventId={selectedEvent ? Number(selectedEvent.id) : null}
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        contacts={contacts}
        segments={segments}
        onUpdated={fetchEvents}
      />
    </div>
  );
}
