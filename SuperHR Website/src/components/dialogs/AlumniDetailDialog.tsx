import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Mail, Phone, MapPin, Briefcase, Calendar, Edit2, MessageCircle, 
  Linkedin, Clock, TrendingUp, X, Save, User, Trash2, AlertTriangle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Alumni } from '@/types/alumni';
import { cn } from '@/lib/utils';

interface AlumniDetailDialogProps {
  alumni: Alumni | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (alumni: Alumni) => void;
  onRemove?: (alumniId: string) => void;
}

export function AlumniDetailDialog({ alumni, open, onOpenChange, onSave, onRemove }: AlumniDetailDialogProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editedAlumni, setEditedAlumni] = useState<Alumni | null>(alumni);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (alumni) {
      setEditedAlumni(alumni);
    }
  }, [alumni]);

  if (!alumni) return null;

  const statusStyles = {
    active: 'status-active',
    inactive: 'status-inactive',
    rejoined: 'bg-info/10 text-info border-info/20',
    pending: 'status-pending',
  };

  const engagementStyles = {
    high: 'bg-success text-success-foreground',
    medium: 'bg-warning text-warning-foreground',
    low: 'bg-muted text-muted-foreground',
    none: 'bg-destructive/20 text-destructive',
  };

  const handleSave = () => {
    if (editedAlumni) {
      onSave?.(editedAlumni);
      setIsEditing(false);
      toast({ title: 'Success', description: 'Alumni record updated successfully' });
    }
  };

  const updateField = (field: keyof Alumni, value: any) => {
    if (editedAlumni) {
      setEditedAlumni({ ...editedAlumni, [field]: value });
    }
  };

  const handleSendEmail = () => {
    onOpenChange(false);
    navigate('/communications', { state: { recipient: alumni.email, type: 'email' } });
  };

  const handleSendWhatsApp = () => {
    onOpenChange(false);
    navigate('/communications', { state: { recipient: alumni.whatsapp || alumni.phone, type: 'whatsapp' } });
  };

  const handleRemove = () => {
    if (alumni) {
      onRemove?.(alumni.id);
      setShowDeleteConfirm(false);
    }
  };

  const displayAlumni = isEditing ? editedAlumni! : alumni;
  const initials = `${displayAlumni.firstName[0]}${displayAlumni.lastName[0]}`;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
          <DialogHeader className="flex flex-row items-start justify-between p-6 pb-4 shrink-0">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={displayAlumni.photo} alt={`${displayAlumni.firstName} ${displayAlumni.lastName}`} />
                <AvatarFallback className="text-xl">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-xl">
                  {displayAlumni.firstName} {displayAlumni.lastName}
                </DialogTitle>
                <p className="text-muted-foreground">
                  {displayAlumni.designation} • {displayAlumni.department}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className={statusStyles[displayAlumni.status]}>
                    {displayAlumni.status}
                  </Badge>
                  <Badge className={cn('capitalize', engagementStyles[displayAlumni.engagementLevel])}>
                    {displayAlumni.engagementLevel} engagement
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-destructive"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove
              </Button>
              <Button
                variant={isEditing ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  if (isEditing) {
                    handleSave();
                  } else {
                    setEditedAlumni(alumni);
                    setIsEditing(true);
                  }
                }}
              >
                {isEditing ? <><Save className="h-4 w-4 mr-2" /> Save</> : <><Edit2 className="h-4 w-4 mr-2" /> Edit</>}
              </Button>
            </div>
          </DialogHeader>

          {/* Quick Actions */}
          <div className="flex gap-2 px-6 py-4 border-b shrink-0">
            <Button size="sm" variant="outline" onClick={handleSendEmail}>
              <Mail className="h-4 w-4 mr-2" />
              Send Email
            </Button>
            <Button size="sm" variant="outline" onClick={handleSendWhatsApp}>
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
            <Button size="sm" variant="outline">
              <Phone className="h-4 w-4 mr-2" />
              Call
            </Button>
            {displayAlumni.linkedIn && (
              <Button size="sm" variant="outline" asChild>
                <a href={`https://${displayAlumni.linkedIn}`} target="_blank" rel="noopener noreferrer">
                  <Linkedin className="h-4 w-4 mr-2" />
                  LinkedIn
                </a>
              </Button>
            )}
          </div>

          <ScrollArea className="flex-1">
            <Tabs defaultValue="personal" className="p-6">
              <TabsList className="mb-4">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="employment">Employment</TabsTrigger>
                <TabsTrigger value="contact">Contact</TabsTrigger>
                <TabsTrigger value="engagement">Engagement</TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    {isEditing ? (
                      <Input
                        value={editedAlumni?.firstName}
                        onChange={(e) => updateField('firstName', e.target.value)}
                      />
                    ) : (
                      <p className="text-sm p-2 bg-muted/50 rounded">{displayAlumni.firstName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    {isEditing ? (
                      <Input
                        value={editedAlumni?.lastName}
                        onChange={(e) => updateField('lastName', e.target.value)}
                      />
                    ) : (
                      <p className="text-sm p-2 bg-muted/50 rounded">{displayAlumni.lastName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    {isEditing ? (
                      <Select value={editedAlumni?.gender || ''} onValueChange={(v) => updateField('gender', v)}>
                        <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm p-2 bg-muted/50 rounded capitalize">{displayAlumni.gender || '-'}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Date of Birth</Label>
                    {isEditing ? (
                      <Input type="date" value={editedAlumni?.dateOfBirth || ''} onChange={(e) => updateField('dateOfBirth', e.target.value)} />
                    ) : (
                      <p className="text-sm p-2 bg-muted/50 rounded">{displayAlumni.dateOfBirth || '-'}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Employee Code</Label>
                    {isEditing ? (
                      <Input value={editedAlumni?.employeeCode || ''} onChange={(e) => updateField('employeeCode', e.target.value)} />
                    ) : (
                      <p className="text-sm p-2 bg-muted/50 rounded">{displayAlumni.employeeCode || '-'}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Rating</Label>
                    {isEditing ? (
                      <Input value={editedAlumni?.rating || ''} onChange={(e) => updateField('rating', e.target.value)} />
                    ) : (
                      <p className="text-sm p-2 bg-muted/50 rounded">{displayAlumni.rating || '-'}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Correspondence Address</Label>
                  {isEditing ? (
                    <Textarea value={editedAlumni?.correspondenceAddress || ''} onChange={(e) => updateField('correspondenceAddress', e.target.value)} rows={2} />
                  ) : (
                    <p className="text-sm p-2 bg-muted/50 rounded">{displayAlumni.correspondenceAddress || '-'}</p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>City</Label>
                    {isEditing ? (
                      <Input value={editedAlumni?.city || ''} onChange={(e) => updateField('city', e.target.value)} />
                    ) : (
                      <p className="text-sm p-2 bg-muted/50 rounded">{displayAlumni.city || '-'}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    {isEditing ? (
                      <Input value={editedAlumni?.state || ''} onChange={(e) => updateField('state', e.target.value)} />
                    ) : (
                      <p className="text-sm p-2 bg-muted/50 rounded">{displayAlumni.state || '-'}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Country</Label>
                    {isEditing ? (
                      <Input value={editedAlumni?.country || ''} onChange={(e) => updateField('country', e.target.value)} />
                    ) : (
                      <p className="text-sm p-2 bg-muted/50 rounded">{displayAlumni.country || displayAlumni.currentCountry || '-'}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Pin Code</Label>
                    {isEditing ? (
                      <Input value={editedAlumni?.pinCode || ''} onChange={(e) => updateField('pinCode', e.target.value)} />
                    ) : (
                      <p className="text-sm p-2 bg-muted/50 rounded">{displayAlumni.pinCode || '-'}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Town</Label>
                    {isEditing ? (
                      <Input value={editedAlumni?.town || ''} onChange={(e) => updateField('town', e.target.value)} />
                    ) : (
                      <p className="text-sm p-2 bg-muted/50 rounded">{displayAlumni.town || '-'}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Permanent Address</Label>
                  {isEditing ? (
                    <Textarea value={editedAlumni?.permanentAddress || ''} onChange={(e) => updateField('permanentAddress', e.target.value)} rows={2} />
                  ) : (
                    <p className="text-sm p-2 bg-muted/50 rounded">{displayAlumni.permanentAddress || '-'}</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="employment" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Designation</Label>
                    {isEditing ? (
                      <Input value={editedAlumni?.designation || ''} onChange={(e) => updateField('designation', e.target.value)} />
                    ) : (
                      <p className="text-sm p-2 bg-muted/50 rounded">{displayAlumni.designation}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Department</Label>
                    {isEditing ? (
                      <Input value={editedAlumni?.department || ''} onChange={(e) => updateField('department', e.target.value)} />
                    ) : (
                      <p className="text-sm p-2 bg-muted/50 rounded">{displayAlumni.department}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Sub Department</Label>
                    {isEditing ? (
                      <Input value={editedAlumni?.subDepartment || ''} onChange={(e) => updateField('subDepartment', e.target.value)} />
                    ) : (
                      <p className="text-sm p-2 bg-muted/50 rounded">{displayAlumni.subDepartment || '-'}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Employee Type</Label>
                    {isEditing ? (
                      <Select value={editedAlumni?.type || ''} onValueChange={(v) => updateField('type', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professor">Professor</SelectItem>
                          <SelectItem value="ta">Teaching Assistant</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="researcher">Researcher</SelectItem>
                          <SelectItem value="administrator">Administrator</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm p-2 bg-muted/50 rounded capitalize">{displayAlumni.type}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Manager</Label>
                    {isEditing ? (
                      <Input value={editedAlumni?.manager || ''} onChange={(e) => updateField('manager', e.target.value)} />
                    ) : (
                      <p className="text-sm p-2 bg-muted/50 rounded">{displayAlumni.manager || '-'}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Manager ID</Label>
                    {isEditing ? (
                      <Input value={editedAlumni?.managerId || ''} onChange={(e) => updateField('managerId', e.target.value)} />
                    ) : (
                      <p className="text-sm p-2 bg-muted/50 rounded">{displayAlumni.managerId || '-'}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>HR SPOC</Label>
                    {isEditing ? (
                      <Input value={editedAlumni?.hrSpoc || ''} onChange={(e) => updateField('hrSpoc', e.target.value)} />
                    ) : (
                      <p className="text-sm p-2 bg-muted/50 rounded">{displayAlumni.hrSpoc || '-'}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>HR SPOC User ID</Label>
                    {isEditing ? (
                      <Input value={editedAlumni?.hrSpocUserId || ''} onChange={(e) => updateField('hrSpocUserId', e.target.value)} />
                    ) : (
                      <p className="text-sm p-2 bg-muted/50 rounded">{displayAlumni.hrSpocUserId || '-'}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Business Head</Label>
                    {isEditing ? (
                      <Input value={editedAlumni?.businessHead || ''} onChange={(e) => updateField('businessHead', e.target.value)} />
                    ) : (
                      <p className="text-sm p-2 bg-muted/50 rounded">{displayAlumni.businessHead || '-'}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Business Head User ID</Label>
                    {isEditing ? (
                      <Input value={editedAlumni?.businessHeadUserId || ''} onChange={(e) => updateField('businessHeadUserId', e.target.value)} />
                    ) : (
                      <p className="text-sm p-2 bg-muted/50 rounded">{displayAlumni.businessHeadUserId || '-'}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Entity</Label>
                    {isEditing ? (
                      <Input value={editedAlumni?.entity || ''} onChange={(e) => updateField('entity', e.target.value)} />
                    ) : (
                      <p className="text-sm p-2 bg-muted/50 rounded">{displayAlumni.entity || '-'}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Classification</Label>
                    {isEditing ? (
                      <Input value={editedAlumni?.classification || ''} onChange={(e) => updateField('classification', e.target.value)} />
                    ) : (
                      <p className="text-sm p-2 bg-muted/50 rounded">{displayAlumni.classification || '-'}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    {isEditing ? (
                      <Input value={editedAlumni?.location || ''} onChange={(e) => updateField('location', e.target.value)} />
                    ) : (
                      <p className="text-sm p-2 bg-muted/50 rounded">{displayAlumni.location || '-'}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Employment Status</Label>
                    {isEditing ? (
                      <Select value={editedAlumni?.status || ''} onValueChange={(v) => updateField('status', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="rejoined">Rejoined</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm p-2 bg-muted/50 rounded capitalize">{displayAlumni.status}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date of Joining</Label>
                    {isEditing ? (
                      <Input type="date" value={editedAlumni?.dateOfJoining || editedAlumni?.joinDate || ''} onChange={(e) => updateField('dateOfJoining', e.target.value)} />
                    ) : (
                      <p className="text-sm p-2 bg-muted/50 rounded">{displayAlumni.dateOfJoining || displayAlumni.joinDate || '-'}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Last Working Date</Label>
                    {isEditing ? (
                      <Input type="date" value={editedAlumni?.lastWorkingDate || editedAlumni?.exitDate || ''} onChange={(e) => updateField('lastWorkingDate', e.target.value)} />
                    ) : (
                      <p className="text-sm p-2 bg-muted/50 rounded">{displayAlumni.lastWorkingDate || displayAlumni.exitDate || '-'}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Start Date of Contract</Label>
                    {isEditing ? (
                      <Input type="date" value={editedAlumni?.startDateOfContract || ''} onChange={(e) => updateField('startDateOfContract', e.target.value)} />
                    ) : (
                      <p className="text-sm p-2 bg-muted/50 rounded">{displayAlumni.startDateOfContract || '-'}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>End Date of Contract</Label>
                    {isEditing ? (
                      <Input type="date" value={editedAlumni?.endDateOfContract || ''} onChange={(e) => updateField('endDateOfContract', e.target.value)} />
                    ) : (
                      <p className="text-sm p-2 bg-muted/50 rounded">{displayAlumni.endDateOfContract || '-'}</p>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="contact" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Personal Email ID</Label>
                    {isEditing ? (
                      <Input type="email" value={editedAlumni?.personalEmailId || editedAlumni?.email || ''} onChange={(e) => updateField('personalEmailId', e.target.value)} />
                    ) : (
                      <p className="text-sm p-2 bg-muted/50 rounded">{displayAlumni.personalEmailId || displayAlumni.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Personal Mobile No</Label>
                    {isEditing ? (
                      <Input value={editedAlumni?.personalMobileNo || editedAlumni?.phone || ''} onChange={(e) => updateField('personalMobileNo', e.target.value)} />
                    ) : (
                      <p className="text-sm p-2 bg-muted/50 rounded">{displayAlumni.personalMobileNo || displayAlumni.phone}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Official Mobile No</Label>
                    {isEditing ? (
                      <Input value={editedAlumni?.officialMobileNo || ''} onChange={(e) => updateField('officialMobileNo', e.target.value)} />
                    ) : (
                      <p className="text-sm p-2 bg-muted/50 rounded">{displayAlumni.officialMobileNo || '-'}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp</Label>
                    {isEditing ? (
                      <Input value={editedAlumni?.whatsapp || ''} onChange={(e) => updateField('whatsapp', e.target.value)} />
                    ) : (
                      <p className="text-sm p-2 bg-muted/50 rounded">{displayAlumni.whatsapp || '-'}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Landline No</Label>
                    {isEditing ? (
                      <Input value={editedAlumni?.landlineNo || ''} onChange={(e) => updateField('landlineNo', e.target.value)} />
                    ) : (
                      <p className="text-sm p-2 bg-muted/50 rounded">{displayAlumni.landlineNo || '-'}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>LinkedIn</Label>
                    {isEditing ? (
                      <Input value={editedAlumni?.linkedIn || ''} onChange={(e) => updateField('linkedIn', e.target.value)} />
                    ) : (
                      <p className="text-sm p-2 bg-muted/50 rounded">{displayAlumni.linkedIn || '-'}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Preferred Contact Method</Label>
                  {isEditing ? (
                    <Select value={editedAlumni?.preferredContactMethod} onValueChange={(v) => updateField('preferredContactMethod', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className="capitalize">{displayAlumni.preferredContactMethod}</Badge>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="engagement" className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-2xl font-bold">{displayAlumni.totalEventsAttended}</p>
                    <p className="text-xs text-muted-foreground">Events Attended</p>
                  </div>
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-2xl font-bold">{displayAlumni.totalEmailsOpened}</p>
                    <p className="text-xs text-muted-foreground">Emails Opened</p>
                  </div>
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-2xl font-bold">{displayAlumni.responseRate}%</p>
                    <p className="text-xs text-muted-foreground">Response Rate</p>
                  </div>
                  <div className="rounded-lg border p-4 text-center">
                    <p className="text-2xl font-bold">{displayAlumni.yearsOfService}</p>
                    <p className="text-xs text-muted-foreground">Years of Service</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <Label>Response Rate</Label>
                      <span className="text-sm font-medium">{displayAlumni.responseRate}%</span>
                    </div>
                    <Progress value={displayAlumni.responseRate} />
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <h4 className="font-medium mb-3">Availability</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <Switch
                          checked={editedAlumni?.availableForMentoring}
                          onCheckedChange={(v) => updateField('availableForMentoring', v)}
                        />
                      ) : (
                        <div className={cn('h-2 w-2 rounded-full', displayAlumni.availableForMentoring ? 'bg-success' : 'bg-muted')} />
                      )}
                      <span className="text-sm">Mentoring</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <Switch
                          checked={editedAlumni?.availableForHiring}
                          onCheckedChange={(v) => updateField('availableForHiring', v)}
                        />
                      ) : (
                        <div className={cn('h-2 w-2 rounded-full', displayAlumni.availableForHiring ? 'bg-success' : 'bg-muted')} />
                      )}
                      <span className="text-sm">Hiring</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <Switch
                          checked={editedAlumni?.availableForEvents}
                          onCheckedChange={(v) => updateField('availableForEvents', v)}
                        />
                      ) : (
                        <div className={cn('h-2 w-2 rounded-full', displayAlumni.availableForEvents ? 'bg-success' : 'bg-muted')} />
                      )}
                      <span className="text-sm">Events</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  {isEditing ? (
                    <Textarea value={editedAlumni?.notes || ''} onChange={(e) => updateField('notes', e.target.value)} rows={3} />
                  ) : (
                    <p className="text-sm p-2 bg-muted/50 rounded">{displayAlumni.notes || 'No notes'}</p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Remove Alumni Record
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {alumni.firstName} {alumni.lastName} from the directory?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
