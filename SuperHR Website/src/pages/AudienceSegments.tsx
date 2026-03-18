import { useMemo, useState } from 'react';
import { Plus, Users, Search, Edit2, Trash2, CheckSquare, X, Sparkles, Wand2 } from 'lucide-react';
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
import { AudienceSegment } from '@/types/contact';
import { mockContacts } from '@/data/mockData';
import { cn } from '@/lib/utils';

const initialSegments: AudienceSegment[] = [
  { id: '1', name: 'Bangalore Contacts', description: 'All contacts based in Bangalore', filters: { locations: ['Bangalore'] }, memberIds: ['1', '5'], memberCount: 2, createdAt: '2024-01-15', createdBy: 'admin', updatedAt: '2024-01-15' },
  { id: '2', name: 'Tech Department', description: 'Contacts from Technology department', filters: { departments: ['Technology'] }, memberIds: ['1'], memberCount: 1, createdAt: '2024-01-10', createdBy: 'admin', updatedAt: '2024-01-10' },
  { id: '3', name: 'High Engagement', description: 'Contacts with high engagement scores', filters: { engagementLevels: ['high'] }, memberIds: ['1', '4'], memberCount: 2, createdAt: '2024-01-08', createdBy: 'admin', updatedAt: '2024-01-08' },
  { id: '4', name: 'Available Consultants', description: 'Contacts available for consulting', filters: { tags: ['Consultant'] }, memberIds: ['1', '2', '4', '5'], memberCount: 4, createdAt: '2024-01-05', createdBy: 'admin', updatedAt: '2024-01-05' },
];

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
  'Create a segment of Mumbai leads who prefer WhatsApp and have medium engagement',
  'Build a VIP segment of highly engaged Bangalore contacts for an in-person event',
  'Find inactive partners who should be reactivated this month',
];

