import { useState, useMemo } from 'react';
import { Plus, Users, Search, Edit2, Trash2, Filter, CheckSquare, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { AudienceSegment, Alumni } from '@/types/alumni';
import { mockAlumni } from '@/data/mockData';
import { cn } from '@/lib/utils';

const initialSegments: AudienceSegment[] = [
  {
    id: '1',
    name: 'Bangalore Alumni',
    description: 'All alumni based in Bangalore',
    filters: { locations: ['Bangalore'] },
    memberIds: ['1', '5'],
    memberCount: 2,
    createdAt: '2024-01-15',
    createdBy: 'admin',
    updatedAt: '2024-01-15',
  },
  {
    id: '2',
    name: 'Computer Science Professors',
    description: 'Professors from CS department',
    filters: { departments: ['Computer Science'], types: ['professor'] },
    memberIds: ['1'],
    memberCount: 1,
    createdAt: '2024-01-10',
    createdBy: 'admin',
    updatedAt: '2024-01-10',
  },
  {
    id: '3',
    name: 'High Engagement Alumni',
    description: 'Alumni with high engagement scores',
    filters: { engagementLevels: ['high'] },
    memberIds: ['1', '4'],
    memberCount: 2,
    createdAt: '2024-01-08',
    createdBy: 'admin',
    updatedAt: '2024-01-08',
  },
  {
    id: '4',
    name: 'Available Mentors',
    description: 'Alumni available for mentoring sessions',
    filters: { tags: ['Mentor'] },
    memberIds: ['1', '2', '4', '5'],
    memberCount: 4,
    createdAt: '2024-01-05',
    createdBy: 'admin',
    updatedAt: '2024-01-05',
  },
];

const locationOptions = ['Bangalore', 'Mumbai', 'Kochi', 'Delhi', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata', 'Palo Alto', 'San Francisco'];
const departmentOptions = ['Computer Science', 'Mathematics', 'Physics', 'Biotechnology', 'Administration', 'Electronics', 'Chemistry'];
const typeOptions = [
  { value: 'professor', label: 'Professor' },
  { value: 'ta', label: 'Teaching Assistant' },
  { value: 'staff', label: 'Staff' },
  { value: 'researcher', label: 'Researcher' },
  { value: 'administrator', label: 'Administrator' },
];
const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'rejoined', label: 'Rejoined' },
  { value: 'pending', label: 'Pending' },
];
const engagementOptions = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
  { value: 'none', label: 'None' },
];

