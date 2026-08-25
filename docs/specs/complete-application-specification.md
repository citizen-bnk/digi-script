

DigiScript
Intelligent Document Management & Financial Operating System
Complete Application Specification
Version 1.0 - MVP Phase 1
August 24, 2026
Table of Contents
1. Introduction & Overview
2. System Architecture & User Roles
3. Onboarding & Authentication Flow
4. System Owner (District-Level) Portal
5. Super User (School-Level Administrator) Portal
6. Supervisor & Nurse Module
7. Teacher Module
8. Parent User Portal
9. Mobile App & PWA Navigation
10. Feature Summary & Integration
1. Introduction & Overview
DigiScript is an intelligent document management platform with embedded AI that serves as the central operating system for K-12 school districts. The platform enables organizations to ingest documents from multiple channels (paper via OCR, emails, digital files, videos, links, and plain text), automatically categorize them using artificial intelligence, organize them in cloud storage with intelligent folder structures, and provide AI-powered access through chat interfaces, semantic search, and escalation workflows.
The system is built on a three-tier architecture:
System Owner Back Office: Kari Group manages multiple school districts with consolidated financial reporting, multi-school oversight, and government compliance dashboards.
Super User Back Office: Each school has a designated administrator who manages school-specific finances, document organization, user access, and local reporting.
Web/Mobile/PWA Interfaces: Staff (teachers, nurses, supervisors) and parents access school information, manage student records, respond to escalations, and communicate via WhatsApp or in-app chat.
DigiScript emphasizes financial reporting as a core differentiator: the system is designed to consolidate financial data from multiple schools and generate compliant reports for provincial government treasuries automatically.
Key Features (MVP Phase 1)
Multi-channel document ingestion (paper, email, files, videos, links, text)
AI-powered document categorization with human review and override capability
Cloud storage with intelligent auto-organization
Semantic search and keyword search across documents
AI chatbot via WhatsApp, email, SMS, web chat, and mobile app
Role-based access control (RBAC) with POPIA compliance
Escalation workflows with full document context handoff
Multi-school financial consolidation and government reports
Immutable audit trail for compliance
Mobile PWA with offline capability and push notifications
2. System Architecture & User Roles
DigiScript serves five distinct user roles, each with role-based access control (RBAC). All roles access the system through a consistent navigation structure: back-office staff use a web portal (desktop/tablet), while field staff and parents use the mobile PWA app or web browser.
User Roles & Access Levels
System Owner (Kari Group): Full access to all districts, financial consolidation, government compliance, user management
Super User (School Administrator): Access to school-specific finances, document organization, staff management, reporting
Supervisor/Nurse: Access to student records for assigned class/department, escalation queue, basic navigation
Teacher/Staff: Access to student records for assigned class, document viewing, basic escalation support
Parent: Access to own child's records only, chat interface, notifications, profile management
Access Channels
Web-based back office portal (desktop/tablet for System Owner and Super User)
Mobile PWA app (iOS/Android installable web app for all users)
WhatsApp integration for chat and notifications
3. Onboarding & Authentication Flow
All new users begin with a standard onboarding sequence. The system captures phone number, verifies identity, and routes them to their role-appropriate dashboard.
Onboarding Screens (Screens 1-4)
Screen 1: Welcome/Splash Screen
Display: DigiScript logo, tagline "Intelligent Document Management for Schools", animated graphic showing document flow
Actions: Get Started button (proceeds to login screen)
Screen 2: Login
Display: Two input fields - Email and Password. "Forgot Password?" link. "Don't have an account? Sign up" link at bottom.
Actions: Sign In button, Create Account link
Screen 3: Phone Verification
Display: Phone Number field (pre-populated from user profile if available). SMS Code field for entry after sending. "Resend Code" link. Message: "We've sent a verification code to your phone".
Actions: Verify Code button, Resend Code link
Screen 4: Welcome/Confirm Role
Display: Personalized greeting ("Welcome, [Name]!"), user role displayed prominently, permission summary for their role.
Actions: Continue to Dashboard button
Post-Authentication Routing
After successful verification, the system automatically routes users to their role-appropriate dashboard:
System Owner → Multi-District Financial Dashboard (back office portal)
Super User → School Dashboard (back office portal)
Supervisor/Nurse → "My Class" or "My Department" Dashboard (mobile PWA or web)
Teacher → "My Class" Dashboard (mobile PWA or web)
Parent → Chat Dashboard (with "My Child" profile shortcut)
4. System Owner (District-Level) Portal
The System Owner portal is accessed exclusively via back-office web interface (desktop/tablet). It provides enterprise-level oversight of all connected school districts, consolidated financial reporting, and compliance management.
System Owner Dashboard (Main Landing Page)
Left Sidebar Navigation Menu (Always Visible):
Dashboard (home icon)
Multi-School Overview (map/building icon)
Financial Consolidation (chart/graph icon)
Government Compliance Reports (document icon)
User Management (people icon)
Audit Logs (history icon)
Settings (gear icon)
Profile (user icon)
Dashboard Content Area:
Display Cards:
Overall System Health: Green/yellow/red indicator showing number of active schools, staff members, documents processed this month, pending escalations
Budget Status Across All Schools: Card showing "18/20 schools on target" with green indicator
Red Alert Cards: Display schools exceeding budget (e.g., "School A: Transport 92% consumed")
Recent Escalations: Queue of unresolved escalations requiring System Owner attention
Government Report Status: Upcoming submission deadlines with status (pending/submitted/accepted)
Multi-School Overview
Display: List of all schools in the system with school name, principal, financial status (budget %), document count, and active user count. Sortable by any column. Filterable by district.
Actions: Click school name to drill down into school-specific dashboard (summary view without full access)
Financial Consolidation & Reporting
Key Metrics Display:
District-wide budget summary: Total budget vs. actual spend, cost center breakdown (Transport, Utilities, Salaries, Supplies, etc.)
Cash flow projections: Running forecast showing budget depletion if current spending continues
Cost center heat map: Visual grid showing percentage of budget consumed for each school/cost center
Actions:
Download Financial Report: Export consolidated report as PDF (for board presentation) or Excel (for manipulation)
Generate Government Submission: One-click generation of formatted report required by provincial treasury
Government Compliance Reports
Display: List of required government reports (e.g., Quarterly Financial Statements, Annual Budget vs. Actual, Fraud/Irregularity Disclosures) with submission dates, current status (not started/in progress/submitted/accepted/rejected), and confidence score (% of required data collected).
Two outputs generated: PDF report (for government portal) + Audit Trail Report (for compliance file).
User Management
Display: District-wide staff directory with name, email, role, school assignment, last login date. Filterable by role and school.
Actions: Bulk user upload (CSV), individual user invite/deactivate, reset password
Audit Logs
Audit Trail Export: Complete transaction log for a date range, filterable by school, user, document type, or action. Export as PDF or Excel.
Settings
District Name & Branding: Upload logo, set color scheme
Report Delivery Schedule: Configure automatic delivery of monthly/quarterly reports to board members
Government Portal Credentials: Store and manage submission credentials for automated report delivery
Profile
Account settings, security, notification preferences
5. Super User (School-Level Administrator) Portal
The Super User portal is accessed via back-office web interface and manages all school-specific operations: finances, documents, staff, students, and local compliance.
Left Sidebar Navigation Menu (Always Visible):
Dashboard
Document Library
Budget Tracking & Approval
Reports & Analytics
User Management
Student Records
Audit Logs
Settings
Profile
School Dashboard (Main Landing Page)
Display Cards:
School Health: Active staff, students, documents processed this term, pending tasks
Budget Status: Current term spend vs. budget with breakdown by cost center
Pending Approvals: Number of financial items waiting for admin approval
Warning Alerts: Red card if any cost center exceeds budget ("Utilities 120% of budget - $8K over")
Recent Activity Timeline: "Finance admin uploaded 15 invoices (Aug 22)", "Principal approved $12K maintenance invoice (Aug 21)"
Document Library
This section is the hub for all document ingestion and organization. All documents flow through this interface.
Upload Section:
Drag-and-drop upload (files, scanned images, videos, links)
Camera integration (mobile PWA: photograph paper documents directly)
Email forwarding (send documents to documents@digiscript.school to auto-ingest)
Progress bar showing upload status
AI Categorization & Review:
After upload, AI instantly suggests document category (e.g., "Financial - Expense Invoice", "HR - Leave Request", "Compliance - Absence Note")
Confidence score displayed (e.g., "92% confident this is an Expense Invoice")
User can accept suggestion or override with correct category
If confidence < 70%, system escalates to human supervisor for review
Document Library View:
Folder structure auto-generated: School > Academic Year > Term > Category > Document
Search: Full-text search + semantic search (e.g., "invoices over $5,000" finds related items)
Filters: By category, date range, uploaded by, status (verified/pending review)
Download: Single document or batch download of folder contents
Budget Tracking & Approval
Budget Dashboard:
Current term budget summary (Total Budget, Spent, Remaining, % of budget consumed)
Breakdown by cost center (Transport, Utilities, Salaries, Supplies, etc.) with spend-to-date and projections
Visual indicator (green/yellow/red) for each cost center showing budget health
Approval Workflow:
Pending Approvals queue: Lists invoices/expenses awaiting admin approval with amount, date, and department
One-click approve/reject action buttons
Conditional approval (e.g., approve if under $500; for larger amounts, notify district finance)
Reports & Analytics
Monthly Budget Report: Export budget vs. actual by cost center (PDF/Excel)
Document Processing Report: Count and category breakdown of documents processed by month
Escalation Report: Summary of all escalations resolved this term with resolution times
User Management
School staff directory: Name, email, role, department, last login, status (active/inactive)
User Detail Drill-Down: Click user to view their activity logs, last login, assigned permissions, school assignments
Deactivate User: Revoke access immediately (user can no longer log in, but audit trail preserved)
Reset Password: Trigger password reset email to user
Student Records
School student list: Name, grade, class, emergency contacts
Student detail view: Full profile including medical notes, permissions, parent contacts
Bulk import: Upload student list via CSV
Audit Logs
School-specific audit trail: All document uploads, categorizations, approvals, user changes logged with timestamp and user
Export: Date range filterable export as PDF or Excel
Settings & Profile
School name, principal, contact details
Budget upload: Set school budget for current and future terms
Notification preferences: Email/SMS alerts for budget warnings, pending approvals, escalations
Profile: Account settings, security, notification preferences
6. Supervisor & Nurse Module
Supervisors and Nurses manage student records, respond to escalations, and communicate with parents. They access the system via mobile PWA or web browser.
Mobile PWA Bottom Navigation (5 Tabs):
Chat: AI chatbot for document questions + teacher-to-parent messages
My Class: Dashboard for assigned class/department
Documents: Access to school documents, student records, permissions
Notifications: Push notifications, SMS updates, in-app alerts
Profile: Account settings, personal information
Dashboard (My Class/Department):
Display Cards:
Class Overview: Number of students, recent notes/updates, upcoming tasks
Attendance Summary: Present/absent/late count for today, week, term
Escalations Pending: Count of unresolved escalations (e.g., "2 pending: Tommy absence, Emma permission needed")
Messages: Recent parent/staff communications
Student Profiles (Tabbed Interface):
Each student profile has tabs accessible from the My Class list:
Profile Tab: Name, photo, age, grade, parent contact, emergency contacts, medical notes
Attendance Tab: Daily log (date, present/absent/late/left early with notes)
Permissions Tab: Active permissions (field trips, media release, etc.) with expiry dates
Notes Tab: Teacher notes, incident reports, behavioral observations (time-stamped, by author)
Messages Tab: Direct chat with parents of this student
Medical Tab: Medications, allergies, health conditions, vaccination records
Escalations Queue:
When documents have low AI confidence or require human input, they enter an escalation queue:
List view: Document type, student, reason for escalation (e.g., "AI confidence 65%: Is this an absence note?"), date, status
Detail view: Full document preview, AI suggestion with confidence score, option to confirm/override category
Mark as Resolved: Once reviewed, escalation is closed and document auto-organized
Conversations (WhatsApp/In-App Chat):
Parent can message: "Emma is absent today because of doctors appointment. I'll send note later."
Supervisor responds: "Thanks. We have it noted. Please send note by EOD."
Parent sends photo of doctor note via camera/upload
AI auto-categorizes: "Absence Note - Medical"
Supervisor confirms or corrects, document auto-organized
7. Teacher Module
Teachers have simplified access to student records and can view class information. They cannot approve expenses, manage budgets, or access escalations queue.
Simplified Mobile PWA Bottom Navigation (5 Tabs):
Chat: AI chatbot only (no escalation access)
My Class: Dashboard for assigned class (read-only)
Documents: View school documents (no upload access)
Notifications: Push notifications, SMS
Profile: Account settings
Dashboard (My Class - Read-Only):
Display class overview, student list, attendance summary
View student profiles (all tabs) but cannot edit
Cannot see financial information, escalations, or admin functions
8. Parent User Portal
Parents access the system via mobile PWA to view their child's information, communicate with teachers, and manage notifications. All data is filtered to show only their own child due to POPIA compliance (row-level security).
Mobile PWA Bottom Navigation (5 Tabs):
Chat: Active conversations with school staff and AI chatbot
My Child: Student profile with all tabs (read-only)
Documents: Download permissions, medical forms, school notices
Notifications: Alert history and notification settings
Profile: Account settings, emergency contacts
Chat Dashboard:
Display: List of active conversations (thread view) with school staff, ordered by most recent. Each conversation shows last message preview and timestamp.
Active Conversations Detail:
When parent opens a conversation:
Full message thread visible with timestamps and author names
Parent can send text, upload photo/document (e.g., permission form, doctor note)
Responses from teacher/supervisor or AI chatbot marked clearly
If response is from AI (e.g., "Your child attended 18/20 days this term"), labeled as "School Assistant"
If teacher responds, labeled with teacher name and role
My Child Profile:
Parent views all student tabs (read-only):
Profile: Student photo, name, grade, class teacher, school
Attendance: Monthly/term attendance summary (% present, absences, reasons)
Permissions: Active field trip permissions, medical releases, media consent forms
Announcements: School-wide announcements and notifications relevant to their child
Medical: Allergies, medications, emergency contacts (view only)
Notifications:
Push notifications: "Emma marked absent today - please explain by EOD"
SMS alerts: Important items (absences, medical issues, emergency)
In-app notification center: History of all alerts with timestamps
Notification settings: Parent can customize alert types (absence only, permission requests, school news)
Documents:
Download school forms: Permission slips, medical forms, enrollment documents
Upload signed documents or medical notes directly from camera or device storage
Profile & Settings:
Contact information: Email, phone, emergency contact
Linked children: If parent has multiple children in school, can switch between profiles
Notification preferences: Which alerts via push/SMS/email
9. Mobile App & PWA Navigation
All roles except System Owner access DigiScript via a unified mobile Progressive Web App (PWA) that can be installed to the home screen on iOS and Android. The app features a consistent 5-tab bottom navigation bar visible on all screens.
Bottom Navigation Tabs (Consistent Across All Roles):
Tab 1 - Chat (Message bubble icon): AI chatbot, parent-teacher messages, escalation status
Tab 2 - My Class/My Child (People/Student icon): Role-dependent dashboard (supervisor/teacher: class, parent: child profile)
Tab 3 - Documents (Document icon): School documents, uploads, downloads, search
Tab 4 - Notifications (Bell icon): Alert history, notification settings, recent messages
Tab 5 - Profile (User icon): Account settings, security, preferences
PWA Features (Cross-Platform):
Installable: "Add to Home Screen" on both iOS and Android creates app-like experience
Offline Capability: Essential screens and documents cached; user can view offline, actions queue when online
Push Notifications: Alerts for absences, messages, escalations, budget warnings
Camera Access: On mobile, camera can photograph paper documents for instant upload
Responsive Design: Optimized for mobile (375-500px), tablet (600-900px), and web (1000px+)
Back Office Portal Navigation (System Owner & Super User):
Accessed on desktop/tablet browsers, features a fixed left sidebar with full menu always visible:
Sidebar width: Fixed 250px (collapsible to 60px on smaller screens)
Menu items: Icons + labels, highlight current page
Header bar: School/district name, user profile, logout, settings
Content area: Full width responsive to screen size
10. Feature Summary & Integration
End-to-End Workflows
Example 1: Parent Reports Child Absence
Parent receives push notification: "Emma marked absent today. Please explain by 3pm."
Parent opens Chat tab, sends message: "Emma is at doctor. I'll send note."
Parent uploads photo of doctor note from camera
AI categorizes: "Absence Note - Medical" (95% confidence)
Supervisor confirms categorization, document auto-organized under "2026 > Term 1 > Attendance > Absence Notes > Emma [Date]"
Escalation resolved automatically
Audit trail recorded: Who uploaded, AI confidence, who verified, when resolved
Example 2: School Submits Quarterly Financial Report
Super User clicks "Financial Consolidation" in sidebar
System auto-aggregates all school invoices, receipts, and expenses for Q1
Dashboard shows: $1.2M total spend, 85% of Q1 budget consumed, breakdown by cost center
Super User clicks "Generate Report", selects format (PDF for board presentation, Excel for manipulation)
System generates formatted report with charts, summaries, and notes
System Owner downloads same report and combines with other schools for district-wide government submission
Government report auto-formatted per treasury requirements, submitted electronically
Complete audit trail: All data sources tracked, who generated, when submitted, government acknowledgment logged
MVP Phase 1 Success Metrics
All 5 user roles can successfully authenticate and access role-appropriate dashboards
Document ingestion from at least 3 channels (upload, email, camera)
AI categorization achieves >85% confidence on common document types
Financial data consolidation from 5+ schools with accurate aggregation
Government report generated and formatted per treasury requirements
Mobile PWA installable on iOS and Android with offline capability
Push notifications working for key events (absences, escalations, approvals needed)
Audit trail complete for all transactions with immutable logging
POPIA compliance verified: Row-level security, encryption, access logs
User acceptance testing with real school staff and parents confirms usability
Conclusion
DigiScript MVP Phase 1 delivers a complete intelligent document management platform with integrated financial reporting for K-12 school districts. By combining AI-powered categorization with human oversight, multi-channel ingestion, and role-based access, the system streamlines administrative workflows while maintaining compliance and security. The mobile PWA and web-based back office provide consistent, intuitive interfaces across all user roles, from system administrators managing district-wide finances to parents receiving alerts about their child's attendance.
This specification defines the complete feature set, user workflows, and technical organization required to launch DigiScript as a production platform serving multiple K-12 districts.
