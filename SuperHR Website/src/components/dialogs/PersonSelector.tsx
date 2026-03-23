import { useEffect, useMemo, useState } from 'react';
import { Search, X, Users, Filter, CheckSquare, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AudienceSegment } from '@/types/contact';
import { cn } from '@/lib/utils';

const locationOptions = ['Bangalore', 'Mumbai', 'Kochi', 'Delhi', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata', 'Palo Alto'];
const departmentOptions = ['Technology', 'Analytics', 'R&D', 'Biotech', 'Operations', 'Sales', 'Marketing'];
const typeOptions = [
  { value: 'customer', label: 'Customer' },
  { value: 'lead', label: 'Lead' },
  { value: 'employee', label: 'Employee' },
  { value: 'partner', label: 'Partner' },
  { value: 'vendor', label: 'Vendor' },
];

interface PersonSelectorProps {
  selectedSegments: string[];
  selectedIndividuals: string[];
  onSegmentsChange: (segments: string[]) => void;
  onIndividualsChange: (individuals: string[]) => void;
  audienceSegments: AudienceSegment[];
  contacts: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    type?: string;
    department?: string;
    engagementLevel?: string;
    currentCity?: string;
  }>;
  aiRecommendations?: string[];
  aiContext?: string;
  onApplyAIRecommendations?: () => void;
  filterByPhone?: boolean;
  className?: string;
}

export function PersonSelector({
  selectedSegments,
  selectedIndividuals,
  onSegmentsChange,
  onIndividualsChange,
  audienceSegments,
  contacts,
  filterByPhone = false,
  className,
}: PersonSelectorProps) {
  const [activeTab, setActiveTab] = useState<'segments' | 'individuals'>(
    selectedIndividuals.length > 0 && selectedSegments.length === 0 ? 'individuals' : 'segments',
  );
  const [segmentSearch, setSegmentSearch] = useState('');
  const [contactSearch, setContactSearch] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterEngagement, setFilterEngagement] = useState('all');
  const [showFilters, setShowFilters] = useState(true);

  // If the dialog is opened with individuals preselected (common for edits / event->campaigns),
  // avoid landing the user on the empty "Segments" tab.
  useEffect(() => {
    if (activeTab !== 'segments') return;
    if (selectedIndividuals.length === 0) return;
    if (selectedSegments.length > 0) return;
    setActiveTab('individuals');
  }, [activeTab, selectedIndividuals.length, selectedSegments.length]);

  const filteredSegments = useMemo(() => {
    if (!segmentSearch) return audienceSegments;
    return audienceSegments.filter((s) => s.name.toLowerCase().includes(segmentSearch.toLowerCase()));
  }, [segmentSearch, audienceSegments]);

  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      const matchesSearch =
        contactSearch === '' ||
        `${contact.firstName} ${contact.lastName} ${contact.email || ''} ${contact.phone || ''}`
          .toLowerCase()
          .includes(contactSearch.toLowerCase());
      const matchesLocation =
        filterLocation === 'all' ||
        (contact.currentCity || '').toLowerCase().includes(filterLocation.toLowerCase());
      const matchesDepartment = filterDepartment === 'all' || contact.department === filterDepartment;
      const matchesType = filterType === 'all' || contact.type === filterType;
      const matchesEngagement = filterEngagement === 'all' || contact.engagementLevel === filterEngagement;
      if (filterByPhone && !contact.whatsapp && !contact.phone) return false;
      return matchesSearch && matchesLocation && matchesDepartment && matchesType && matchesEngagement;
    });
  }, [contacts, contactSearch, filterLocation, filterDepartment, filterType, filterEngagement, filterByPhone]);

  const toggleSegment = (segmentId: string) => {
    const updated = selectedSegments.includes(segmentId)
      ? selectedSegments.filter((id) => id !== segmentId)
      : [...selectedSegments, segmentId];
    onSegmentsChange(updated);
  };

  const toggleIndividual = (contactId: string) => {
    const updated = selectedIndividuals.includes(contactId)
      ? selectedIndividuals.filter((id) => id !== contactId)
      : [...selectedIndividuals, contactId];
    onIndividualsChange(updated);
  };

  const selectAllFiltered = () => {
    const ids = filteredContacts.map((a) => a.id);
    onIndividualsChange([...new Set([...selectedIndividuals, ...ids])]);
  };

  const deselectAllFiltered = () => {
    const ids = filteredContacts.map((a) => a.id);
    onIndividualsChange(selectedIndividuals.filter((id) => !ids.includes(id)));
  };

  const clearFilters = () => {
    setContactSearch('');
    setFilterLocation('all');
    setFilterDepartment('all');
    setFilterType('all');
    setFilterEngagement('all');
  };

  const activeFiltersCount = [filterLocation, filterDepartment, filterType, filterEngagement].filter((f) => f !== 'all').length;

  const renderContactRow = (contact: PersonSelectorProps['contacts'][number]) => (
    <div
      key={contact.id}
      className={cn(
        'flex items-center gap-3 rounded-xl border p-3 cursor-pointer hover:bg-accent transition-colors',
        selectedIndividuals.includes(contact.id) && 'bg-primary/10 border-primary/20',
      )}
      onClick={() => toggleIndividual(contact.id)}
    >
      <Checkbox checked={selectedIndividuals.includes(contact.id)} className="shrink-0" />
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 shrink-0 text-xs font-medium">
        {contact.firstName[0]}{contact.lastName[0]}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-sm">{contact.firstName} {contact.lastName}</p>
        <p className="truncate text-xs text-muted-foreground">{filterByPhone ? (contact.whatsapp || contact.phone || 'No phone') : (contact.email || 'No email')}</p>
      </div>
      <div className="flex shrink-0 gap-2 flex-wrap justify-end">
        {contact.type && <Badge variant="outline" className="text-xs capitalize">{contact.type}</Badge>}
        {contact.engagementLevel && <Badge variant="secondary" className="text-xs capitalize">{contact.engagementLevel}</Badge>}
      </div>
    </div>
  );

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex h-full min-h-0 flex-col">
        <TabsList className="mb-4 w-full justify-start shrink-0">
          <TabsTrigger value="segments" className="gap-1.5 px-3 text-xs">
            <Users className="h-3.5 w-3.5" />
            Segments
            {selectedSegments.length > 0 && <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">{selectedSegments.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="individuals" className="gap-1.5 px-3 text-xs">
            <Filter className="h-3.5 w-3.5" />
            Individuals
            {selectedIndividuals.length > 0 && <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">{selectedIndividuals.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {activeTab === 'segments' && (
          <div className="flex-1 flex flex-col min-h-0">
          <div className="mb-3 shrink-0 relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search segments..." value={segmentSearch} onChange={(e) => setSegmentSearch(e.target.value)} className="pl-8 h-10 text-sm" />
          </div>
          <ScrollArea className="flex-1 rounded-xl border bg-card">
            <div className="space-y-2 p-3">
              {filteredSegments.length > 0 ? filteredSegments.map((segment) => (
                <div key={segment.id} className={cn('flex items-center justify-between rounded-xl border p-4 cursor-pointer hover:bg-accent transition-colors', selectedSegments.includes(segment.id) && 'bg-primary/10 border-primary/20')} onClick={() => toggleSegment(segment.id)}>
                  <div className="flex items-center gap-3">
                    <Checkbox checked={selectedSegments.includes(segment.id)} />
                    <div>
                      <p className="font-medium text-sm">{segment.name}</p>
                      <p className="text-xs text-muted-foreground">{segment.memberCount} members</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">{segment.memberCount}</Badge>
                </div>
              )) : (
                <div className="py-10 text-center text-muted-foreground"><Users className="mx-auto mb-2 h-6 w-6 opacity-50" /><p className="text-sm">No segments found</p></div>
              )}
            </div>
          </ScrollArea>
        </div>
        )}

