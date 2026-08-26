DigiScript Product Requirements Document (PRD)
**Version:** 1.0  
**Date:** August 23, 2026  
**Target Release:** MVP (20 weeks)  
**Product Manager:** Pule Meshark Phafane
---
1. Product Overview
DigiScript is an intelligent document management platform with embedded AI that enables organizations (starting with primary schools) to ingest documents from multiple channels, organize them intelligently, and provide AI-powered access through chat, search, and escalation workflows.
Product Tagline
*"Turn your documents into your smartest employee"*
---
2. User Personas & Roles
2.1 School Principal (Super Admin)
**Goals:**
Centralize all school documents and records
Ensure POPIA compliance
Reduce administrative burden
Improve parent communication
**Pain Points:**
Manual filing and retrieval
Lost or misfiled documents
Repetitive queries from parents
Compliance audits
Staff managing multiple disconnected systems
**Interaction Model:** Portal/web app for configuration, occasional monitoring
---
2.2 Administrative Staff (Admin)
**Goals:**
Manage day-to-day document uploads
Configure user access
Monitor system health
**Pain Points:**
Time spent scanning and filing
Managing user permissions
Following up on document requests
**Interaction Model:** Web portal, upload documents, manage users
---
2.3 Teachers/Supervisors (Supervisor Role)
**Goals:**
Verify student records
Provide detailed context to parent queries
Escalate complex situations
**Pain Points:**
Searching through files for student info
Repeating the same information to multiple parents
Handling complaints about missing records
**Interaction Model:** Web dashboard, document viewer, chat with escalated conversations
---
2.4 Parents (User Role)
**Goals:**
Check child's attendance
View report cards
Communicate with school
Get quick answers without phone calls
**Pain Points:**
Can't reach the school
Waiting hours/days for responses
Confusing school processes
No visibility into child's performance
**Interaction Model:** WhatsApp, SMS, email, mobile app—primarily async
---
2.5 Support/IT Staff (Support Role)
**Goals:**
Troubleshoot technical issues
Manage escalations
Monitor system performance
Handle special requests
**Pain Points:**
Users don't know how to use the system
Complex queries require document review
Need audit trails for compliance
**Interaction Model:** Dashboard, audit logs, escalation queue
---
3. Core Use Cases (MVP)
Use Case 1: Parent Queries via WhatsApp
**Actor:** Parent  
**Trigger:** Parent sends message via WhatsApp: "What's my child's attendance?"
**Flow:**
1. DigiScript receives WhatsApp message
2. Verifies parent identity (phone number → student parent link)
3. Verifies authorization (parent can access this student's data)
4. AI asks clarifying questions: "Which term? Percentage or count?" (if needed)
5. Searches document knowledge base for attendance records
6. Generates natural language response
7. Parent receives answer in WhatsApp
**Success Criteria:**
Response within 30 seconds
Accurate attendance data
Parent satisfaction > 4/5 stars
**Sad Path:**
Parent not recognized → escalate to admin
Data not found → escalate to teacher
Needs more detail → escalate to supervisor
---
Use Case 2: Document Upload & Auto-Organization
**Actor:** Admin staff  
**Trigger:** Admin logs into DigiScript portal
**Flow:**
1. Admin clicks "Upload Documents"
2. Selects documents: scanned health records, report cards, attendance sheets
3. System shows AI categorization: "Health Records (95% confidence)" 
4. Admin confirms or corrects categorization
5. System asks context questions:
   - "Which term do these report cards cover?"
   - "What format is the attendance data?"
6. System automatically creates folder structure:
   ```
   School/
   ├── Term 3 2026/
   │   ├── Health Records/
   │   └── Report Cards/
   └── Attendance/
       └── 2026/
   ```
7. Documents are scanned/OCR'd
8. Metadata extracted (student names, dates, etc.)
9. Indexed into knowledge base
10. Admin sees confirmation and document count
**Success Criteria:**
Categorization accuracy > 90%
Documents indexed within 5 minutes
Folder structure matches org hierarchy
---
Use Case 3: Supervisor Reviews & Escalation
**Actor:** Teacher/Supervisor  
**Trigger:** Parent's WhatsApp question escalated
**Flow:**
1. Supervisor logs into DigiScript
2. Sees "Escalated Conversations" queue
3. Clicks parent's conversation
4. AI shows: extracted answer + confidence level + source documents
5. Supervisor reviews original documents
6. Can override AI response or add context
7. Sends custom response back to parent
8. Conversation closed with audit trail
**Success Criteria:**
Escalation response time < 5 minutes
Document retrieval < 10 seconds
Clear visibility into AI reasoning
---
Use Case 4: Compliance Audit
**Actor:** Principal/Admin  
**Trigger:** Monthly compliance check
**Flow:**
1. Admin clicks "Audit Trail" report
2. Filters by: date range, user, document type, action
3. Sees: who accessed what, when, why, from where
4. Exports audit log for compliance filing
5. Confirms POPIA compliance
**Success Criteria:**
Complete audit trail (zero gaps)
Export in standard formats (PDF, CSV)
Reports on data access violations
---
4. Feature Specifications (MVP Phase 1)
4.1 School Registration & Profile
**Description:** School principal creates account and configures school profile
**Features:**
Email-based registration with verification
School profile: name, address, phone, principal name
Org structure: grades, classes, departments
Logo & branding
Configuration: document retention policies, data privacy settings
**Technical:**
Form validation
Email verification
Profile image upload
Settings storage in RDS
---
4.2 User & Role Management
**Description:** Super admin creates users and assigns roles
**Roles:**
1. **Super Admin** → Full system access, user management, billing
2. **Admin** → Document management, user creation, system monitoring
3. **Supervisor** → View documents, escalation response, class records
4. **User** → Search documents, chat, view own records
5. **Support** → Escalation queue, audit logs, troubleshooting
**Features:**
Bulk user import (CSV)
Role-based access control (RBAC)
Team/department assignment
User deactivation
Password reset workflows
MFA support (email/SMS)
---
4.3 Document Ingestion Engine
**Description:** Accept documents from multiple channels
**Supported Formats:**
**Paper:** Upload scanned images (PDF, JPG, PNG) → OCR
**Email:** Connect school email → auto-import attachments
**Digital Files:** PDF, DOCX, XLSX, images, videos
**Videos:** Upload → auto-transcription
**Links:** Paste URLs → web archiving
**Plain Text:** Paste text into textarea
**Features:**
Drag-and-drop upload
Batch upload (zip files)
Email address for document forwarding
API endpoint for integrations
Progress tracking for large batches
Error reporting for failed ingestions
**Quality Assurance:**
Virus scanning (ClamAV)
File size limits (100MB per file, 1GB per batch)
Duplicate detection (hash-based)
Format validation
---
4.4 AI Categorization & Analysis
**Description:** AI analyzes documents and suggests organization
**Process:**
1. **Document Analysis:** LLM reads document content → extracts key info
2. **Classification:** Suggests category (e.g., "Health Record", "Report Card")
3. **Interactive Questions:** Based on document type, asks clarifying questions
   - "What term does this cover?"
   - "What grade/class is this for?"
   - "Is this confidential/sensitive data?"
4. **Folder Creation:** Proposes folder structure
5. **Metadata Extraction:** Pulls student names, dates, documents IDs
6. **Confirmation:** User reviews & confirms before indexing
**Confidence Thresholds:**
High confidence (>85%): Auto-categorize, ask confirmation questions
Medium confidence (70-85%): Suggest category + questions
Low confidence (<70%): Request manual category selection
**Special Handling:**
Sensitive documents (health, special needs) → flagged for privacy
Personally identifiable information (PII) → redaction options
Multi-language support → auto-translate to English
---
4.5 Cloud Storage & Organization
**Description:** Auto-organize documents in cloud storage with intelligent folder structure
**Storage Backend:** AWS S3
**Folder Structure:**
```
s3://digiscript-{school-id}/
├── organizations/
│   └── {school-id}/
│       ├── 2026/
│       │   ├── Term 1/
│       │   │   ├── Health Records/
│       │   │   ├── Report Cards/
│       │   │   └── Attendance/
│       │   ├── Term 2/
│       │   └── Term 3/
│       ├── Students/
│       │   └── {student-id}/
│       │       ├── attendance/
│       │       ├── health/
│       │       ├── academics/
│       │       └── communications/
│       └── Archive/
```
**Features:**
Automatic folder creation based on categorization
Document versioning (track changes)
Retention policies (auto-delete after X years)
Archival workflows (move old docs to cheaper storage)
Encryption at rest & in transit
Access logs per file
---
4.6 Knowledge Base & Embeddings
**Description:** Index documents into vector database for semantic search
**Technology:**
Document chunking (1000-token chunks with overlap)
Embedding model: OpenAI's text-embedding-3-small
Vector store: AWS OpenSearch
Refresh frequency: Real-time on document upload
**Features:**
Semantic search ("attendance for John in term 2")
Keyword search (exact phrase matching)
Filter by document type, date, student, class
Search relevance ranking
Search analytics (track popular queries)
---
4.7 Chat & Query Interface
**Description:** Multi-channel conversational AI for queries
**Channels:**
1. **WhatsApp** → Integration with WhatsApp Business API
2. **Email** → Send queries via email, receive responses
3. **Web Chat** → In-portal chat widget
4. **SMS** → Text-based queries for low-data users
5. **Mobile App** → Native chat interface
6. **API** → Webhooks for 3rd-party integration
**Conversation Flow:**
1. User sends message (via channel)
2. DigiScript identifies user & school
3. Verifies authorization
4. Searches knowledge base
5. Generates response with confidence score
6. If confident, sends response; if not, escalates
7. User can ask follow-up questions
8. Conversation stored in audit trail
**Response Generation:**
Use LLM to synthesize answer from search results
Include sources (which documents used)
Confidence indicators
Clear escalation options ("Talk to a supervisor")
**Conversation Context:**
Multi-turn conversations (remember context)
User profile context (role, relation to student, etc.)
Document citations (show sources)
Timestamp all messages
---
4.8 Authorization & Access Control
**Description:** POPIA-compliant access verification
**Access Rules:**
Parents can access only their child's records
Teachers can access student records for their classes
Admins can access all records
Supervisors can access escalated conversations
Support can access audit logs
**Verification Methods:**
Phone number verification (WhatsApp/SMS)
Email verification
Parent-student relationship verification (from school database)
Session-based auth (web)
API key authentication (integrations)
**Features:**
Granular permission controls
Data masking (redact sensitive info for certain roles)
Access request logging
Denial reasons logged
Incident alerts (multiple access denials)
---
4.9 Supervisor Escalation Dashboard
**Description:** Web interface for supervisors to handle complex queries
**Features:**
1. **Escalation Queue**
   - New escalations (not yet reviewed)
   - In-progress (supervisor reviewing)
   - Resolved (closed conversations)
   - Filter by priority, student, sender
2. **Document Viewer**
   - Display source documents
   - Highlight relevant sections
   - Side-by-side comparison
   - Annotation tools
3. **Conversation Management**
   - View AI-generated response & confidence
   - Override response with custom reply
   - Add context/notes
   - Send back to user
   - Mark as resolved
4. **Analytics**
   - Escalation rate by category
   - Resolution time
   - AI accuracy metrics
   - User satisfaction
---
4.10 Audit Trail & Logging
**Description:** Complete record of all system activity for compliance
**Logging:**
User login/logout
Document access (who, when, what, from where)
Data queries (what data requested)
Configuration changes (user management, settings)
Escalations (when escalated, by whom, resolution)
AI responses (question asked, answer given, confidence)
Access denials (who tried to access what, denied reason)
**Features:**
Real-time logging to immutable audit log
Queryable by date, user, document, action
Export to CSV/PDF for compliance reports
Retention: minimum 3 years
Tamper-proof (cryptographic signing)
---
5. Skills & Automation (MVP Phase 1+)
5.1 Communication Skills
**Skill: Send WhatsApp Message**
Trigger: User/bot sends WhatsApp message to parent
Input variables: phone number, message text, media (optional)
Output: Delivery status, timestamp
**Skill: Send Email**
Input: recipient email, subject, body, attachments
Output: Delivery status, bounce handling
**Skill: Send SMS**
Input: phone number, message text
Output: Delivery status, cost tracking
**Skill: Call (Future)**
Input: phone number, message text
Output: Call status, recording (if enabled)
---
5.2 Query & Retrieval Skills
**Skill: Search Documents**
Input: query text, document type filter, date range
Output: matching documents with relevance scores
**Skill: Extract Data**
Input: document path, extraction rules (e.g., "extract student name, grade, marks")
Output: structured data
---
5.3 Workflow & Task Skills
**Skill: Create Task/Reminder**
Input: task description, due date, assignee
Output: task ID, confirmation
**Skill: Update User Record**
Input: user ID, fields to update
Output: confirmation, audit log entry
**Skill: API Call (Generic)**
Input: API endpoint, method, headers, body, input variables
Output: API response, status code
---
6. Non-Functional Requirements
| Requirement | Target | Rationale |
|---|---|---|
| **Response Time** | < 3 seconds (p95) | Acceptable for async communication |
| **Document Indexing** | < 5 minutes | Near real-time availability |
| **Uptime** | 99.5% | SaaS expectation |
| **Data Availability** | 99.99% (RTO < 1h) | Critical school records |
| **Scalability** | 1000+ schools, 1M+ documents | Growth target |
| **Security** | ISO 27001 ready | Enterprise requirement |
| **Compliance** | POPIA, GDPR-ready | Legal requirement |
| **Accessibility** | WCAG 2.1 AA | Inclusive design |
| **Mobile** | iOS 14+, Android 10+ | Support major OS |
---
7. Success Metrics
Business Metrics
**School Adoption:** 50 schools in Year 1
**Monthly Active Users:** 30% of school staff + parents
**Revenue:** $179K ARR (50 schools × $299/month)
**Net Promoter Score:** > 40
**Customer Retention:** > 85% annually
Product Metrics
**Automation Rate:** 70%+ queries resolved without escalation
**Query Accuracy:** > 90% (verified by supervisors)
**Document Categorization Accuracy:** > 85%
**Escalation Resolution Time:** < 5 minutes avg
**System Uptime:** 99.5%
User Metrics
**Parent Satisfaction:** 4+ stars (5-star scale)
**Admin Effort Reduction:** 50% reduction in document management time
**Query Response Time:** < 2 minutes avg (vs. 24-48 hours current)
**Mobile App Adoption:** 40% of parents
---
8. Release Plan
MVP (Week 1-20)
School registration & profile
User & role management
Document ingestion (uploads only, Phase 1)
AI categorization
Basic chat (web only)
Authorization & POPIA compliance
Audit trail
Phase 1.5 (Week 21-28)
WhatsApp integration
Email integration
SMS support
Supervisor dashboard
Basic skills (send SMS/email)
Phase 2 (Month 6-9)
Mobile app (iOS/Android)
Advanced search (semantic)
Email ingestion automation
API integrations
Analytics dashboard
Phase 3 (Month 9+)
Expansion to legal, healthcare, corporate
Advanced AI features (document generation, contract analysis)
Voice/call integration
Advanced escalation workflows
White-label/enterprise licensing
---
9. Out of Scope (MVP)
Payment processing (billing handled externally initially)
Advanced document generation
Predictive analytics
Video transcription (video support added, not transcription)
Integrations with school management systems (coming Phase 2)
Multi-language UI (English only, MVP)
Video chat/call functionality
---
10. Success Criteria for MVP Launch
[ ] 5 pilot schools fully onboarded
[ ] 10K+ documents processed without errors
[ ] 95%+ authorization checks pass (0 unauthorized access)
[ ] 70%+ of parent queries automated (no escalation)
[ ] 99%+ document retrieval accuracy (verified by supervisors)
[ ] 4.5+ star rating from pilot users
[ ] Zero POPIA violations
[ ] System passes security audit
[ ] Deployment documented & tested
[ ] Support team trained
---
**Document Status:** Ready for development kickoff