export default function AudienceSegments() {
  const { toast } = useToast();
  const [segments, setSegments] = useState<AudienceSegment[]>(initialSegments);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingSegment, setEditingSegment] = useState<AudienceSegment | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewSegment, setPreviewSegment] = useState<AudienceSegment | null>(null);
  const [segmentName, setSegmentName] = useState('');
  const [segmentDescription, setSegmentDescription] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterEngagement, setFilterEngagement] = useState('all');
  const [aiPrompt, setAiPrompt] = useState('');
  const [lastAiPrompt, setLastAiPrompt] = useState('');

  const resetForm = () => {
    setSegmentName('');
    setSegmentDescription('');
    setSelectedMemberIds([]);
    setContactSearch('');
    setFilterLocation('all');
    setFilterDepartment('all');
    setFilterType('all');
    setFilterStatus('all');
    setFilterEngagement('all');
    setEditingSegment(null);
    setLastAiPrompt('');
  };

  const filteredContacts = useMemo(() => {
    return mockContacts.filter((c) => {
      const matchesSearch = contactSearch === '' || `${c.firstName} ${c.lastName} ${c.email} ${c.department}`.toLowerCase().includes(contactSearch.toLowerCase());
      const matchesLocation = filterLocation === 'all' || c.currentCity?.toLowerCase().includes(filterLocation.toLowerCase()) || c.location?.toLowerCase().includes(filterLocation.toLowerCase());
      const matchesDepartment = filterDepartment === 'all' || c.department === filterDepartment;
      const matchesType = filterType === 'all' || c.type === filterType;
      const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
      const matchesEngagement = filterEngagement === 'all' || c.engagementLevel === filterEngagement;
      return matchesSearch && matchesLocation && matchesDepartment && matchesType && matchesStatus && matchesEngagement;
    });
  }, [contactSearch, filterLocation, filterDepartment, filterType, filterStatus, filterEngagement]);

  const filteredSegments = segments.filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const getSegmentMembers = (memberIds: string[]) => mockContacts.filter((c) => memberIds.includes(c.id));
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

  const runAiSegmentCreation = (prompt = aiPrompt) => {
    if (!prompt.trim()) {
      toast({ title: 'Add an instruction', description: 'Describe the segment you want AI to prepare.', variant: 'destructive' });
      return;
    }

    const lowerPrompt = prompt.toLowerCase();
    const suggestedContacts = mockContacts.filter((contact) => {
      const matchesLocation = lowerPrompt.includes('bangalore') ? contact.currentCity === 'Bangalore'
        : lowerPrompt.includes('mumbai') ? contact.currentCity === 'Mumbai'
        : lowerPrompt.includes('kochi') ? contact.currentCity === 'Kochi'
        : true;
      const matchesEngagement = lowerPrompt.includes('high engagement') || lowerPrompt.includes('vip')
        ? contact.engagementLevel === 'high'
        : lowerPrompt.includes('medium engagement')
          ? contact.engagementLevel === 'medium'
          : true;
      const matchesDepartment = lowerPrompt.includes('technology') || lowerPrompt.includes('tech')
        ? contact.department === 'Technology'
        : lowerPrompt.includes('analytics')
          ? contact.department === 'Analytics'
          : true;
      const matchesType = lowerPrompt.includes('lead') ? contact.type === 'lead'
        : lowerPrompt.includes('partner') ? contact.type === 'partner'
        : lowerPrompt.includes('customer') ? contact.type === 'customer'
        : true;
      return matchesLocation && matchesEngagement && matchesDepartment && matchesType;
    });

    setSegmentName(prompt.length > 42 ? `${prompt.slice(0, 42)}…` : prompt);
    setSegmentDescription(`AI prepared from: ${prompt}`);
    setSelectedMemberIds(suggestedContacts.map((contact) => contact.id));
    setLastAiPrompt(prompt);
    setShowCreateDialog(true);
    toast({ title: 'AI draft ready', description: `${suggestedContacts.length} contacts were preselected for review.` });
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
      setSegments((prev) => prev.map((s) => s.id === editingSegment.id ? { ...s, name: segmentName, description: segmentDescription, memberIds: selectedMemberIds, memberCount: selectedMemberIds.length, updatedAt: new Date().toISOString() } : s));
      toast({ title: 'Success', description: 'Segment updated successfully' });
    } else {
      setSegments((prev) => [{ id: crypto.randomUUID(), name: segmentName, description: segmentDescription, filters: { customQuery: lastAiPrompt || undefined }, memberIds: selectedMemberIds, memberCount: selectedMemberIds.length, createdAt: new Date().toISOString(), createdBy: 'current_user', updatedAt: new Date().toISOString() }, ...prev]);
      toast({ title: 'Success', description: 'Segment created successfully' });
    }
    setShowCreateDialog(false);
    resetForm();
  };

  const handleEdit = (segment: AudienceSegment) => {
    setEditingSegment(segment);
    setSegmentName(segment.name);
    setSegmentDescription(segment.description || '');
    setSelectedMemberIds(segment.memberIds);
    setLastAiPrompt(segment.filters.customQuery || '');
    setShowCreateDialog(true);
  };

  const handleDelete = (id: string) => {
    setSegments((prev) => prev.filter((s) => s.id !== id));
    toast({ title: 'Success', description: 'Segment deleted' });
  };

  const handlePreview = (segment: AudienceSegment) => {
    setPreviewSegment(segment);
    setShowPreviewDialog(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Wand2 className="h-4 w-4 text-primary" />
          AI-first segment builder
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr] lg:items-start">
          <div className="space-y-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">What segment should AI create?</h1>
              <p className="mt-2 text-muted-foreground">Describe the audience in plain English and review the preselected contacts before saving.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="e.g., Build a segment of highly engaged Bangalore contacts for a VIP dinner" className="h-12 flex-1" />
              <Button className="h-12 gap-2" onClick={() => runAiSegmentCreation()}>
                <Sparkles className="h-4 w-4" />
                Create with AI
              </Button>
            </div>
          </div>
          <div className="rounded-2xl border bg-muted/40 p-4">
            <p className="text-sm font-medium">Try one of these</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {aiSegmentSuggestions.map((suggestion) => (
                <Button key={suggestion} variant="outline" size="sm" className="h-auto whitespace-normal text-left" onClick={() => { setAiPrompt(suggestion); runAiSegmentCreation(suggestion); }}>
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
        <Button variant="outline" onClick={() => { resetForm(); setShowCreateDialog(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Open manual editor
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

      {filteredSegments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-4 rounded-full bg-muted p-4"><Users className="h-8 w-8 text-muted-foreground" /></div>
          <h3 className="font-semibold">No segments found</h3>
          <p className="mt-1 text-muted-foreground">Try an AI instruction to create one.</p>
        </div>
      )}

      <Dialog open={showCreateDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowCreateDialog(open); }}>
        <DialogContent className="w-[96vw] max-w-[1500px] h-[92vh] p-0">
          <div className="dialog-shell">
            <DialogHeader className="dialog-header-tight">
              <DialogTitle>{editingSegment ? 'Edit Segment' : 'Review AI Segment Draft'}</DialogTitle>
              <DialogDescription>Fixed segment details are on the left so more contacts remain visible while reviewing.</DialogDescription>
            </DialogHeader>

            <div className="dialog-body-scroll grid min-h-0 lg:grid-cols-[320px_minmax(0,1fr)]">
              <aside className="border-b bg-muted/30 p-5 lg:border-b-0 lg:border-r">
                <div className="space-y-4">
                  <div className="rounded-2xl border bg-card p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium"><Sparkles className="h-4 w-4 text-primary" /> AI request</div>
                    <p className="text-sm text-muted-foreground">{lastAiPrompt || 'Manual segment editing mode.'}</p>
                  </div>
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
