import { useState } from 'react';
import { Plus, Calendar as CalendarIcon, Filter, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EventCard } from '@/components/events/EventCard';
import { CreateEventDialog } from '@/components/dialogs/CreateEventDialog';
import { EventDetailDialog } from '@/components/dialogs/EventDetailDialog';
import { mockEvents as initialEvents } from '@/data/mockData';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Event } from '@/types/alumni';

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

  // Filters state
  const [filters, setFilters] = useState({
    type: 'all',
    location: 'all',
    isVirtual: 'all',
  });

  const filteredEvents = events.filter((event) => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'upcoming' && event.status === 'scheduled') ||
      (activeTab === 'ongoing' && event.status === 'ongoing') ||
      (activeTab === 'completed' && event.status === 'completed') ||
      (activeTab === 'draft' && event.status === 'draft');
    const matchesType = filters.type === 'all' || event.type === filters.type;
    const matchesLocation = filters.location === 'all' || event.location.toLowerCase().includes(filters.location.toLowerCase());
    const matchesVirtual = filters.isVirtual === 'all' || 
      (filters.isVirtual === 'virtual' && event.isVirtual) ||
      (filters.isVirtual === 'in-person' && !event.isVirtual);

    return matchesSearch && matchesTab && matchesType && matchesLocation && matchesVirtual;
  });

  const eventCounts = {
    all: events.length,
    upcoming: events.filter((e) => e.status === 'scheduled').length,
    ongoing: events.filter((e) => e.status === 'ongoing').length,
    completed: events.filter((e) => e.status === 'completed').length,
    draft: events.filter((e) => e.status === 'draft').length,
  };

  const handleAddEvent = (newEvent: Event) => {
    setEvents((prev) => [newEvent, ...prev]);
  };

  const handleUpdateEvent = (updated: Event) => {
    setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
  };

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setShowDetailDialog(true);
  };

  const clearFilters = () => {
    setFilters({ type: 'all', location: 'all', isVirtual: 'all' });
  };

  const activeFiltersCount =
    (filters.type !== 'all' ? 1 : 0) +
    (filters.location !== 'all' ? 1 : 0) +
    (filters.isVirtual !== 'all' ? 1 : 0);

  // Get events for the calendar view
  const eventsOnSelectedDate = selectedDate
    ? filteredEvents.filter((e) => {
        const eventDate = new Date(e.date);
        return (
          eventDate.getDate() === selectedDate.getDate() &&
          eventDate.getMonth() === selectedDate.getMonth() &&
          eventDate.getFullYear() === selectedDate.getFullYear()
        );
      })
    : [];

  // Get dates with events for calendar highlighting - normalize to start of day
  const eventDatesSet = new Set(
    events.map((e) => {
      const d = new Date(e.date);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    })
  );

  // Check if a date has events
  const hasEventOnDate = (date: Date) => {
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return eventDatesSet.has(key);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Events</h1>
          <p className="text-muted-foreground">
            Manage events and track alumni engagement
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-r-none"
              onClick={() => setViewMode('list')}
            >
              List
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
              size="sm"
              className="rounded-l-none"
              onClick={() => setViewMode('calendar')}
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Calendar
            </Button>
          </div>
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Button>
        </div>
      </div>

      {/* AI Recommendation Banner */}
      <div className="nudge-card rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium">AI Recommendation</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Based on engagement patterns, Bangalore-based alumni (42 contacts) are highly responsive. 
              Consider creating a local meetup event for Q1.
            </p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="default" onClick={() => setShowCreateDialog(true)}>
                Create Bangalore Meetup
              </Button>
              <Button size="sm" variant="ghost">
                View Contacts
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filters.type} onValueChange={(v) => setFilters((f) => ({ ...f, type: v }))}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Event Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="reunion">Reunion</SelectItem>
            <SelectItem value="webinar">Webinar</SelectItem>
            <SelectItem value="meetup">Meetup</SelectItem>
            <SelectItem value="workshop">Workshop</SelectItem>
            <SelectItem value="hiring">Hiring</SelectItem>
            <SelectItem value="mentoring">Mentoring</SelectItem>
          </SelectContent>
        </Select>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="relative">
              <Filter className="h-4 w-4" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-xs text-primary-foreground flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Filter Events</SheetTitle>
              <SheetDescription>Narrow down events by criteria</SheetDescription>
            </SheetHeader>
            <div className="space-y-6 mt-6">
              <div className="space-y-2">
                <Label>Event Type</Label>
                <Select value={filters.type} onValueChange={(v) => setFilters((f) => ({ ...f, type: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="reunion">Reunion</SelectItem>
                    <SelectItem value="webinar">Webinar</SelectItem>
                    <SelectItem value="meetup">Meetup</SelectItem>
                    <SelectItem value="workshop">Workshop</SelectItem>
                    <SelectItem value="hiring">Hiring</SelectItem>
                    <SelectItem value="mentoring">Mentoring</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Select value={filters.location} onValueChange={(v) => setFilters((f) => ({ ...f, location: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    <SelectItem value="bangalore">Bangalore</SelectItem>
                    <SelectItem value="mumbai">Mumbai</SelectItem>
                    <SelectItem value="zoom">Zoom (Virtual)</SelectItem>
                    <SelectItem value="campus">Campus</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Format</Label>
                <Select value={filters.isVirtual} onValueChange={(v) => setFilters((f) => ({ ...f, isVirtual: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Formats" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Formats</SelectItem>
                    <SelectItem value="virtual">Virtual</SelectItem>
                    <SelectItem value="in-person">In-Person</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <Button variant="outline" className="w-full" onClick={() => { clearFilters(); setSheetOpen(false); }}>
                Clear All Filters
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {viewMode === 'list' ? (
        <>
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all" className="gap-2">
                All <Badge variant="secondary">{eventCounts.all}</Badge>
              </TabsTrigger>
              <TabsTrigger value="upcoming" className="gap-2">
                Upcoming <Badge variant="secondary">{eventCounts.upcoming}</Badge>
              </TabsTrigger>
              <TabsTrigger value="ongoing" className="gap-2">
                Ongoing <Badge variant="secondary">{eventCounts.ongoing}</Badge>
              </TabsTrigger>
              <TabsTrigger value="completed" className="gap-2">
                Completed <Badge variant="secondary">{eventCounts.completed}</Badge>
              </TabsTrigger>
              <TabsTrigger value="draft" className="gap-2">
                Draft <Badge variant="secondary">{eventCounts.draft}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredEvents.map((event) => (
                  <EventCard key={event.id} event={event} onClick={() => handleEventClick(event)} />
                ))}
              </div>

              {filteredEvents.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <CalendarIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold">No events found</h3>
                  <p className="text-muted-foreground mt-1">
                    {activeTab === 'all'
                      ? 'Get started by creating your first event'
                      : `No ${activeTab} events at the moment`}
                  </p>
                  <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Event
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      ) : (
        /* Calendar View */
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="rounded-lg border bg-card p-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                month={currentMonth}
                onMonthChange={setCurrentMonth}
                className="w-full"
                modifiers={{
                  hasEvent: (date) => hasEventOnDate(date),
                }}
                modifiersClassNames={{
                  hasEvent: 'bg-primary/20 font-bold text-primary rounded-full',
                }}
              />
              {/* Legend */}
              <div className="mt-4 pt-4 border-t flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-primary/20" />
                  <span className="text-muted-foreground">Has events</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-primary" />
                  <span className="text-muted-foreground">Selected</span>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="font-semibold">
              {selectedDate ? (
                <>Events on {selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</>
              ) : (
                'Select a date'
              )}
            </h3>
            {eventsOnSelectedDate.length > 0 ? (
              eventsOnSelectedDate.map((event) => (
                <div
                  key={event.id}
                  className="p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow cursor-pointer"
                  onClick={() => handleEventClick(event)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="capitalize">{event.type}</Badge>
                    <Badge variant={event.status === 'scheduled' ? 'default' : 'secondary'} className="capitalize">
                      {event.status}
                    </Badge>
                  </div>
                  <h4 className="font-medium">{event.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{event.time} • {event.location}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No events on this date</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => setShowCreateDialog(true)}>
                  Create Event
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dialogs */}
      <CreateEventDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSave={handleAddEvent}
      />

      <EventDetailDialog
        event={selectedEvent}
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        onSave={handleUpdateEvent}
      />
    </div>
  );
}
