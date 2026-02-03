import { useState, useMemo } from 'react';
import { Search, X, Users, Filter, Sparkles, CheckSquare, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AudienceSegment, Alumni } from '@/types/alumni';
import { mockAlumni } from '@/data/mockData';
import { cn } from '@/lib/utils';

const locationOptions = ['Bangalore', 'Mumbai', 'Kochi', 'Delhi', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata', 'Palo Alto'];
const departmentOptions = ['Computer Science', 'Mathematics', 'Physics', 'Biotechnology', 'Administration', 'Electronics'];
const typeOptions = [
  { value: 'professor', label: 'Professor' },
  { value: 'ta', label: 'Teaching Assistant' },
  { value: 'staff', label: 'Staff' },
  { value: 'researcher', label: 'Researcher' },
];

interface PersonSelectorProps {
  selectedSegments: string[];
  selectedIndividuals: string[];
  onSegmentsChange: (segments: string[]) => void;
  onIndividualsChange: (individuals: string[]) => void;
  audienceSegments: AudienceSegment[];
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
  aiRecommendations = [],
  aiContext,
  onApplyAIRecommendations,
  filterByPhone = false,
  className,
}: PersonSelectorProps) {
  const [activeTab, setActiveTab] = useState<'segments' | 'individuals' | 'ai'>('segments');
  
  // Segment search
  const [segmentSearch, setSegmentSearch] = useState('');
  
  // Individual filters
  const [alumniSearch, setAlumniSearch] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterEngagement, setFilterEngagement] = useState('all');
  const [showFilters, setShowFilters] = useState(true);

  const filteredSegments = useMemo(() => {
    if (!segmentSearch) return audienceSegments;
    return audienceSegments.filter((s) =>
      s.name.toLowerCase().includes(segmentSearch.toLowerCase())
    );
  }, [segmentSearch, audienceSegments]);

  const filteredAlumni = useMemo(() => {
    return mockAlumni.filter((alumni) => {
      const matchesSearch = alumniSearch === '' ||
        `${alumni.firstName} ${alumni.lastName} ${alumni.email} ${alumni.phone || ''}`.toLowerCase().includes(alumniSearch.toLowerCase());
      const matchesLocation = filterLocation === 'all' ||
        alumni.currentCity?.toLowerCase().includes(filterLocation.toLowerCase());
      const matchesDepartment = filterDepartment === 'all' || alumni.department === filterDepartment;
      const matchesType = filterType === 'all' || alumni.type === filterType;
      const matchesEngagement = filterEngagement === 'all' || alumni.engagementLevel === filterEngagement;
      
      if (filterByPhone && !alumni.whatsapp && !alumni.phone) return false;
      
      return matchesSearch && matchesLocation && matchesDepartment && matchesType && matchesEngagement;
    });
  }, [alumniSearch, filterLocation, filterDepartment, filterType, filterEngagement, filterByPhone]);

  const aiRecommendedAlumni = useMemo(() => {
    if (aiRecommendations.length === 0) {
      return mockAlumni.filter(a => a.engagementLevel === 'high' || a.engagementLevel === 'medium');
    }
    return mockAlumni.filter((a) => aiRecommendations.includes(a.id));
  }, [aiRecommendations]);

  const toggleSegment = (segmentId: string) => {
    const newSegments = selectedSegments.includes(segmentId)
      ? selectedSegments.filter((id) => id !== segmentId)
      : [...selectedSegments, segmentId];
    onSegmentsChange(newSegments);
  };

  const toggleIndividual = (alumniId: string) => {
    const newIndividuals = selectedIndividuals.includes(alumniId)
      ? selectedIndividuals.filter((id) => id !== alumniId)
      : [...selectedIndividuals, alumniId];
    onIndividualsChange(newIndividuals);
  };

  const selectAllFiltered = () => {
    const ids = filteredAlumni.map((a) => a.id);
    onIndividualsChange([...new Set([...selectedIndividuals, ...ids])]);
  };

  const deselectAllFiltered = () => {
    const ids = filteredAlumni.map((a) => a.id);
    onIndividualsChange(selectedIndividuals.filter((id) => !ids.includes(id)));
  };

  const clearFilters = () => {
    setAlumniSearch('');
    setFilterLocation('all');
    setFilterDepartment('all');
    setFilterType('all');
    setFilterEngagement('all');
  };

  const addHighEngagement = () => {
    const ids = mockAlumni.filter(a => a.engagementLevel === 'high').map(a => a.id);
    onIndividualsChange([...new Set([...selectedIndividuals, ...ids])]);
  };

  const addMediumEngagement = () => {
    const ids = mockAlumni.filter(a => a.engagementLevel === 'medium').map(a => a.id);
    onIndividualsChange([...new Set([...selectedIndividuals, ...ids])]);
  };

  const addRecentlyActive = () => {
    const ids = mockAlumni.filter(a => a.status === 'active').map(a => a.id);
    onIndividualsChange([...new Set([...selectedIndividuals, ...ids])]);
  };

  const activeFiltersCount = [filterLocation, filterDepartment, filterType, filterEngagement].filter((f) => f !== 'all').length;

  const renderAlumniRow = (alumni: Alumni, showEngagement = false) => (
    <div
      key={alumni.id}
      className={cn(
        'flex items-center gap-3 p-2.5 rounded-md cursor-pointer hover:bg-accent transition-colors border-b border-border/50 last:border-0',
        selectedIndividuals.includes(alumni.id) && 'bg-primary/10'
      )}
      onClick={() => toggleIndividual(alumni.id)}
    >
      <Checkbox checked={selectedIndividuals.includes(alumni.id)} className="shrink-0" />
      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-medium">
        {alumni.firstName[0]}{alumni.lastName[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{alumni.firstName} {alumni.lastName}</p>
        <p className="text-xs text-muted-foreground truncate">
          {filterByPhone ? (alumni.whatsapp || alumni.phone || 'No phone') : alumni.email}
        </p>
      </div>
      {showEngagement ? (
        <Badge variant="secondary" className="text-xs capitalize shrink-0">{alumni.engagementLevel}</Badge>
      ) : (
        <Badge variant="outline" className="text-xs capitalize shrink-0">{alumni.type}</Badge>
      )}
    </div>
  );

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex flex-col h-full">
        <TabsList className="shrink-0 mb-3 w-full justify-start">
          <TabsTrigger value="segments" className="gap-1.5 text-xs px-3">
            <Users className="h-3.5 w-3.5" />
            Segments
            {selectedSegments.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">{selectedSegments.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="individuals" className="gap-1.5 text-xs px-3">
            <Filter className="h-3.5 w-3.5" />
            Individuals
            {selectedIndividuals.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-xs">{selectedIndividuals.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-1.5 text-xs px-3">
            <Sparkles className="h-3.5 w-3.5" />
            AI Suggestions
          </TabsTrigger>
        </TabsList>

        {/* Segments Tab */}
        <div className={cn("flex-1 flex flex-col min-h-0", activeTab !== 'segments' && 'hidden')}>
          <div className="mb-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search segments..."
                value={segmentSearch}
                onChange={(e) => setSegmentSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
          </div>

          <ScrollArea className="flex-1 border rounded-md">
            <div className="p-1">
              {filteredSegments.length > 0 ? (
                filteredSegments.map((segment) => (
                  <div
                    key={segment.id}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-md cursor-pointer hover:bg-accent transition-colors border-b border-border/50 last:border-0',
                      selectedSegments.includes(segment.id) && 'bg-primary/10'
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
                    <Badge variant="secondary" className="text-xs">{segment.memberCount}</Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-6 w-6 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No segments found</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Individuals Tab - Two Column Layout */}
        <div className={cn("flex-1 flex min-h-0 gap-3", activeTab !== 'individuals' && 'hidden')}>
          {/* Filters Panel */}
          <div className={cn(
            "shrink-0 flex flex-col border rounded-md bg-muted/30 transition-all overflow-hidden",
            showFilters ? "w-48" : "w-10"
          )}>
            <Button
              variant="ghost"
              size="sm"
              className="h-9 shrink-0 rounded-none border-b justify-between px-2"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters && <span className="text-xs font-medium">Filters</span>}
              <ChevronRight className={cn("h-4 w-4 transition-transform", showFilters && "rotate-180")} />
            </Button>
            
            {showFilters && (
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Location</label>
                    <Select value={filterLocation} onValueChange={setFilterLocation}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Locations</SelectItem>
                        {locationOptions.map((loc) => (
                          <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Department</label>
                    <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Depts</SelectItem>
                        {departmentOptions.map((dept) => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Type</label>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        {typeOptions.map((type) => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Engagement</label>
                    <Select value={filterEngagement} onValueChange={setFilterEngagement}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Levels</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {activeFiltersCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full h-7 text-xs">
                      <X className="h-3 w-3 mr-1" />
                      Clear ({activeFiltersCount})
                    </Button>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center gap-2 mb-2 shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={alumniSearch}
                  onChange={(e) => setAlumniSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
              <Button variant="outline" size="sm" onClick={selectAllFiltered} className="h-8 text-xs shrink-0">
                <CheckSquare className="h-3.5 w-3.5 mr-1" />
                All ({filteredAlumni.length})
              </Button>
              <Button variant="ghost" size="sm" onClick={deselectAllFiltered} className="h-8 text-xs shrink-0">
                Clear
              </Button>
            </div>

            <ScrollArea className="flex-1 border rounded-md">
              <div className="p-1">
                {filteredAlumni.length > 0 ? (
                  filteredAlumni.map((alumni) => renderAlumniRow(alumni))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-6 w-6 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No alumni match your filters</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* AI Tab */}
        <div className={cn("flex-1 flex flex-col min-h-0", activeTab !== 'ai' && 'hidden')}>
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-md p-3 mb-3 shrink-0">
            <div className="flex items-start gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="font-medium text-sm">AI-Powered Suggestions</h3>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {aiContext || 'Recommendations based on engagement patterns and activity.'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-3 shrink-0">
            <Button 
              variant="outline" 
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={onApplyAIRecommendations || addHighEngagement}
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {onApplyAIRecommendations ? `Apply all (${aiRecommendations.length})` : `High engagement (${mockAlumni.filter(a => a.engagementLevel === 'high').length})`}
            </Button>
            {!onApplyAIRecommendations && (
              <>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={addMediumEngagement}
                >
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Medium ({mockAlumni.filter(a => a.engagementLevel === 'medium').length})
                </Button>
                <Button 
                  variant="outline"
                  size="sm" 
                  className="h-8 text-xs gap-1.5"
                  onClick={addRecentlyActive}
                >
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Active ({mockAlumni.filter(a => a.status === 'active').length})
                </Button>
              </>
            )}
          </div>

          <p className="text-xs text-muted-foreground mb-2 shrink-0">Suggested alumni:</p>
          <ScrollArea className="flex-1 border rounded-md">
            <div className="p-1">
              {aiRecommendedAlumni.map((alumni) => renderAlumniRow(alumni, true))}
            </div>
          </ScrollArea>
        </div>
      </Tabs>
    </div>
  );
}
