export type AlumniStatus = 'active' | 'inactive' | 'rejoined' | 'pending';
export type AlumniType = 'professor' | 'ta' | 'staff' | 'researcher' | 'administrator';
export type EngagementLevel = 'high' | 'medium' | 'low' | 'none';

export interface Alumni {
  id: string;
  // Personal Information
  firstName: string;
  lastName: string;
  name?: string;
  designation: string;
  manager?: string;
  managerId?: string;
  employeeCode?: string;
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
  hrSpoc?: string;
  hrSpocUserId?: string;
  businessHead?: string;
  businessHeadUserId?: string;
  employeeType?: string;
  location?: string;
  lastWorkingDate?: string;
  endDateOfContract?: string;
  startDateOfContract?: string;
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
  type: AlumniType;
  department: string;
  specialization?: string;
  
  // Employment History
  joinDate: string;
  exitDate: string;
  exitReason?: string;
  yearsOfService: number;
  
  // Current Status
  status: AlumniStatus;
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
  availableForMentoring: boolean;
  availableForHiring: boolean;
  availableForEvents: boolean;
  
  // Notes & Tags
  tags: string[];
  notes?: string;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface EventAttendee {
  alumniId: string;
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
  type: 'reunion' | 'webinar' | 'meetup' | 'workshop' | 'hiring' | 'mentoring' | 'other';
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
  relatedAlumni?: string[];
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
    type: 'alumni' | 'event' | 'segment';
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
  alumniId: string;
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
    types?: AlumniType[];
    statuses?: AlumniStatus[];
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