{activeTab === 'individuals' && (
  <div className="flex-1 min-h-0 gap-4 lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className={cn('rounded-2xl border bg-muted/30 overflow-hidden flex flex-col min-h-0', !showFilters && 'lg:w-12')}>
            <Button variant="ghost" size="sm" className="h-10 shrink-0 rounded-none border-b justify-between px-3" onClick={() => setShowFilters(!showFilters)}>
              {showFilters && <span className="text-xs font-medium">Filters</span>}
              <ChevronRight className={cn('h-4 w-4 transition-transform', showFilters && 'rotate-180')} />
            </Button>
            {showFilters && (
              <ScrollArea className="flex-1">
                <div className="space-y-3 p-3">
                  <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Location</label><Select value={filterLocation} onValueChange={setFilterLocation}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="All" /></SelectTrigger><SelectContent><SelectItem value="all">All Locations</SelectItem>{locationOptions.map((loc) => (<SelectItem key={loc} value={loc}>{loc}</SelectItem>))}</SelectContent></Select></div>
                  <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Department</label><Select value={filterDepartment} onValueChange={setFilterDepartment}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="All" /></SelectTrigger><SelectContent><SelectItem value="all">All Depts</SelectItem>{departmentOptions.map((dept) => (<SelectItem key={dept} value={dept}>{dept}</SelectItem>))}</SelectContent></Select></div>
                  <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Type</label><Select value={filterType} onValueChange={setFilterType}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="All" /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem>{typeOptions.map((type) => (<SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>))}</SelectContent></Select></div>
                  <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">Engagement</label><Select value={filterEngagement} onValueChange={setFilterEngagement}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="All" /></SelectTrigger><SelectContent><SelectItem value="all">All Levels</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select></div>
                  {activeFiltersCount > 0 && <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 w-full text-xs"><X className="mr-1 h-3 w-3" />Clear ({activeFiltersCount})</Button>}
                </div>
              </ScrollArea>
            )}
          </div>

          <div className="flex min-h-0 flex-col">
            <div className="mb-3 flex flex-wrap items-center gap-2 shrink-0">
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search by name or email..." value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} className="h-10 pl-8 text-sm" />
              </div>
              <Button variant="outline" size="sm" onClick={selectAllFiltered} className="h-10 text-xs shrink-0"><CheckSquare className="mr-1 h-3.5 w-3.5" />All ({filteredContacts.length})</Button>
              <Button variant="ghost" size="sm" onClick={deselectAllFiltered} className="h-10 text-xs shrink-0">Clear</Button>
            </div>
            <ScrollArea className="flex-1 rounded-xl border bg-card">
              <div className="space-y-2 p-3">
                {filteredContacts.length > 0 ? filteredContacts.map((contact) => renderContactRow(contact)) : (
                  <div className="py-10 text-center text-muted-foreground"><Users className="mx-auto mb-2 h-6 w-6 opacity-50" /><p className="text-sm">No contacts match your filters</p></div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
        )}
      </Tabs>
    </div>
  );
}
