import { useEffect, useMemo, useState } from 'react';
import { Plus, Users, Search, Edit2, Trash2, CheckSquare, X, Wand2, Sparkles, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';

type UiContact = { id: string; firstName: string; lastName: string; email?: string; phone?: string; type?: string; department?: string; currentCity?: string; engagementLevel?: string; status?: string; photo?: string };
type UiSegment = { id: string; name: string; description?: string; memberIds: string[]; memberCount: number; createdAt: string; updatedAt: string };

const locationOptions = ['Bangalore', 'Mumbai', 'Kochi', 'Delhi', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata', 'Palo Alto', 'San Francisco'];
const departmentOptions = ['Technology', 'Analytics', 'Operations', 'R&D', 'Biotech', 'Sales', 'Marketing'];
const typeOptions = [
  { value: 'customer', label: 'Customer' },
  { value: 'lead', label: 'Lead' },
  { value: 'employee', label: 'Employee' },
  { value: 'partner', label: 'Partner' },
  { value: 'vendor', label: 'Vendor' },
];
const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'lead', label: 'Lead' },
  { value: 'pending', label: 'Pending' },
];
const engagementOptions = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
  { value: 'none', label: 'None' },
];

const aiSegmentSuggestions = [
  'Create a segment for all people who work in sales',
  'Find contacts in Bangalore whose job title mentions marketing',
  'Segment employees with job titles related to technology and high engagement',
];