export default function AudienceSegments() {
  const { toast } = useToast();
  const [segments, setSegments] = useState<AudienceSegment[]>(initialSegments);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingSegment, setEditingSegment] = useState<AudienceSegment | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewSegment, setPreviewSegment] = useState<AudienceSegment | null>(null);

  // Segment form state
  const [segmentName, setSegmentName] = useState('');
  const [segmentDescription, setSegmentDescription] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  // Alumni filtering state for selection
  const [alumniSearch, setAlumniSearch] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterEngagement, setFilterEngagement] = useState('all');

  const resetForm = () => {
    setSegmentName('');
    setSegmentDescription('');
    setSelectedMemberIds([]);
    setAlumniSearch('');
    setFilterLocation('all');
    setFilterDepartment('all');
    setFilterType('all');
    setFilterStatus('all');
    setFilterEngagement('all');
    setEditingSegment(null);
  };

  // Filter alumni based on all criteria
  const filteredAlumni = useMemo(() => {
    return mockAlumni.filter((alumni) => {
      // Search filter
      const matchesSearch = alumniSearch === '' ||
        `${alumni.firstName} ${alumni.lastName} ${alumni.email} ${alumni.department}`.toLowerCase().includes(alumniSearch.toLowerCase());

      // Location filter
      const matchesLocation = filterLocation === 'all' ||
        alumni.currentCity?.toLowerCase().includes(filterLocation.toLowerCase()) ||
        alumni.location?.toLowerCase().includes(filterLocation.toLowerCase());

      // Department filter
      const matchesDepartment = filterDepartment === 'all' || alumni.department === filterDepartment;

      // Type filter
      const matchesType = filterType === 'all' || alumni.type === filterType;

      // Status filter
      const matchesStatus = filterStatus === 'all' || alumni.status === filterStatus;

      // Engagement filter
      const matchesEngagement = filterEngagement === 'all' || alumni.engagementLevel === filterEngagement;

      return matchesSearch && matchesLocation && matchesDepartment && matchesType && matchesStatus && matchesEngagement;
    });
  }, [alumniSearch, filterLocation, filterDepartment, filterType, filterStatus, filterEngagement]);

  const toggleMember = (alumniId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(alumniId) ? prev.filter((id) => id !== alumniId) : [...prev, alumniId]
    );
  };

  const selectAll = () => {
    const allIds = filteredAlumni.map((a) => a.id);
    setSelectedMemberIds((prev) => {
      const newIds = new Set([...prev, ...allIds]);
      return Array.from(newIds);
    });
  };

  const deselectAll = () => {
    const filteredIds = filteredAlumni.map((a) => a.id);
    setSelectedMemberIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
  };

  const clearFilters = () => {
    setAlumniSearch('');
    setFilterLocation('all');
    setFilterDepartment('all');
    setFilterType('all');
    setFilterStatus('all');
    setFilterEngagement('all');
  };

  const handleSave = () => {
    if (!segmentName) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a segment name',
        variant: 'destructive',
      });
      return;
    }

    if (selectedMemberIds.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one member',
        variant: 'destructive',
      });
      return;
    }

    if (editingSegment) {
      setSegments((prev) =>
        prev.map((s) =>
          s.id === editingSegment.id
            ? {
                ...s,
                name: segmentName,
                description: segmentDescription,
                memberIds: selectedMemberIds,
                memberCount: selectedMemberIds.length,
                updatedAt: new Date().toISOString(),
              }
            : s
        )
      );
      toast({ title: 'Success', description: 'Segment updated successfully' });
    } else {
      const newSegment: AudienceSegment = {
        id: crypto.randomUUID(),
        name: segmentName,
        description: segmentDescription,
        filters: {},
        memberIds: selectedMemberIds,
        memberCount: selectedMemberIds.length,
        createdAt: new Date().toISOString(),
        createdBy: 'current_user',
        updatedAt: new Date().toISOString(),
      };
      setSegments((prev) => [newSegment, ...prev]);
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
    setShowCreateDialog(true);
  };

  const handleDelete = (segmentId: string) => {
    setSegments((prev) => prev.filter((s) => s.id !== segmentId));
    toast({ title: 'Success', description: 'Segment deleted successfully' });
  };

  const handlePreview = (segment: AudienceSegment) => {
    setPreviewSegment(segment);
    setShowPreviewDialog(true);
  };

  const filteredSegments = segments.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSegmentMembers = (memberIds: string[]) => {
    return mockAlumni.filter((a) => memberIds.includes(a.id));
  };

  const activeFiltersCount = [filterLocation, filterDepartment, filterType, filterStatus, filterEngagement].filter((f) => f !== 'all').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Audience Segments</h1>
          <p className="text-muted-foreground">
            Create and manage reusable contact groups for communications and events
          </p>
        </div>
        <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Segment
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search segments..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Segments Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filteredSegments.map((segment) => (
          <Card key={segment.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{segment.name}</CardTitle>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleEdit(segment)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => handleDelete(segment.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {segment.description && (
                <CardDescription>{segment.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl font-bold">{segment.memberCount}</span>
                <span className="text-sm text-muted-foreground">members</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => handlePreview(segment)}
              >
                <Users className="h-4 w-4 mr-2" />
                View Members
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSegments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold">No segments found</h3>
          <p className="text-muted-foreground mt-1">
            Create your first audience segment to get started
          </p>
          <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Segment
          </Button>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => { if (!open) resetForm(); setShowCreateDialog(open); }}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-0 shrink-0">
            <DialogTitle>{editingSegment ? 'Edit Segment' : 'Create Audience Segment'}</DialogTitle>
            <DialogDescription>
              Select people to add to this segment
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col px-6">
            {/* Segment Info */}
            <div className="grid grid-cols-2 gap-4 mb-4 shrink-0">
              <div className="space-y-2">
                <Label htmlFor="name">Segment Name *</Label>
                <Input
                  id="name"
                  value={segmentName}
                  onChange={(e) => setSegmentName(e.target.value)}
                  placeholder="e.g., Bangalore Tech Alumni"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={segmentDescription}
                  onChange={(e) => setSegmentDescription(e.target.value)}
                  placeholder="Describe this segment..."
                />
              </div>
            </div>

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
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locationOptions.map((loc) => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departmentOptions.map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {typeOptions.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* <Select value={filterEngagement} onValueChange={setFilterEngagement}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Engagement" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Engagement</SelectItem>
                  {engagementOptions.map((eng) => (
                    <SelectItem key={eng.value} value={eng.value}>{eng.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select> */}
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Clear ({activeFiltersCount})
                </Button>
              )}
            </div>

            {/* Selection Actions */}
            <div className="flex items-center justify-between mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Select All ({filteredAlumni.length})
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll}>
                  Deselect Filtered
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-sm">
                  {selectedMemberIds.length} selected
                </Badge>
              </div>
            </div>

            {/* Alumni List */}
            <ScrollArea className="flex-1 border rounded-lg">
              <div className="p-2 space-y-1">
                {filteredAlumni.map((alumni) => (
                  <div
                    key={alumni.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-muted transition-colors',
                      selectedMemberIds.includes(alumni.id) && 'bg-primary/10 border border-primary/20'
                    )}
                    onClick={() => toggleMember(alumni.id)}
                  >
                    <Checkbox checked={selectedMemberIds.includes(alumni.id)} />
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      {alumni.photo ? (
                        <img src={alumni.photo} alt="" className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <span className="text-sm font-medium">{alumni.firstName[0]}{alumni.lastName[0]}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{alumni.firstName} {alumni.lastName}</p>
                      <p className="text-sm text-muted-foreground truncate">{alumni.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-xs capitalize">{alumni.type}</Badge>
                      <Badge variant="secondary" className="text-xs">{alumni.department}</Badge>
                      {alumni.currentCity && (
                        <Badge variant="outline" className="text-xs">{alumni.currentCity}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
                      <span>{alumni.phone}</span>
                    </div>
                  </div>
                ))}
                {filteredAlumni.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No alumni match your filters</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="flex justify-end gap-3 p-6 pt-4 border-t shrink-0">
            <Button variant="outline" onClick={() => { resetForm(); setShowCreateDialog(false); }}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingSegment ? 'Update Segment' : 'Create Segment'} ({selectedMemberIds.length})
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4 shrink-0">
            <DialogTitle>{previewSegment?.name} - Members</DialogTitle>
            <DialogDescription>
              {previewSegment?.memberCount} contacts in this segment
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 px-6">
            <div className="space-y-2 pb-4">
              {previewSegment && getSegmentMembers(previewSegment.memberIds).map((alumni) => (
                <div
                  key={alumni.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    {alumni.photo ? (
                      <img src={alumni.photo} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <span className="text-sm font-medium">{alumni.firstName[0]}{alumni.lastName[0]}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{alumni.firstName} {alumni.lastName}</p>
                    <p className="text-sm text-muted-foreground truncate">{alumni.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="capitalize">{alumni.type}</Badge>
                    <span className="text-xs text-muted-foreground">{alumni.phone}</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-3 p-6 pt-4 border-t shrink-0">
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Close
            </Button>
            <Button onClick={() => { handleEdit(previewSegment!); setShowPreviewDialog(false); }}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit Segment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
