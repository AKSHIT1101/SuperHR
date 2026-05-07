// Re-export everything from contact.ts for backward compatibility
export type { 
  ContactStatus as AlumniStatus,
  ContactType as AlumniType,
  EngagementLevel,
  Contact as Alumni,
  EventAttendee,
  Event,
  Task,
  AIInsight,
  User,
  CommunicationLog,
  AudienceSegment,
  MessageTemplate,
  SenderConfig,
  CustomField,
} from './contact';

export { defaultCustomFields } from './contact';
