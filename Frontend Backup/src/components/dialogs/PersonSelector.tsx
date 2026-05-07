import { useEffect, useMemo, useState } from 'react';
import { Search, X, Users, Filter, CheckSquare, ChevronRight, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AudienceSegment } from '@/types/contact';
import { cn } from '@/lib/utils';
import { apiGet } from '@/lib/api';

const selectorFilterFields = [
  { field_name: 'first_name', display_name: 'First Name' },
  { field_name: 'last_name', display_name: 'Last Name' },
  { field_name: 'email', display_name: 'Email' },
  { field_name: 'phone', display_name: 'Phone' },
  { field_name: 'current_city', display_name: 'Current City' },
];

const normalize = (value?: string | null) => (value || '').trim().toLowerCase();

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
  const [filters, setFilters] = useState<{ field_name: string; op: string; value: string }[]>([]);
  const [appliedFilters, setAppliedFilters] = useState<{ field_name: string; op: string; value: string }[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  const [viewSegment, setViewSegment] = useState<AudienceSegment | null>(null);
  const [viewSegmentContacts, setViewSegmentContacts] = useState<Array<{
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  }>>([]);
  const [viewSegmentLoading, setViewSegmentLoading] = useState(false);
  const [hoveredSegmentViewId, setHoveredSegmentViewId] = useState<string | null>(null);
  const [hoveredContactViewId, setHoveredContactViewId] = useState<string | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewContact, setViewContact] = useState<{
    contact_id?: number;
    first_name?: string;
    last_name?: string;
    email?: string | null;
    phone?: string | null;
    created_at?: string;
    updated_at?: string;
    attributes?: Record<string, unknown>;
  } | null>(null);

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

  const getContactFieldValue = (contact: PersonSelectorProps['contacts'][number], fieldName: string) => {
    switch (fieldName) {
      case 'first_name':
        return contact.firstName || '';
      case 'last_name':
        return contact.lastName || '';
      case 'email':
        return contact.email || '';
      case 'phone':
        return contact.phone || contact.whatsapp || '';
      case 'current_city':
        return contact.currentCity || '';
      default:
        return '';
    }
  };

  const handleViewContact = async (contactId: string) => {
    setViewOpen(true);
    setViewLoading(true);
    setViewContact(null);
    try {
      const details = await apiGet<any>(`/contacts/${contactId}`);
      setViewContact(details);
    } finally {
      setViewLoading(false);
    }
  };

  const handleViewSegment = async (segment: AudienceSegment) => {
    setViewSegment(segment);
    setViewSegmentContacts([]);
    setViewSegmentLoading(true);
    try {
      const data = await apiGet<any>(`/segments/${segment.id}`);
      const mapped = (data?.contacts || []).map((c: any) => ({
        id: String(c.contact_id),
        firstName: c.first_name || '',
        lastName: c.last_name || '',
        email: c.email || undefined,
        phone: c.phone || undefined,
      }));
      setViewSegmentContacts(mapped);
    } catch {
      setViewSegmentContacts([]);
    } finally {
      setViewSegmentLoading(false);
    }
  };

  const filteredContacts = useMemo(() => {
    return contacts.filter((contact) => {
      const search = normalize(contactSearch);
      const fullName = normalize(`${contact.firstName} ${contact.lastName}`);
      const email = normalize(contact.email);
      const matchesSearch = search === '' || fullName.includes(search) || email.includes(search);
      const matchesAppliedFilters = appliedFilters.every((filter) => {
        const contactValue = normalize(getContactFieldValue(contact, filter.field_name));
        const filterValue = normalize(filter.value);
        if (!filterValue) return true;
        if (filter.op === 'eq') return contactValue === filterValue;
        return contactValue.includes(filterValue);
      });
      if (filterByPhone && !contact.whatsapp && !contact.phone) return false;
      return matchesSearch && matchesAppliedFilters;
    });
  }, [contacts, contactSearch, appliedFilters, filterByPhone]);

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
    setFilters([]);
    setAppliedFilters([]);
  };

  const applyFilters = () => {
    const validFilters = filters.filter((f) => f.field_name && f.value.trim());
    setAppliedFilters(validFilters);
  };

  const activeFiltersCount = appliedFilters.length;

  const renderContactRow = (contact: PersonSelectorProps['contacts'][number]) => (
    <div
      key={contact.id}
      className={cn(
        'flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors',
        hoveredContactViewId !== contact.id && 'hover:bg-accent',
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
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            handleViewContact(contact.id);
          }}
          onMouseEnter={() => setHoveredContactViewId(contact.id)}
          onMouseLeave={() => setHoveredContactViewId(null)}
        >
          <Eye className="mr-1 h-3.5 w-3.5" />
          View
        </Button>
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
                <div
                  key={segment.id}
                  className={cn(
                    'flex items-center justify-between rounded-xl border p-4 cursor-pointer transition-colors',
                    hoveredSegmentViewId !== segment.id && 'hover:bg-accent',
                    selectedSegments.includes(segment.id) && 'bg-primary/10 border-primary/20',
                  )}
                  onClick={() => toggleSegment(segment.id)}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox checked={selectedSegments.includes(segment.id)} />
                    <div>
                      <p className="font-medium text-sm">{segment.name}</p>
                      <p className="text-xs text-muted-foreground">{segment.memberCount} members</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{segment.memberCount}</Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewSegment(segment);
                      }}
                      onMouseEnter={() => setHoveredSegmentViewId(segment.id)}
                      onMouseLeave={() => setHoveredSegmentViewId(null)}
                    >
                      <Eye className="mr-1 h-3.5 w-3.5" />
                      View
                    </Button>
                  </div>
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
                  {filters.map((f, idx) => (
                    <div key={idx} className="space-y-1.5">
                      <Select
                        value={f.field_name || '__field__'}
                        onValueChange={(value) => {
                          const normalizedValue = value === '__field__' ? '' : value;
                          setFilters((prev) => prev.map((pf, i) => (i === idx ? { ...pf, field_name: normalizedValue } : pf)));
                        }}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Field" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__field__">Field</SelectItem>
                          {selectorFilterFields.map((field) => (
                            <SelectItem key={field.field_name} value={field.field_name}>
                              {field.display_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={f.op}
                        onValueChange={(value) => {
                          setFilters((prev) => prev.map((pf, i) => (i === idx ? { ...pf, op: value } : pf)));
                        }}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Operator" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="eq">Equals</SelectItem>
                          <SelectItem value="contains">Contains</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="flex gap-1.5">
                        <Input
                          placeholder="Value"
                          value={f.value}
                          onChange={(e) => {
                            const value = e.target.value;
                            setFilters((prev) => prev.map((pf, i) => (i === idx ? { ...pf, value } : pf)));
                          }}
                          className="h-9 text-xs"
                        />
                        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setFilters((prev) => prev.filter((_, i) => i !== idx))}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters((prev) => [...prev, { field_name: '', op: 'eq', value: '' }])}
                    className="h-8 w-full text-xs"
                  >
                    + Add filter
                  </Button>
                  {filters.length > 0 && (
                    <Button variant="outline" size="sm" onClick={applyFilters} className="h-8 w-full text-xs">
                      Apply filters
                    </Button>
                  )}
                  {(activeFiltersCount > 0 || filters.length > 0 || contactSearch.trim()) && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 w-full text-xs">
                      <X className="mr-1 h-3 w-3" />
                      Clear
                      {activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
                    </Button>
                  )}
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

      <Dialog open={Boolean(viewSegment)} onOpenChange={(open) => { if (!open) setViewSegment(null); }}>
        <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 shrink-0">
            <DialogTitle>{viewSegment?.name} - Members</DialogTitle>
            <DialogDescription>{viewSegment?.memberCount || 0} contacts in this segment</DialogDescription>
          </DialogHeader>
          {viewSegment && (
            <>
              <ScrollArea className="flex-1 px-6">
                <div className="space-y-2 pb-4">
                  {viewSegmentLoading ? (
                    <div className="py-10 text-center text-muted-foreground">Loading members…</div>
                  ) : viewSegmentContacts.length === 0 ? (
                    <div className="py-10 text-center text-muted-foreground">No members found for this segment.</div>
                  ) : (
                    viewSegmentContacts.map((c) => (
                      <div key={c.id} className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                          <span className="text-sm font-medium">{c.firstName[0]}{c.lastName[0]}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{c.firstName} {c.lastName}</p>
                          <p className="truncate text-sm text-muted-foreground">{c.email}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground">{c.phone}</span>
                          <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => handleViewContact(c.id)}>
                            <Eye className="mr-1 h-3.5 w-3.5" />
                            View
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
              <div className="flex justify-end gap-3 border-t p-6 pt-4 shrink-0">
                <Button variant="outline" onClick={() => setViewSegment(null)}>Close</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="w-[96vw] max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Contact details
            </DialogTitle>
            <DialogDescription>{viewContact ? `${viewContact.first_name ?? ''} ${viewContact.last_name ?? ''}`.trim() : ' '}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {viewLoading ? (
              <div className="py-10 text-center text-muted-foreground">Loading…</div>
            ) : viewContact ? (
              <>
                <div className="rounded-xl border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-base font-semibold truncate">
                        {viewContact.first_name} {viewContact.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground break-all">
                        {viewContact.email || viewContact.phone || 'No email/phone'}
                      </p>
                    </div>
                    <Badge variant="secondary">ID: {viewContact.contact_id}</Badge>
                  </div>
                  {viewContact.created_at && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Created: {new Date(viewContact.created_at).toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-sm font-medium mb-2">Attributes</p>
                  {viewContact.attributes && Object.keys(viewContact.attributes).length > 0 ? (
                    <div className="max-h-[40vh] overflow-auto pr-2">
                      {Object.entries(viewContact.attributes).map(([k, v]) => (
                        <div key={k} className="flex items-start justify-between gap-3 py-1 border-b last:border-b-0">
                          <span className="text-xs text-muted-foreground">{k}</span>
                          <span className="text-sm text-right break-all">{v as any}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No custom attributes</p>
                  )}
                </div>
              </>
            ) : (
              <div className="py-10 text-center text-muted-foreground">No contact selected</div>
            )}
          </div>
          <div className="flex justify-end pt-4">
            <Button onClick={() => setViewOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
