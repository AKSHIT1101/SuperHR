# ConnectAI Backend – Databases & API Endpoints

## Overview

This document describes the **database entities** and **API endpoints** used by the ConnectAI backend.

The backend powers the CRM platform by handling authentication, contact management, segmentation, events, communications, reminders, and analytics. It exposes REST APIs that the frontend uses to interact with the system.

External contacts (customers, leads, alumni, etc.) do not access the platform directly. All engagement actions are performed by internal users.

---

# Databases

The backend maintains several core data collections used to support CRM and engagement workflows.

## Users
Stores internal users who can access the system, such as administrators and team members.

## Contacts
Stores all external individuals managed within the CRM, including customers, leads, alumni, or community members.

Contacts can be created manually or imported in bulk.

## Audience Segments
Stores reusable groups of contacts used for targeted communication and event invitations.

Segments allow users to organize contacts based on specific attributes or filters.

## Messages / Emails Sent
Stores records of communications sent through the platform including both email and WhatsApp messages.

This data is also used for analytics and engagement tracking.

## Templates
Stores reusable message templates used for communication.

Templates help standardize outreach and simplify message creation.

## Events
Stores events created within the platform such as meetups, webinars, networking sessions, or community activities.

## Reminders
Stores reminders and follow-up tasks created by users to manage engagement activities.

## Communication Configuration
Stores configuration settings related to messaging services such as email senders and WhatsApp numbers.

---

# API Endpoints

Below are the main REST endpoints provided by the backend.

---

## Authentication

POST /login

Authenticates a user and returns a session or authentication token.

---

## Dashboard

GET /dashboard

Returns dashboard data including user information and summary metrics used by the frontend dashboard.

---

## Contacts

POST /create-contact  
Creates a new contact.

PUT /update-contact  
Updates an existing contact.

DELETE /delete-contact  
Deletes a contact.

GET /contacts  
Returns a list of contacts.

POST /import-contacts  
Allows bulk import of contacts.

GET /export-contacts  
Exports contacts from the system.

---

## Audience Segments

POST /create-segment  
Creates a new audience segment.

PUT /update-segment  
Updates an existing segment.

DELETE /delete-segment  
Deletes a segment.

GET /segments  
Returns all segments.

---

## Events

POST /events  
Creates a new event.

PUT /events  
Updates an existing event.

DELETE /events  
Deletes an event.

GET /events  
Returns events created in the system.

POST /events/complete  
Marks an event as completed.

---

## Templates

POST /templates  
Creates a new communication template.

PUT /templates  
Updates a template.

DELETE /templates  
Deletes a template.

GET /templates  
Returns all templates.

Templates can be used for both email and WhatsApp messages.

---

## Communications

POST /send-email  
Sends an email to contacts or segments.

POST /send-whatsapp  
Sends a WhatsApp message to contacts or segments.

---

## Analytics

GET /analytics  
Returns engagement analytics related to communications and events.

GET /analytics/export  
Exports analytics data for reporting.

---

## Reminders

POST /reminders  
Creates a reminder.

PUT /reminders  
Updates a reminder.

DELETE /reminders  
Deletes a reminder.

GET /reminders  
Returns reminders created by users.

POST /reminders/complete  
Marks a reminder as completed.

---

# System Modules

The backend is organized into the following modules:

Authentication Module  
Contact Management Module  
Audience Segmentation Module  
Communication Module  
Event Management Module  
Template Management Module  
Analytics Module  
Reminder Management Module  

Each module exposes API endpoints used by the frontend platform.

---

# System Flow

1. Users interact with the frontend application.
2. The frontend sends requests to backend API endpoints.
3. The backend processes requests and interacts with the database.
4. Communication services handle email or WhatsApp delivery.
5. Engagement data is recorded and used for analytics.

---

# Additional Endpoints

Additional endpoints include:

- AI-powered audience segmentation
- Automated communication scheduling
- Advanced engagement analytics
- Integration with external CRM systems
- Event registration systems for external users