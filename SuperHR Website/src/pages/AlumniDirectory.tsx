import { useState } from 'react';
import { Plus, Download, Upload, Grid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlumniCard } from '@/components/alumni/AlumniCard';
import { AlumniFilters, AlumniFiltersState } from '@/components/alumni/AlumniFilters';
import { AddAlumniDialog } from '@/components/dialogs/AddAlumniDialog';
import { AlumniDetailDialog } from '@/components/dialogs/AlumniDetailDialog';
import { mockAlumni as initialAlumni } from '@/data/mockData';
import { Alumni } from '@/types/alumni';
import { useToast } from '@/hooks/use-toast';

export default function AlumniDirectory() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedAlumni, setSelectedAlumni] = useState<Alumni | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [alumni, setAlumni] = useState<Alumni[]>(initialAlumni);

  const [filters, setFilters] = useState<AlumniFiltersState>({
    searchQuery: '',
    status: 'all',
    type: 'all',
    department: 'all',
    location: 'all',
    engagement: 'all',
    availableFor: [],
  });

  const filteredAlumni = alumni.filter((a) => {
    // Search query
    const matchesSearch = `${a.firstName} ${a.lastName} ${a.email} ${a.department}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    // Status filter
    const matchesStatus = filters.status === 'all' || a.status === filters.status;

    // Type filter
    const matchesType = filters.type === 'all' || a.type === filters.type;

    // Department filter
    const matchesDepartment = filters.department === 'all' || a.department === filters.department;

    // Location filter
    const matchesLocation =
      filters.location === 'all' ||
      a.currentCity?.toLowerCase().includes(filters.location.toLowerCase()) ||
      a.location?.toLowerCase().includes(filters.location.toLowerCase());

    // Engagement filter
    const matchesEngagement = filters.engagement === 'all' || a.engagementLevel === filters.engagement;

    // Available for filter
    const matchesAvailable =
      !filters.availableFor?.length ||
      (filters.availableFor.includes('mentoring') && a.availableForMentoring) ||
      (filters.availableFor.includes('hiring') && a.availableForHiring) ||
      (filters.availableFor.includes('events') && a.availableForEvents);

    return (
      matchesSearch &&
      matchesStatus &&
      matchesType &&
      matchesDepartment &&
      matchesLocation &&
      matchesEngagement &&
      matchesAvailable
    );
  });

  const handleAddAlumni = (newAlumni: Alumni) => {
    setAlumni((prev) => [newAlumni, ...prev]);
  };

  const handleUpdateAlumni = (updated: Alumni) => {
    setAlumni((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  };

  const handleRemoveAlumni = (alumniId: string) => {
    setAlumni((prev) => prev.filter((a) => a.id !== alumniId));
    setShowDetailDialog(false);
    setSelectedAlumni(null);
    toast({
      title: 'Success',
      description: 'Alumni record removed successfully',
    });
  };

  const handleCardClick = (alumniRecord: Alumni) => {
    setSelectedAlumni(alumniRecord);
    setShowDetailDialog(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Alumni Directory</h1>
          <p className="text-muted-foreground">
            Manage and connect with {alumni.length} alumni records
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Alumni
          </Button>
        </div>
      </div>

      {/* Filters & View Toggle */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <AlumniFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </div>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grid' | 'list')}>
          <TabsList>
            <TabsTrigger value="grid">
              <Grid className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="list">
              <List className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{filteredAlumni.length}</span> of{' '}
          <span className="font-medium text-foreground">{alumni.length}</span> alumni
        </p>
      </div>

      {/* Alumni Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredAlumni.map((a) => (
            <AlumniCard key={a.id} alumni={a} onClick={() => handleCardClick(a)} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlumni.map((a) => (
            <AlumniCard key={a.id} alumni={a} onClick={() => handleCardClick(a)} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredAlumni.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-4 mb-4">
            <Grid className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold">No alumni found</h3>
          <p className="text-muted-foreground mt-1">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}

      {/* Dialogs */}
      <AddAlumniDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSave={handleAddAlumni}
      />

      <AlumniDetailDialog
        alumni={selectedAlumni}
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        onSave={handleUpdateAlumni}
        onRemove={handleRemoveAlumni}
      />
    </div>
  );
}
