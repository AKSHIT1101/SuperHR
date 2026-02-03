import { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

export interface AlumniFiltersState {
  searchQuery: string;
  status: string;
  type: string;
  department: string;
  location: string;
  engagement: string;
  availableFor: string[];
}

interface AlumniFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filters: AlumniFiltersState;
  onFiltersChange: (filters: AlumniFiltersState) => void;
}

const departmentOptions = [
  'Computer Science',
  'Mathematics',
  'Physics',
  'Biotechnology',
  'Administration',
  'Electronics',
  'Chemistry',
];

const locationOptions = [
  'Bangalore',
  'Mumbai',
  'Kochi',
  'Delhi',
  'Chennai',
  'Hyderabad',
  'Pune',
  'Kolkata',
  'Palo Alto',
  'San Francisco',
];

export function AlumniFilters({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
}: AlumniFiltersProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const updateFilter = (key: keyof AlumniFiltersState, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleAvailableFor = (value: string) => {
    const current = filters.availableFor || [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    updateFilter('availableFor', updated);
  };

  const clearAllFilters = () => {
    onFiltersChange({
      searchQuery: '',
      status: 'all',
      type: 'all',
      department: 'all',
      location: 'all',
      engagement: 'all',
      availableFor: [],
    });
    onSearchChange('');
  };

  const activeFiltersCount =
    (filters.status !== 'all' ? 1 : 0) +
    (filters.type !== 'all' ? 1 : 0) +
    (filters.department !== 'all' ? 1 : 0) +
    (filters.location !== 'all' ? 1 : 0) +
    (filters.engagement !== 'all' ? 1 : 0) +
    (filters.availableFor?.length || 0);

  const activeFilters: { key: string; label: string; value: string }[] = [];

  if (filters.status && filters.status !== 'all') {
    activeFilters.push({ key: 'status', label: 'Status', value: filters.status });
  }
  if (filters.type && filters.type !== 'all') {
    activeFilters.push({ key: 'type', label: 'Type', value: filters.type });
  }
  if (filters.department && filters.department !== 'all') {
    activeFilters.push({ key: 'department', label: 'Department', value: filters.department });
  }
  if (filters.location && filters.location !== 'all') {
    activeFilters.push({ key: 'location', label: 'Location', value: filters.location });
  }
  if (filters.engagement && filters.engagement !== 'all') {
    activeFilters.push({ key: 'engagement', label: 'Engagement', value: filters.engagement });
  }
  filters.availableFor?.forEach((item) => {
    activeFilters.push({ key: `availableFor-${item}`, label: 'Available for', value: item });
  });

  const removeFilter = (key: string) => {
    if (key.startsWith('availableFor-')) {
      const value = key.replace('availableFor-', '');
      toggleAvailableFor(value);
    } else {
      updateFilter(key as keyof AlumniFiltersState, 'all');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, department..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select
            value={filters.status}
            onValueChange={(v) => updateFilter('status', v)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="rejoined">Rejoined</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.type}
            onValueChange={(v) => updateFilter('type', v)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="professor">Professor</SelectItem>
              <SelectItem value="ta">TA</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="researcher">Researcher</SelectItem>
              <SelectItem value="administrator">Administrator</SelectItem>
            </SelectContent>
          </Select>
          
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="relative">
                <SlidersHorizontal className="h-4 w-4" />
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-xs text-primary-foreground flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Advanced Filters</SheetTitle>
                <SheetDescription>
                  Filter alumni by various criteria
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {/* Department */}
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select
                    value={filters.department}
                    onValueChange={(v) => updateFilter('department', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departmentOptions.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Select
                    value={filters.location}
                    onValueChange={(v) => updateFilter('location', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Locations</SelectItem>
                      {locationOptions.map((loc) => (
                        <SelectItem key={loc} value={loc}>
                          {loc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Engagement Level */}
                <div className="space-y-2">
                  <Label>Engagement Level</Label>
                  <Select
                    value={filters.engagement}
                    onValueChange={(v) => updateFilter('engagement', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select engagement" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Available For */}
                <div className="space-y-3">
                  <Label>Available For</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="mentoring"
                        checked={filters.availableFor?.includes('mentoring')}
                        onCheckedChange={() => toggleAvailableFor('mentoring')}
                      />
                      <label htmlFor="mentoring" className="text-sm">
                        Mentoring
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hiring"
                        checked={filters.availableFor?.includes('hiring')}
                        onCheckedChange={() => toggleAvailableFor('hiring')}
                      />
                      <label htmlFor="hiring" className="text-sm">
                        Hiring
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="events"
                        checked={filters.availableFor?.includes('events')}
                        onCheckedChange={() => toggleAvailableFor('events')}
                      />
                      <label htmlFor="events" className="text-sm">
                        Events
                      </label>
                    </div>
                  </div>
                </div>

                <Separator />

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    clearAllFilters();
                    setSheetOpen(false);
                  }}
                >
                  Clear All Filters
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {activeFilters.map((filter) => (
            <Badge key={filter.key} variant="secondary" className="gap-1">
              {filter.label}: {filter.value}
              <button
                className="ml-1 hover:text-destructive"
                onClick={() => removeFilter(filter.key)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Button
            variant="link"
            size="sm"
            className="text-destructive h-auto p-0"
            onClick={clearAllFilters}
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}
