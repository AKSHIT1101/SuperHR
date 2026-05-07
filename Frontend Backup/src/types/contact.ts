export type ContactStatus = 'active' | 'inactive' | 'lead' | 'pending';
export type ContactType = 'customer' | 'lead' | 'employee' | 'partner' | 'vendor' | 'other';
export type EngagementLevel = 'high' | 'medium' | 'low' | 'none';

export interface CustomField {
  id: string;
  name: string;
  key: string;
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'email' | 'phone' | 'url' | 'textarea' | 'boolean';
  required: boolean;
  options?: string[]; // For select/multiselect
  section: string;
  order: number;
  placeholder?: string;
  description?: string;
}

export interface Contact {
  id: string;
  // Core Information
  firstName: string;
  lastName: string;
  name?: string;
  designation: string;
  manager?: string;
  managerId?: string;
  contactCode?: string;
  gender?: string;
  dateOfBirth?: string;
  personalMobileNo?: string;
  personalEmailId?: string;
  landlineNo?: string;
  correspondenceAddress?: string;
  city?: string;
  town?: string;
  state?: string;
  country?: string;
  pinCode?: string;
  permanentAddress?: string;
  officialMobileNo?: string;
  dateOfJoining?: string;
  employmentStatus?: string;
  spoc?: string;
  spocUserId?: string;
  businessHead?: string;
  businessHeadUserId?: string;
  contactCategory?: string;
  location?: string;
  endDate?: string;
  startDate?: string;
  rating?: string;
  entity?: string;
  classification?: string;
  subDepartment?: string;
  
  email: string;
  phone: string;
  whatsapp?: string;
  linkedIn?: string;
  photo?: string;
  
  // Professional Details
  type: ContactType;
  department: string;
  specialization?: string;
  
  // History
  joinDate: string;
  exitDate: string;
  exitReason?: string;
  tenure: number;
  
  // Current Status
  status: ContactStatus;
  currentOrganization?: string;
  currentDesignation?: string;
  currentCity?: string;
  currentCountry?: string;
  
  // Engagement
  engagementLevel: EngagementLevel;
  lastContactDate?: string;
  totalEventsAttended: number;
  totalEmailsOpened: number;
  responseRate: number;
  
  // Preferences
  preferredContactMethod: 'email' | 'whatsapp' | 'phone';
  interests: string[];
  availableForConsulting: boolean;
  availableForReferrals: boolean;
  availableForEvents: boolean;
  
  // Notes & Tags
  tags: string[];
  notes?: string;
  
  // Custom fields
  customFields?: Record<string, any>;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface EventAttendee {
  contactId: string;
  name: string;
  email: string;
  inviteSent: boolean;
  inviteSentDate?: string;
  confirmed: boolean;
  attended: boolean;
  addedLater?: boolean;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  type: 'conference' | 'webinar' | 'meetup' | 'workshop' | 'networking' | 'training' | 'other';
  date: string;
  time: string;
  location: string;
  isVirtual: boolean;
  capacity?: number;
  
  // Outreach
  targetAudience: string[];
  recommendedContacts: string[];
  attendees?: EventAttendee[];
  invitedCount: number;
  confirmedCount: number;
  attendedCount: number;
  
  // Status
  status: 'draft' | 'scheduled' | 'ongoing' | 'completed' | 'cancelled' | 'archived';
  
  // Metrics
  emailsSent: number;
  emailsOpened: number;
  emailsClicked: number;
  whatsappSent: number;
  whatsappRead: number;
  
  createdAt: string;
  createdBy: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  type: 'follow-up' | 'outreach' | 'reminder' | 'event' | 'update';
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in-progress' | 'completed' | 'dismissed';
  dueDate: string;
  assignedTo: string;
  assignedById?: string;
  relatedContacts?: string[];
  relatedEvent?: string;
  isAIGenerated: boolean;
  createdAt: string;
}

export interface AIInsight {
  id: string;
  type: 'engagement' | 'opportunity' | 'warning' | 'suggestion';
  title: string;
  description: string;
  actionLabel?: string;
  actionType?: 'navigate' | 'create-campaign' | 'create-event';
  priority: 'high' | 'medium' | 'low';
  relatedData?: {
    type: 'contact' | 'event' | 'segment';
    ids: string[];
  };
  createdAt: string;
  dismissed: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'user';
  department?: string;
  avatar?: string;
  permissions: string[];
  lastActive: string;
}

export interface CommunicationLog {
  id: string;
  contactId: string;
  type: 'email' | 'whatsapp' | 'phone' | 'in-person';
  direction: 'outbound' | 'inbound';
  subject?: string;
  content: string;
  status: 'sent' | 'delivered' | 'read' | 'replied' | 'failed';
  sentAt: string;
  sentBy: string;
  eventId?: string;
}

export interface AudienceSegment {
  id: string;
  name: string;
  description?: string;
  filters: {
    locations?: string[];
    departments?: string[];
    types?: ContactType[];
    statuses?: ContactStatus[];
    engagementLevels?: EngagementLevel[];
    tags?: string[];
    customQuery?: string;
  };
  memberIds: string[];
  memberCount: number;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  type: 'email' | 'whatsapp';
  subject?: string;
  content: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
}

export interface SenderConfig {
  id: string;
  type: 'email' | 'whatsapp';
  name: string;
  address: string;
  isDefault: boolean;
}

// Default custom fields that come with the system
export const defaultCustomFields: CustomField[] = [
  { id: '1', name: 'First Name', key: 'firstName', type: 'text', required: true, section: 'Basic Info', order: 1 },
  { id: '2', name: 'Last Name', key: 'lastName', type: 'text', required: true, section: 'Basic Info', order: 2 },
  { id: '3', name: 'Email', key: 'email', type: 'email', required: true, section: 'Basic Info', order: 3 },
  { id: '4', name: 'Phone', key: 'phone', type: 'phone', required: false, section: 'Basic Info', order: 4 },
  { id: '5', name: 'WhatsApp', key: 'whatsapp', type: 'phone', required: false, section: 'Basic Info', order: 5 },
  { id: '6', name: 'Designation', key: 'designation', type: 'text', required: false, section: 'Professional', order: 6 },
  { id: '7', name: 'Department', key: 'department', type: 'text', required: false, section: 'Professional', order: 7 },
  { id: '8', name: 'Organization', key: 'currentOrganization', type: 'text', required: false, section: 'Professional', order: 8 },
  { id: '9', name: 'City', key: 'currentCity', type: 'text', required: false, section: 'Location', order: 9 },
  { id: '10', name: 'Country', key: 'currentCountry', type: 'text', required: false, section: 'Location', order: 10 },
  { id: '11', name: 'LinkedIn', key: 'linkedIn', type: 'url', required: false, section: 'Social', order: 11 },
  { id: '12', name: 'Tags', key: 'tags', type: 'multiselect', required: false, section: 'Meta', order: 12 },
  { id: '13', name: 'Notes', key: 'notes', type: 'textarea', required: false, section: 'Meta', order: 13 },
];
