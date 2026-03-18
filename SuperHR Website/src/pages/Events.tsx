import { useState } from 'react';
import { Plus, Calendar as CalendarIcon, Filter, Search, Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EventCard } from '@/components/events/EventCard';
import { CreateEventDialog } from '@/components/dialogs/CreateEventDialog';
import { EventDetailDialog } from '@/components/dialogs/EventDetailDialog';
import { mockEvents as initialEvents } from '@/data/mockData';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Event } from '@/types/contact';

const aiEventSuggestions = [
  'Create a Bangalore meetup for high-engagement contacts next Friday evening',
  'Plan a virtual AI webinar for technology leaders and prefill attendees',
  'Set up a client workshop for medium-engagement Mumbai leads',
];

export default function Events() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filters, setFilters] = useState({ type: 'all', location: 'all', isVirtual: 'all' });
  const [aiPrompt, setAiPrompt] = useState('');

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

  const handleAddEvent = (newEvent: Event) => setEvents((prev) => [newEvent, ...prev]);
  const handleUpdateEvent = (updated: Event) => setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  const handleEventClick = (event: Event) => { setSelectedEvent(event); setShowDetailDialog(true); };
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
              <Button className="h-12 gap-2" onClick={() => setShowCreateDialog(true)}><Sparkles className="h-4 w-4" />Create with AI</Button>
            </div>
          </div>
          <div className="rounded-2xl border bg-muted/40 p-4">
            <p className="text-sm font-medium">Suggested prompts</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {aiEventSuggestions.map((suggestion) => (
                <Button key={suggestion} variant="outline" size="sm" className="h-auto whitespace-normal text-left" onClick={() => { setAiPrompt(suggestion); setShowCreateDialog(true); }}>{suggestion}</Button>
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
          <Button variant="outline" size="sm" onClick={() => setShowCreateDialog(true)}><Plus className="mr-2 h-4 w-4" />Open editor</Button>
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
          <TabsContent value={activeTab} className="mt-6"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{filteredEvents.map((event) => <EventCard key={event.id} event={event} onClick={() => handleEventClick(event)} />)}</div>{filteredEvents.length === 0 && <div className="flex flex-col items-center justify-center py-12 text-center"><div className="mb-4 rounded-full bg-muted p-4"><CalendarIcon className="h-8 w-8 text-muted-foreground" /></div><h3 className="font-semibold">No events found</h3><p className="mt-1 text-muted-foreground">Try creating one with AI.</p></div>}</TabsContent>
        </Tabs>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2"><div className="rounded-lg border bg-card p-4"><Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} month={currentMonth} onMonthChange={setCurrentMonth} className="w-full" modifiers={{ hasEvent: (date) => hasEventOnDate(date) }} modifiersClassNames={{ hasEvent: 'bg-primary/20 font-bold text-primary rounded-full' }} /></div></div>
          <div className="space-y-4"><h3 className="font-semibold">{selectedDate ? <>Events on {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</> : 'Select a date'}</h3>{eventsOnSelectedDate.length > 0 ? eventsOnSelectedDate.map((event) => <div key={event.id} className="cursor-pointer rounded-lg border bg-card p-4 hover:shadow-sm" onClick={() => handleEventClick(event)}><div className="mb-2 flex items-center gap-2"><Badge variant="outline" className="capitalize">{event.type}</Badge><Badge variant={event.status === 'scheduled' ? 'default' : 'secondary'} className="capitalize">{event.status}</Badge></div><h4 className="font-medium">{event.title}</h4><p className="mt-1 text-sm text-muted-foreground">{event.time} • {event.location}</p></div>) : <div className="py-8 text-center text-muted-foreground"><CalendarIcon className="mx-auto mb-2 h-8 w-8 opacity-50" /><p>No events on this date</p></div>}</div>
        </div>
      )}

      <CreateEventDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} onSave={handleAddEvent} />
      <EventDetailDialog event={selectedEvent} open={showDetailDialog} onOpenChange={setShowDetailDialog} onSave={handleUpdateEvent} />
    </div>
  );
}