export default function AudienceSegments() {
  const { toast } = useToast();
  const [segments, setSegments] = useState<UiSegment[]>([]);
  const [contacts, setContacts] = useState<UiContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingSegment, setEditingSegment] = useState<UiSegment | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewSegment, setPreviewSegment] = useState<UiSegment | null>(null);
  const [segmentName, setSegmentName] = useState('');
  const [segmentDescription, setSegmentDescription] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiQueryPlan, setAiQueryPlan] = useState<any | null>(null);
  const [aiPreviewLoading, setAiPreviewLoading] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterEngagement, setFilterEngagement] = useState('all');

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

  const handleViewContact = async (contactId: string) => {
    setViewOpen(true);
    setViewLoading(true);
    setViewContact(null);
    try {
      const details = await apiGet<any>(`/contacts/${contactId}`);
      setViewContact(details);
    } catch (e: any) {
      toast({ title: 'Failed to load contact', description: e?.message ?? 'Unknown error', variant: 'destructive' });
      setViewOpen(false);
    } finally {
      setViewLoading(false);
    }
  };

  const fetchSegmentsAndContacts = async () => {
    setLoading(true);
    try {
      const segRows = await apiGet<any[]>('/segments');

      // Pagination: load enough contacts so AI preview matches are likely visible.
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

      const mappedSegments: UiSegment[] = (segRows || []).map((s: any) => ({
        id: String(s.segment_id),
        name: s.name,
        description: s.description || undefined,
        memberIds: [],
        memberCount: Number(s.contact_count || 0),
        createdAt: s.created_at || new Date().toISOString(),
        updatedAt: s.updated_at || s.created_at || new Date().toISOString(),
      }));
      setSegments(mappedSegments);

      const mappedContacts: UiContact[] = (allContacts || []).map((c: any) => ({
        id: String(c.contact_id),
        firstName: c.first_name,
        lastName: c.last_name,
        email: c.email || undefined,
        phone: c.phone || undefined,
        // optional fields not present in backend contact core schema today
        type: c.type || undefined,
        department: c.department || undefined,
        currentCity: c.current_city || undefined,
        engagementLevel: c.engagement_level || undefined,
        status: c.status || undefined,
        photo: c.photo || undefined,
      }));
      setContacts(mappedContacts);
    } catch (e: any) {
      toast({ title: 'Failed to load segments', description: e?.message ?? 'Unknown error', variant: 'destructive' });
      setSegments([]);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSegmentsAndContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setSegmentName('');
    setSegmentDescription('');
    setAiQueryPlan(null);
    setSelectedMemberIds([]);
    setContactSearch('');
    setFilterLocation('all');
    setFilterDepartment('all');
    setFilterType('all');
    setFilterStatus('all');
    setFilterEngagement('all');
    setEditingSegment(null);
  };

  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const matchesSearch = contactSearch === '' || `${c.firstName} ${c.lastName} ${c.email || ''} ${c.department || ''}`.toLowerCase().includes(contactSearch.toLowerCase());
      const matchesLocation = filterLocation === 'all' || (c.currentCity || '').toLowerCase().includes(filterLocation.toLowerCase());
      const matchesDepartment = filterDepartment === 'all' || c.department === filterDepartment;
      const matchesType = filterType === 'all' || c.type === filterType;
      const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
      const matchesEngagement = filterEngagement === 'all' || c.engagementLevel === filterEngagement;
      return matchesSearch && matchesLocation && matchesDepartment && matchesType && matchesStatus && matchesEngagement;
    });
  }, [contacts, contactSearch, filterLocation, filterDepartment, filterType, filterStatus, filterEngagement]);

  const filteredSegments = segments.filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const getSegmentMembers = (memberIds: string[]) => contacts.filter((c) => memberIds.includes(c.id));
  const activeFiltersCount = [filterLocation, filterDepartment, filterType, filterStatus, filterEngagement].filter((f) => f !== 'all').length;

  const toggleMember = (id: string) => setSelectedMemberIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  const selectAll = () => {
    const allIds = filteredContacts.map((c) => c.id);
    setSelectedMemberIds((prev) => Array.from(new Set([...prev, ...allIds])));
  };
  const deselectAll = () => {
    const ids = filteredContacts.map((c) => c.id);
    setSelectedMemberIds((prev) => prev.filter((id) => !ids.includes(id)));
  };
  const clearFilters = () => {
    setContactSearch('');
    setFilterLocation('all');
    setFilterDepartment('all');
    setFilterType('all');
    setFilterStatus('all');
    setFilterEngagement('all');
  };

  const prefillSegmentMetaFromPrompt = (prompt: string): { name: string; description: string } => {
    const cleaned = prompt.trim().replace(/^["']|["']$/g, '');

    // Prefer phrase after last "in <x>" or "for <x>".
    let tail = '';
    const lowered = cleaned.toLowerCase();
    if (lowered.includes(' in ')) tail = lowered.split(' in ').slice(-1)[0] || '';
    else if (lowered.includes(' for ')) tail = lowered.split(' for ').slice(-1)[0] || '';

    // Take first 1-3 tokens from tail
    const tokens = (tail.match(/[a-z0-9]+/gi) || []).slice(0, 3).map((t) => t.toLowerCase());
    const keyword = tokens.join(' ');

    const title = keyword
      ? keyword
          .split(' ')
          .filter(Boolean)
          .map((w) => w[0]?.toUpperCase() + w.slice(1))
          .join(' ')
      : cleaned.slice(0, 40);

    return {
      name: keyword ? `${title} Segment` : `AI Segment`,
      description: keyword ? `Contacts matching: ${title}` : `Contacts matching your prompt`,
    };
  };

  const handleAiPreview = async (promptOverride?: string) => {
    const prompt = (promptOverride ?? aiPrompt).trim();
    if (!prompt) {
      toast({ title: 'Validation Error', description: 'Please enter an AI prompt', variant: 'destructive' });
      return;
    }
    setAiPreviewLoading(true);
    try {
      const res = await apiPost<any>('/segments/preview', { prompt });
      if (!res?.valid) {
        toast({ title: 'AI Preview failed', description: res?.error ?? 'Unknown error', variant: 'destructive' });
        return;
      }
      const contacts = res?.contacts ?? [];
      const ids = contacts.map((c: any) => String(c.contact_id)).filter((id: string) => id);

      // Prefill name/description and open the editor with preselected contacts.
      const meta = prefillSegmentMetaFromPrompt(prompt);
      setEditingSegment(null);
      setSegmentName(meta.name);
      setSegmentDescription(meta.description);
      setSelectedMemberIds(ids);
      setAiQueryPlan(res?.query_plan ?? null);

      // Ensure preselected matches are visible right away.
      setContactSearch('');
      setFilterLocation('all');
      setFilterDepartment('all');
      setFilterType('all');
      setFilterStatus('all');
      setFilterEngagement('all');
      setShowCreateDialog(true);

      toast({
        title: 'AI preview ready',
        description: `${ids.length} contacts preselected. Review and click Create.`,
      });
    } catch (e: any) {
      toast({ title: 'Failed to preview segment', description: e?.message ?? 'Unknown error', variant: 'destructive' });
    } finally {
      setAiPreviewLoading(false);
    }
  };

  const handleSave = () => {
    if (!segmentName) {
      toast({ title: 'Validation Error', description: 'Please enter a segment name', variant: 'destructive' });
      return;
    }
    if (selectedMemberIds.length === 0) {
      toast({ title: 'Validation Error', description: 'Please select at least one member', variant: 'destructive' });
      return;
    }

    if (editingSegment) {
      apiPatch(`/segments/${editingSegment.id}`, {
        name: segmentName,
        description: segmentDescription || null,
        contact_ids: selectedMemberIds.map((id) => Number(id)).filter((n) => Number.isFinite(n)),
      })
        .then(() => {
          toast({ title: 'Success', description: 'Segment updated successfully' });
          setShowCreateDialog(false);
          resetForm();
          return fetchSegmentsAndContacts();
        })
        .catch((e: any) => toast({ title: 'Failed to update segment', description: e?.message ?? 'Unknown error', variant: 'destructive' }));
    } else {
      const payload: any = {
        name: segmentName,
        description: segmentDescription || null,
        contact_ids: selectedMemberIds.map((id) => Number(id)).filter((n) => Number.isFinite(n)),
      };
      if (aiPrompt.trim() && aiQueryPlan) {
        payload.prompt = aiPrompt.trim();
        payload.query_plan = aiQueryPlan;
      }

      apiPost('/segments', payload)
        .then(() => {
          toast({ title: 'Success', description: 'Segment created successfully' });
          setShowCreateDialog(false);
          resetForm();
          return fetchSegmentsAndContacts();
        })
        .catch((e: any) => toast({ title: 'Failed to create segment', description: e?.message ?? 'Unknown error', variant: 'destructive' }));
    }
  };

  const handleEdit = (segment: UiSegment) => {
    setEditingSegment(segment);
    setSegmentName(segment.name);
    setSegmentDescription(segment.description || '');
    setAiQueryPlan(null);
    // Load members from backend for edit
    apiGet<any>(`/segments/${segment.id}`)
      .then((data) => {
        const ids = (data?.contacts || []).map((c: any) => String(c.contact_id));
        setSelectedMemberIds(ids);
        setShowCreateDialog(true);
      })
      .catch((e: any) => toast({ title: 'Failed to load segment members', description: e?.message ?? 'Unknown error', variant: 'destructive' }));
  };

  const handleDelete = (id: string) => {
    apiDelete(`/segments/${id}`)
      .then(() => {
        toast({ title: 'Success', description: 'Segment deleted' });
        return fetchSegmentsAndContacts();
      })
      .catch((e: any) => toast({ title: 'Failed to delete segment', description: e?.message ?? 'Unknown error', variant: 'destructive' }));
  };

  const handlePreview = (segment: UiSegment) => {
    apiGet<any>(`/segments/${segment.id}`)
      .then((data) => {
        const ids = (data?.contacts || []).map((c: any) => String(c.contact_id));
        setPreviewSegment({ ...segment, memberIds: ids, memberCount: ids.length });
        setShowPreviewDialog(true);
      })
      .catch((e: any) => toast({ title: 'Failed to load segment', description: e?.message ?? 'Unknown error', variant: 'destructive' }));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Wand2 className="h-4 w-4 text-primary" />
          AI-first segments
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr] lg:items-start">
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">What segment should AI preselect?</h1>
              <p className="mt-2 text-muted-foreground">Describe the audience in natural language and then review the preselected matches.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g., create a segment for all people who work in sales"
                className="h-12 flex-1"
              />
              <Button
                className="h-12 gap-2"
                onClick={() => handleAiPreview()}
                disabled={aiPreviewLoading || !aiPrompt.trim()}
              >
                <Sparkles className="h-4 w-4" />
                {aiPreviewLoading ? 'Generating…' : 'Create with AI'}
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border bg-muted/40 p-4">
            <p className="text-sm font-medium">Suggested prompts</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {aiSegmentSuggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  className="h-auto whitespace-normal text-left"
                  onClick={() => {
                    setAiPrompt(suggestion);
                    handleAiPreview(suggestion);
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
          <h2 className="text-xl font-semibold">Saved segments</h2>
          <p className="text-sm text-muted-foreground">AI suggestions first, manual review second.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            resetForm();
            setShowCreateDialog(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create segment
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search segments..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filteredSegments.map((segment) => (
          <Card key={segment.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg truncate">{segment.name}</CardTitle>
                  </div>
                  {segment.description && <CardDescription className="mt-2">{segment.description}</CardDescription>}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(segment)}><Edit2 className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(segment.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-2xl font-bold">{segment.memberCount}</span>
                <span className="text-sm text-muted-foreground">members</span>
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={() => handlePreview(segment)}>
                <Users className="mr-2 h-4 w-4" />
                View Members
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {!loading && filteredSegments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 rounded-full bg-muted p-4"><Users className="h-8 w-8 text-muted-foreground" /></div>
          <h3 className="font-semibold">No segments found</h3>
          <p className="mt-1 text-muted-foreground">Create a segment to get started.</p>
        </div>
      )}

      <Dialog open={showCreateDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowCreateDialog(open); }}>
        <DialogContent className="w-[96vw] max-w-[1500px] h-[92vh] p-0">
          <div className="dialog-shell">
            <DialogHeader className="dialog-header-tight">
              <DialogTitle>{editingSegment ? 'Edit Segment' : 'Create Segment'}</DialogTitle>
              <DialogDescription>
                {editingSegment ? 'Edit segment members' : 'Describe your segment, preview matches with AI, then review and create.'}
              </DialogDescription>
            </DialogHeader>

            <div className="dialog-body-scroll grid min-h-0 lg:grid-cols-[320px_minmax(0,1fr)]">
              <aside className="border-b bg-muted/30 p-5 lg:border-b-0 lg:border-r">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Segment Name *</Label>
                    <Input id="name" value={segmentName} onChange={(e) => setSegmentName(e.target.value)} placeholder="e.g., VIP Customers" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input id="description" value={segmentDescription} onChange={(e) => setSegmentDescription(e.target.value)} placeholder="Describe this segment..." />
                  </div>
                  <div className="rounded-2xl border bg-card p-4">
                    <p className="text-sm font-medium">Selection summary</p>
                    <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center justify-between"><span>Selected contacts</span><Badge variant="secondary">{selectedMemberIds.length}</Badge></div>
                      <div className="flex items-center justify-between"><span>Visible after filters</span><Badge variant="outline">{filteredContacts.length}</Badge></div>
                    </div>
                  </div>
                </div>
              </aside>

              <div className="flex min-h-0 flex-col p-5">
                <div className="mb-4 flex flex-wrap gap-2 shrink-0">
                  <div className="relative min-w-[240px] flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Search contacts..." value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} className="pl-9" />
                  </div>
                  <Select value={filterLocation} onValueChange={setFilterLocation}><SelectTrigger className="w-[140px]"><SelectValue placeholder="Location" /></SelectTrigger><SelectContent><SelectItem value="all">All Locations</SelectItem>{locationOptions.map((loc) => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}</SelectContent></Select>
                  <Select value={filterDepartment} onValueChange={setFilterDepartment}><SelectTrigger className="w-[140px]"><SelectValue placeholder="Department" /></SelectTrigger><SelectContent><SelectItem value="all">All Departments</SelectItem>{departmentOptions.map((dept) => <SelectItem key={dept} value={dept}>{dept}</SelectItem>)}</SelectContent></Select>
                  <Select value={filterType} onValueChange={setFilterType}><SelectTrigger className="w-[120px]"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem>{typeOptions.map((type) => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent></Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}><SelectTrigger className="w-[120px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem>{statusOptions.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select>
                  <Select value={filterEngagement} onValueChange={setFilterEngagement}><SelectTrigger className="w-[140px]"><SelectValue placeholder="Engagement" /></SelectTrigger><SelectContent><SelectItem value="all">All Engagement</SelectItem>{engagementOptions.map((eng) => <SelectItem key={eng.value} value={eng.value}>{eng.label}</SelectItem>)}</SelectContent></Select>
                  {activeFiltersCount > 0 && <Button variant="ghost" size="sm" onClick={clearFilters}><X className="mr-1 h-4 w-4" />Clear ({activeFiltersCount})</Button>}
                </div>

                <div className="mb-3 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={selectAll}><CheckSquare className="mr-2 h-4 w-4" />Select All ({filteredContacts.length})</Button>
                    <Button variant="outline" size="sm" onClick={deselectAll}>Deselect Filtered</Button>
                  </div>
                  <Badge variant="secondary" className="text-sm">{selectedMemberIds.length} selected</Badge>
                </div>

                <ScrollArea className="min-h-0 flex-1 rounded-xl border bg-card">
                  <div className="space-y-2 p-3">
                    {filteredContacts.map((c) => (
                      <div key={c.id} className={cn('flex items-center gap-3 rounded-xl border p-3 cursor-pointer hover:bg-muted/50 transition-colors', selectedMemberIds.includes(c.id) && 'bg-primary/10 border-primary/20')} onClick={() => toggleMember(c.id)}>
                        <Checkbox checked={selectedMemberIds.includes(c.id)} />
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">{c.photo ? <img src={c.photo} alt={`${c.firstName} ${c.lastName}`} className="h-10 w-10 rounded-full object-cover" /> : <span className="text-sm font-medium">{c.firstName[0]}{c.lastName[0]}</span>}</div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{c.firstName} {c.lastName}</p>
                          <p className="truncate text-sm text-muted-foreground">{c.email}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 flex-wrap justify-end">
                          <Badge variant="outline" className="text-xs capitalize">{c.type}</Badge>
                          <Badge variant="secondary" className="text-xs">{c.department}</Badge>
                          {c.currentCity && <Badge variant="outline" className="text-xs">{c.currentCity}</Badge>}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewContact(c.id);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
                    {filteredContacts.length === 0 && <div className="py-10 text-center text-muted-foreground"><Users className="mx-auto mb-2 h-8 w-8 opacity-50" /><p>No contacts match your filters</p></div>}
                  </div>
                </ScrollArea>
              </div>
            </div>

            <div className="dialog-footer-bar flex justify-end gap-3">
              <Button variant="outline" onClick={() => { resetForm(); setShowCreateDialog(false); }}>Cancel</Button>
              <Button onClick={handleSave}>{editingSegment ? 'Update Segment' : 'Create Segment'} ({selectedMemberIds.length})</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="w-[96vw] max-w-2xl">
          <DialogHeader>
            <DialogTitle>Contact details</DialogTitle>
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

      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 shrink-0"><DialogTitle>{previewSegment?.name} - Members</DialogTitle><DialogDescription>{previewSegment?.memberCount} contacts in this segment</DialogDescription></DialogHeader>
          <ScrollArea className="flex-1 px-6"><div className="space-y-2 pb-4">{previewSegment && getSegmentMembers(previewSegment.memberIds).map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">{c.photo ? <img src={c.photo} alt={`${c.firstName} ${c.lastName}`} className="h-10 w-10 rounded-full object-cover" /> : <span className="text-sm font-medium">{c.firstName[0]}{c.lastName[0]}</span>}</div>
              <div className="min-w-0 flex-1"><p className="truncate font-medium">{c.firstName} {c.lastName}</p><p className="truncate text-sm text-muted-foreground">{c.email}</p></div>
              <div className="flex items-center gap-2 shrink-0"><Badge variant="outline" className="capitalize">{c.type}</Badge><span className="text-xs text-muted-foreground">{c.phone}</span></div>
            </div>
          ))}</div></ScrollArea>
          <div className="flex justify-end gap-3 border-t p-6 pt-4 shrink-0"><Button variant="outline" onClick={() => setShowPreviewDialog(false)}>Close</Button><Button onClick={() => { handleEdit(previewSegment!); setShowPreviewDialog(false); }}><Edit2 className="mr-2 h-4 w-4" />Edit Segment</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
