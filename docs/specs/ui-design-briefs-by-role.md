# DigiScript UI/UX Design Briefs by Role
## Screen Designs & User Interface Specifications

**Version:** 1.0  
**Date:** August 23, 2026  
**Purpose:** Design briefs for each user role; ready for designer/wireframing tool

---

## Overview: 5 Main User Roles

| Role | Primary Task | Device | Frequency | Time Sensitivity |
|------|--------------|--------|-----------|------------------|
| **School Admin** | Bulk upload, organize documents | Desktop | Daily, 2-3 hrs | Medium |
| **Classroom Teacher** | View class data, respond to parent escalations | Mobile or desktop | Daily, 30-60 mins | High |
| **School Nurse** | Manage health records, escalate issues | Desktop | 2-3x per week | Critical |
| **Principal/Leadership** | Monitor school health, approve docs, policy management | Desktop | Daily, 30 mins | Critical |
| **Parent** | Check child's data, message teacher/school | Mobile (WhatsApp) | 2-3x per week | Low-Medium |

---

## ROLE 1: School Admin/Secretary - Upload & Organization

### Role Profile
- **Main Goal:** Get documents into the system quickly and accurately
- **Pain Point:** Manual filing takes hours; AI makes it easier
- **Success:** Upload 10 documents with correct metadata in < 5 minutes
- **Device:** Desktop (large screen for batch work)
- **Platform:** Web browser (Chrome, Firefox)

### Core Screens to Design

#### SCREEN 1A: Admin Dashboard (Home Page)

**Design Brief:**

```
PURPOSE:
Admin's landing page when they log in.
Show upload status, recent activity, documents pending review.

VISUAL HIERARCHY:
1. [Large Upload Button] "Upload Documents" - primary CTA
2. Recent activity feed (last 5 uploads)
3. Documents pending review (low-confidence categorizations)
4. Quick stats (docs uploaded today, accuracy, storage used)

COMPONENTS:
- [Upload button] Drag-drop zone or "Choose Files"
- [Activity feed] Shows: "Attendance_June.pdf uploaded by Admin 
  at 2pm → Filed in Attendance & Enrollment (94% confidence)"
- [Pending review] Shows: "HealthForms_Q2.pdf (87% confidence - 
  review?)" [Confirm] [Edit]
- [Stats cards] 
  - 342 uploaded today
  - 97.4% accuracy
  - 2.1 TB total

MOBILE FRIENDLINESS: Not priority (admin uses desktop)

DESIGN NOTES:
- Keep it simple (admin wants to upload, not explore)
- Make upload button impossible to miss
- Show progress on uploads (% complete)
- Color-code accuracy: Green (95%+), Yellow (80-94%), Red (<80%)

PROTOTYPE PROMPT:
"Design an admin home page for DigiScript. Large, clickable upload 
button at top. Below: activity feed showing recent uploads (file name, 
category, confidence %), pending reviews, and quick stats (docs today, 
accuracy %, storage). Clean, professional, minimal distractions. 
Desktop-focused (1920x1080). No more than 3 colors. Show clear call 
to action for upload."
```

---

#### SCREEN 1B: Bulk Upload Flow

**Design Brief:**

```
PURPOSE:
Step-by-step upload wizard for uploading 5-20 documents at once.

WORKFLOW:
Step 1: File selection (upload or drag-drop)
Step 2: Document type & bulk questions
Step 3: Confirm categorizations
Step 4: Upload & progress

DETAILED SCREENS:

---STEP 1: FILE SELECTION---
[Large drop zone area]
"Drop files here or [Browse]"

Once files selected:
📄 Attendance_June.pdf (1.2 MB)
📄 HealthForms_Q2.pdf (2.4 MB)
📄 ReportCards_Term2.pdf (800 KB)
[Add more files] [Next →]

---STEP 2: DOCUMENT TYPE---
"What are these documents?"

[Radio buttons]
○ Attendance Register
○ Health Record
○ Report Card / Academic
○ Behavioral / Incident
○ Other / Unsure

[If "Other selected"] 
[Text field] "Describe the documents:"
[Type here...]

[Next →]

---STEP 3: BULK METADATA---
"Quick details for all documents:"

[Date picker] Covers what month?
June 2026

[Checkbox] Contains sensitive info?
☐ Yes, restrict access
☐ No, school staff can see

[Checkbox] Any student-specific?
☐ Yes, link to individual students
☐ No, class-wide documents

[Next →]

---STEP 4: REVIEW---
"Here's what we're filing:"

✓ Attendance_June.pdf
  → Attendance & Enrollment / June 2026 / Not Sensitive
  Confidence: 94%
  
✓ HealthForms_Q2.pdf
  → Health & Medical / Apr-Jun 2026 / SENSITIVE
  Confidence: 87%
  
✓ ReportCards_Term2.pdf
  → Academic Records / Term 2 2026 / Not Sensitive
  Confidence: 91%

[Edit categorization] [Proceed to upload]

---STEP 5: UPLOADING...---
Progress bar: 3/3 documents uploaded (100%)

Files being processed:
⏳ Attendance_June.pdf (Extracting text...)
✓ HealthForms_Q2.pdf (Indexed)
✓ ReportCards_Term2.pdf (Indexed)

Estimated time remaining: 45 seconds

---STEP 6: SUCCESS---
"3 documents uploaded & organized!"

Summary:
✓ Attendance_June.pdf → Attendance & Enrollment
✓ HealthForms_Q2.pdf → Health & Medical
✓ ReportCards_Term2.pdf → Academic Records

Accuracy: 91% average
Next: Documents are now searchable.

[Upload more] [View organized documents]

DESIGN NOTES:
- Progress bar shows user they haven't lost files
- Show confidence scores (build trust with AI)
- "Edit categorization" option if admin disagrees
- Success page gives positive feedback
- Keep colors consistent throughout (no scary reds)

PROTOTYPE PROMPT:
"Design a 6-step bulk document upload wizard for school admin. 
Step 1: Drag-drop file selection (show 3 example PDFs). 
Step 2: Document type selector (5 radio button options). 
Step 3: Bulk metadata questions (date picker, checkboxes). 
Step 4: Review categorizations with confidence scores shown as 
percentages (87%, 94%, 91%). Step 5: Upload progress bar 
(3/3 documents). Step 6: Success summary. Use a professional color 
scheme (blue + white + gray). Make it clear & reassuring."
```

---

#### SCREEN 1C: Document Organization View (After Upload)

**Design Brief:**

```
PURPOSE:
Show admin the organized documents in folder structure (tree view 
or column view).

LAYOUT: Three-column layout
Left: Folder tree
Middle: Files in selected folder
Right: Document preview or metadata

LEFT PANEL (Folder Tree):
📁 2026
  📁 Attendance & Enrollment
    📁 June 2026
      📄 Attendance_Grade1A.pdf
      📄 Attendance_Grade1B.pdf
      📄 Attendance_Grade2A.pdf
    📁 May 2026
  📁 Academic Records
    📁 Mathematics
    📁 English
    📁 Test Results
  📁 Health & Medical
  📁 Behavioral Records

MIDDLE PANEL (Files in selected folder):
If "Attendance & Enrollment → June 2026" selected:

✓ Attendance_Grade1A.pdf (1.2 MB, Jun 15, 2026)
  AI confidence: 94%
  Extracted: 23 students, all present/absent tracked
  [View] [Edit] [Delete]

✓ Attendance_Grade1B.pdf (1.1 MB, Jun 15, 2026)
  AI confidence: 92%
  Extracted: 22 students
  [View] [Edit] [Delete]

Search within folder: [search box]

RIGHT PANEL (Preview):
[Document preview image - first page of PDF]
OR
[Metadata display]
  Filename: Attendance_Grade1A.pdf
  Type: Attendance Register
  Date: Jun 15, 2026
  Class: Grade 1A
  Students: 23
  Sensitivity: Not sensitive
  Uploaded: Aug 23, 2026 by Admin
  AI Confidence: 94%
  [Download] [Move] [Delete] [Edit metadata]

DESIGN NOTES:
- Folder structure mirrors how teachers think ("June attendance")
- Show confidence scores (builds trust)
- Drag-and-drop to move files (optional)
- Search function helps find specific documents
- Bulk actions: Select multiple, delete/move together

PROTOTYPE PROMPT:
"Design a file organization interface for admin. Three-column layout: 
(1) Left panel shows folder tree structure (2026 > Attendance & 
Enrollment > June 2026). (2) Middle panel lists files with metadata 
(name, size, date, confidence score %). (3) Right panel shows PDF 
preview or metadata display. Include search box. Actions: View, Edit, 
Delete per file. Professional, minimal design. Use folder icons, 
file icons, confidence score indicators (color coded green/yellow)."
```

---

## ROLE 2: Classroom Teacher - Class Data & Parent Escalations

### Role Profile
- **Main Goal:** See class performance, respond to parent questions
- **Pain Point:** Parents ask questions → teacher has to search for data → slow
- **Success:** Answer "How's my student doing?" in < 30 seconds
- **Device:** Mobile or tablet (used in classroom)
- **Platform:** Mobile-responsive web OR native app

### Core Screens to Design

#### SCREEN 2A: Teacher Dashboard (My Class Overview)

**Design Brief:**

```
PURPOSE:
Quick snapshot of teacher's class performance & pending issues.
Tappable cards for drill-down.

LAYOUT: Card-based (mobile-friendly)

TOP CARD: Class Summary
┌─────────────────────────────┐
│ Grade 1A - 23 Students      │
│ ├─ Attendance: 94%          │
│ ├─ Avg Performance: B+      │
│ ├─ Incidents: 0 this week   │
│ └─ Escalations: 1 pending   │
└─────────────────────────────┘
[Tap for details]

ATTENTION CARDS (Red/Yellow):
┌─────────────────────────────┐
│ ⚠️ Parent Questions Pending  │
│ 1 parent asked about math    │
│ scores 2 hours ago.         │
│ [Respond now]               │
└─────────────────────────────┘

RECENT UPLOADS CARD:
┌─────────────────────────────┐
│ Recent Documents            │
│ ✓ Math Test Scores (Jun 15) │
│ ✓ Attendance (Jun 22)       │
│ ✓ Class Notes (Jun 20)      │
│ [View all]                  │
└─────────────────────────────┘

SUBJECT/PERFORMANCE CARDS:
┌─────────────┐  ┌─────────────┐
│ Mathematics │  │ English     │
│ Avg: 83%    │  │ Avg: 87%    │
│ [View]      │  │ [View]      │
└─────────────┘  └─────────────┘

┌─────────────┐  ┌─────────────┐
│ Life Skills │  │ Art & Music │
│ Avg: A      │  │ Avg: A      │
│ [View]      │  │ [View]      │
└─────────────┘  └─────────────┘

BOTTOM ACTION BUTTONS:
[Upload Document] [View Class Data] [Send Announcement]

DESIGN NOTES:
- Card design = natural scrolling on mobile
- Red/yellow alerts = can't miss urgent items
- Numbers are prominent (attention-grabbing)
- Actions grouped at bottom (bottom nav bar)
- 1 tap = drill down to details

PROTOTYPE PROMPT:
"Design a mobile teacher dashboard for Grade 1A class. Card-based 
layout. Top card: Class summary (23 students, 94% attendance, B+ avg, 
0 incidents, 1 escalation). Below: Red alert card 'Parent Questions 
Pending' with [Respond now] button. Then: Recent uploads (3 items with 
[View all]). Subject cards in 2x2 grid (Mathematics avg 83%, English 
87%, Life Skills A, Art & Music A) each with [View] button. Bottom: 
3 action buttons (Upload, View Class Data, Send Announcement). Mobile 
first design. Use card shadows. Color hierarchy: red for alerts, green 
for positive metrics."
```

---

#### SCREEN 2B: Subject Performance View (Drill Down)

**Design Brief:**

```
PURPOSE:
See detailed performance in one subject (e.g., Mathematics).
Show individual student scores + class trends.

LAYOUT: Combination of summary + list

TOP SECTION: Subject Summary
┌────────────────────────────────┐
│ 📊 Grade 1A Mathematics         │
│ Class Average: 83%              │
│ Trend: ↑ +5% from last month   │
│ Total tests this month: 2       │
└────────────────────────────────┘

CHART: Line graph of class average over time
Jun: 79% → Jun 20: 83% → Expected: 85%
[Trend shows improvement]

STUDENT LIST (Sortable/Filterable):
Top performers:
✓ Jane Doe: 92% (above average)
✓ Emily Smith: 90% (above average)
✓ Michael Brown: 88% (at average)

At average:
○ John Smith: 85% (at average)
○ Sarah Johnson: 83% (at average)

Needs support:
! David Wilson: 78% (below average)
! James Lee: 75% (below average)
! Robert Chen: 70% (needs intervention)

SORT OPTIONS: [Best ↓] [Needs support ↑] [Recent test ↓]
FILTER: [All students] [Above avg] [Below avg] [Flagged]

ACTIONS PER STUDENT:
[Tap on student name]
→ Pop-up:
   John Smith - Mathematics
   Test 1 (Jun 15): 85%
   Test 2 (Jun 22): 86%
   Notes: Good progress
   [Send parent message] [Detailed report]

BOTTOM ACTION:
[Send class-wide message] e.g., "Great math work this month!"
[Export report]

DESIGN NOTES:
- Color code: Green (above), Gray (at), Red (below)
- Show trend arrow (up/down) = motivating
- List is sortable (teacher wants to see "who needs help")
- Tap on student for detailed view
- Action buttons help teacher communicate

PROTOTYPE PROMPT:
"Design a subject performance detail screen for Grade 1A Mathematics. 
Header: Subject name + class average (83%) + trend arrow (↑ +5%). 
Below: Small line chart showing avg over time (Jun: 79%, Jun 20: 83%). 
Below: Student list with color-coded performance (green above avg, 
gray at avg, red below). Top performers shown first (Jane 92%, Emily 
90%), then at average (John 85%), then needs support (David 78%, 
James 75%). Include sort/filter options. Each student tappable 
(shows test scores, notes). Bottom buttons: Send class message, 
Export. Mobile + desktop responsive."
```

---

#### SCREEN 2C: Parent Escalation Response

**Design Brief:**

```
PURPOSE:
Teacher sees parent's question and composes a response.

LAYOUT: Conversation view (like WhatsApp but in web app)

PARENT MESSAGE:
┌────────────────────────────────┐
│ Parent: Sarah Smith            │
│ "Why did John's math drop from │
│ 85% to 78%? Is he struggling?" │
│ [Sent: 2 hours ago]            │
└────────────────────────────────┘

SYSTEM INFO POPUP:
Teacher taps [View student data]
→ Pop-up shows:
   John Smith - Mathematics
   Test 1 (Jun 15): 85%
   Test 2 (Jun 22): 78%
   Drop: -7%
   Notes: Test 2 included word problems (weaker area)
   Class average: 83%
   
   [Close]

TEACHER RESPONSE COMPOSER:
┌────────────────────────────────┐
│ Type response:                 │
│                                │
│ [Text area]                    │
│ "Hi Sarah, thanks for asking.  │
│ John's test 1 focused on       │
│ multiplication (his strength)  │
│ while test 2 included word     │
│ problems, which are trickier   │
│ for him. He's improving with   │
│ practice. Let's chat at        │
│ parent-teacher conference.     │
│                                │
│ [Insert student data] ← quick links
│ [Insert class info]            │
│ [Insert resources]             │
│                                │
│ [Send to parent] [Save draft]  │
│ [Schedule follow-up]           │
└────────────────────────────────┘

AFTER SENDING:
Message appears in chat:
┌────────────────────────────────┐
│ Teacher: Jennifer Johnson      │
│ "Hi Sarah, thanks for asking..." │
│ [Sent: Just now]               │
│ Status: Delivered to WhatsApp  │
└────────────────────────────────┘

DESIGN NOTES:
- Conversation layout = familiar (like text messaging)
- Quick access to student data (tap button = data shown)
- Text area is large (easy to type detailed response)
- [Insert student data] = copy-paste snippets (speeds up response)
- [Save draft] = teacher can finish later
- Timestamp shows when sent to parent
- Clear visual separation: parent message (top), teacher response (bottom)

PROTOTYPE PROMPT:
"Design a parent escalation response interface. Top: Parent's message 
in a chat bubble (Sarah Smith: 'Why did John's math drop from 85% to 
78%?'). Middle: Teacher can tap [View student data] to see John's scores 
inline. Bottom: Large text area for teacher to compose response. Include 
quick buttons to [Insert student data], [Insert class info], [Insert 
resources]. Action buttons: [Send to parent], [Save draft], [Schedule 
follow-up]. After sending, show message in chat bubble with 
'Delivered to WhatsApp' status. Design like WhatsApp or iMessage but 
professional. Mobile + desktop responsive."
```

---

## ROLE 3: School Nurse/Health Coordinator - Sensitive Data Management

### Role Profile
- **Main Goal:** Manage health records securely, escalate urgent issues
- **Pain Point:** Sensitive data (allergies, medications) must be protected
- **Success:** Upload health record, notify parent, track follow-ups
- **Device:** Desktop (security-conscious)
- **Platform:** Web browser with extra security (logout after 10 mins)

### Core Screens to Design

#### SCREEN 3A: Health Records Dashboard

**Design Brief:**

```
PURPOSE:
Nurse's main view: see which students have health issues, follow-ups 
pending.

LAYOUT: Dashboard with priority alerts

SECURITY WARNING (Top):
┌────────────────────────────────┐
│ 🔒 CONFIDENTIAL DATA           │
│ Do not share. Logout after 10  │
│ minutes of inactivity.         │
│ Screen lock: [Lock now]        │
└────────────────────────────────┘

URGENT ALERTS (Red):
┌────────────────────────────────┐
│ ⚠️ URGENT                      │
│ Immunization overdue:          │
│ • John Smith (Due: Aug 20)     │
│ • Jane Doe (Due: Aug 25)       │
│ [Notify parents] [Mark done]   │
└────────────────────────────────┘

PENDING FOLLOW-UPS (Yellow):
┌────────────────────────────────┐
│ 📋 Follow-Up Needed            │
│ Parent notification pending:   │
│ • David Johnson (Allergy)      │
│ • Sarah Williams (Medication)  │
│ [Notify now] [Mark done]       │
└────────────────────────────────┘

STUDENT HEALTH SUMMARY (Cards):
┌────────────────┐  ┌────────────────┐
│ John Smith     │  │ Jane Doe       │
│ Allergies: 1   │  │ Allergies: 0   │
│ Medications: 0 │  │ Medications: 1 │
│ Conditions: 0  │  │ Conditions: 0  │
│ [View]         │  │ [View]         │
└────────────────┘  └────────────────┘

BOTTOM ACTIONS:
[Upload Health Record] [View All Students] [Export Report]

DESIGN NOTES:
- Red/yellow alerts = can't miss urgent items
- Security warning prominent at top
- Short student cards = quick scan
- Action buttons = quick access to common tasks
- Lock icon visible = reminds of data sensitivity

PROTOTYPE PROMPT:
"Design a school nurse health records dashboard. Top: Red security 
warning 'CONFIDENTIAL DATA - Logout after 10 mins inactivity' with 
[Lock now] button. Below: Red urgent alerts box (Immunizations overdue: 
John Smith due Aug 20, Jane Doe due Aug 25) with [Notify parents] 
buttons. Yellow pending follow-ups box (Allergy notifications pending 
for David Johnson, Sarah Williams). Student health cards in grid (John 
Smith: Allergies 1, Meds 0, Conditions 0; Jane Doe: Allergies 0, Meds 1, 
Conditions 0) with [View] buttons. Bottom: 3 action buttons. Use red/yellow 
color hierarchy for alerts. Professional, security-conscious design."
```

---

#### SCREEN 3B: Individual Student Health File

**Design Brief:**

```
PURPOSE:
Detailed health record for one student (comprehensive file).

LAYOUT: Tabbed interface

TOP SECTION:
Student: John Smith (Grade 1A)
DOB: 2019-06-15 | Age: 7 | ID: STU001

TABS:
[Overview] [Allergies] [Medications] [Conditions] [Documents] [History]

--- TAB 1: OVERVIEW ---
Quick health snapshot:

Allergies: Peanuts (Severe)
  ⚠️ Anaphylaxis risk - EpiPen on file
  
Medications: None

Conditions: Asthma (Mild, managed)
  Albuterol inhaler at school
  
Last doctor visit: Jun 2026
Next follow-up: Sep 2026

Immunizations: Up to date (last: Varicella, Jun 2026)

Emergency contacts:
  Mother: Sarah Smith +27 82 123 4567
  Father: David Smith +27 82 987 6543

ACTIONS:
[Edit profile] [Notify parents] [Update medical records]

--- TAB 2: ALLERGIES ---
┌────────────────────────────────┐
│ Peanuts (Severe)               │
│ Added: 2024-01-15             │
│ Reaction: Anaphylaxis          │
│ EpiPen: On file (expires Jun   │
│ 2027)                          │
│ Notes: Mother confirmed        │
│ severe reaction at age 4       │
│                                │
│ [View full history] [Edit]     │
└────────────────────────────────┘

--- TAB 3: MEDICATIONS ---
(Manage school-based medications)

No medications on file currently.
If medication needed, nurse adds:
  [+ Add Medication]
  → Name: [Albuterol]
  → Dosage: [2 puffs]
  → Frequency: [As needed]
  → Storage: [Office cupboard]
  → Admin: [Nurse only]

--- TAB 4: DOCUMENTS ---
✓ Immunization_Certificate.pdf (Jun 2026)
✓ Asthma_Action_Plan.pdf (May 2026)
✓ EpiPen_Authorization.pdf (Jan 2024)
✓ Allergy_Testing.pdf (Dec 2023)

[+ Upload new document]

--- TAB 5: HISTORY ---
Timeline of health events:
Jan 15, 2024: Severe peanut allergy documented
May 10, 2026: Asthma action plan updated
Jun 15, 2026: Immunizations up to date
Jun 30, 2026: Parent notified of allergy protocols

DESIGN NOTES:
- Tabbed layout = organized, not overwhelming
- Allergy/condition details = clear, scannable
- Emergency contacts prominent = quick access
- Documents archived = audit trail
- Edit buttons = nurse can update records
- Notifications tracked = POPIA compliance

PROTOTYPE PROMPT:
"Design a student health file screen. Student header: John Smith, 
Grade 1A, DOB, ID. Five tabs: Overview, Allergies, Medications, 
Conditions, Documents, History. In Overview tab: Show allergies 
(Peanuts - Severe with anaphylaxis risk, EpiPen on file), medications 
(None), conditions (Asthma - Mild, albuterol at school), immunizations 
(up to date), emergency contacts. In Allergies tab: Detailed allergy 
record (Peanuts severity, reaction type, date added, history). Medications 
tab: Add/manage school medications. Documents tab: List uploaded files 
(Immunization cert, asthma plan, EpiPen auth, allergy testing). History 
tab: Timeline. Action buttons: Edit profile, Notify parents, Update 
records. Design is secure, professional, healthcare-oriented."
```

---

## ROLE 4: Principal/Leadership - Monitoring & Policy Management

### Role Profile
- **Main Goal:** See school health, approve policies, monitor compliance
- **Pain Point:** Lots of data, needs to spot issues quickly
- **Success:** Understand school status in 5 minutes, approve policy in 2 clicks
- **Device:** Desktop
- **Platform:** Web browser, admin tools

### Core Screens to Design

#### SCREEN 4A: Principal Dashboard (Executive Summary)

**Design Brief:**

```
PURPOSE:
High-level school overview for principal. KPIs, alerts, compliance status.

LAYOUT: Dashboard with cards + gauges

TOP SECTION: Key Metrics (4 boxes)
┌────────────┐  ┌────────────┐
│ 📊 Students│  │ 📚 Docs    │
│ 185        │  │ 48,291     │
│ Active     │  │ Indexed    │
└────────────┘  └────────────┘

┌────────────┐  ┌────────────┐
│ ✓ Accuracy │  │ 🎓 Teachers│
│ 97.4%      │  │ 8 active   │
│ AI         │  │ Staff      │
└────────────┘  └────────────┘

SCHOOL HEALTH GAUGES:
┌────────────────────────────────┐
│ 📈 School Health Score: 87/100 │
│                                │
│ Attendance: 94% ████████░  ✓   │
│ Academic: 83% ███████░░░  ~    │
│ Discipline: 92% █████████░ ✓   │
│ Health: 100% ██████████  ✓     │
│ Compliance: 95% ████████░░ ✓   │
└────────────────────────────────┘

ALERTS & ISSUES (Priority order):
┌────────────────────────────────┐
│ ⚠️ ALERTS (3)                  │
│                                │
│ 🔴 HIGH: 2 students with 70%+ │
│ absences this term. Consider   │
│ intervention.                  │
│ [View students] [Take action]  │
│                                │
│ 🟡 MEDIUM: POPIA policy        │
│ acknowledgment at 95%. Get to  │
│ 100% by end of week.           │
│ [Notify staff] [Track]         │
│                                │
│ 🟡 MEDIUM: 1 teacher's         │
│ qualifications expire Sep 2026.│
│ Renew before then.             │
│ [Notify teacher] [Track]       │
└────────────────────────────────┘

RECENT ACTIVITY LOG:
Last 5 important events:
✓ 185 students enrolled (Jun 2026)
✓ Q2 exam results entered (Jul 2026)
✓ POPIA policy updated (Aug 2026)
✓ 48,291 documents indexed (ongoing)
✓ 8 staff qualified & verified (ongoing)

QUICK ACTIONS (Bottom):
[View Detailed Reports] [Upload Policy] [Staff Directory] 
[Compliance Audit] [Alerts Management]

DESIGN NOTES:
- Executive summary = 1-page overview
- Gauges = visual health indicators
- Alerts prioritized by severity (red > yellow)
- Action buttons = quick decisions
- Activity log = audit trail
- Color-coded (red/yellow/green) = easy scanning

PROTOTYPE PROMPT:
"Design an executive principal dashboard. Top: 4 KPI boxes (185 
Students, 48,291 Docs, 97.4% Accuracy, 8 Teachers). Below: School 
Health Score gauge (87/100) with 5 sub-gauges (Attendance 94%, Academic 
83%, Discipline 92%, Health 100%, Compliance 95%) with color-coded 
bars. Below: Alerts section with 3 priority alerts (🔴 2 students 70%+ 
absent, 🟡 POPIA acknowledgment 95%, 🟡 Teacher quals expire Sep 2026) 
with action buttons. Activity log timeline (Last 5 events). Bottom: 5 
quick action buttons. Professional, executive-style design. Use red/
yellow/green color hierarchy for alerts."
```

---

#### SCREEN 4B: Policy Management & Acknowledgment Tracking

**Design Brief:**

```
PURPOSE:
Upload, manage, track acknowledgment of school policies.

LAYOUT: Policy library with tracking

POLICIES LIST (Sortable, filterable):
┌────────────────────────────────┐
│ POPIA Privacy Policy (2026)    │
│ Effective: Aug 1, 2026         │
│ Status: ✓ Approved & Active    │
│ Staff acknowledgments: 8/8 ✓   │
│ Parent acknowledgments: 168/185│
│ Completion: 91%                │
│ Last updated: Aug 23, 2026     │
│ [View] [Edit] [Resend]         │
└────────────────────────────────┘

┌────────────────────────────────┐
│ Code of Conduct (2026)         │
│ Effective: Aug 1, 2026         │
│ Status: ✓ Approved & Active    │
│ Staff acknowledgments: 8/8 ✓   │
│ Parent acknowledgments: 175/185│
│ Completion: 95%                │
│ Last updated: Jul 15, 2026     │
│ [View] [Edit] [Resend]         │
└────────────────────────────────┘

┌────────────────────────────────┐
│ Anti-bullying Policy (2025)    │
│ Effective: Jan 1, 2025         │
│ Status: 🟡 Needs renewal       │
│ Update due: Jan 2026           │
│ [View] [Renew] [Archive]       │
└────────────────────────────────┘

POLICY DETAIL VIEW (When principal taps on policy):
┌────────────────────────────────┐
│ POPIA Privacy Policy (2026)    │
│                                │
│ [PDF preview]                  │
│ [Download] [Print]             │
│                                │
│ ACKNOWLEDGMENT TRACKING:       │
│ ┌──────────────────────┐       │
│ │ Acknowledged: 176/193│       │
│ │ ██████████████░  91% │       │
│ └──────────────────────┘       │
│                                │
│ Staff (8/8): ✓ Complete       │
│ ├─ Jennifer Johnson      ✓     │
│ ├─ Peter Mthembu        ✓     │
│ └─ ... (8 total)               │
│                                │
│ Parents (168/185): 91%         │
│ ├─ ✓ Sarah Smith        ✓ Aug23│
│ ├─ ✓ David Johnson      ✓ Aug23│
│ ├─ ✓ Emily Brown        ✓ Aug22│
│ ├─ ✗ Michael Lee    (pending) │
│ ├─ ✗ Lisa Wong      (pending) │
│ └─ ... [Show 5, more available]
│                                │
│ [Send reminder to pending]     │
│ [Export acknowledgments]       │
│ [View full tracking]           │
└────────────────────────────────┘

UPLOAD NEW POLICY:
[+ Upload New Policy]
→ Opens modal:
  - Policy title
  - Category
  - Effective date
  - [Upload PDF]
  - [Set acknowledgment deadline]
  - [Select audience] (Staff / Parents / Both)

DESIGN NOTES:
- Policy library = central location
- Acknowledgment tracking visible = principal knows status
- Color-coded completion (green = done, yellow = pending)
- One-click remind (for parents not yet acknowledged)
- Audit trail = every acknowledgment dated
- Export = for compliance audits

PROTOTYPE PROMPT:
"Design a school policy management screen. List view of 3 policies: 
POPIA Privacy Policy (Approved, Staff 8/8 acknowledged ✓, Parents 
168/185 acknowledged 91%), Code of Conduct (Approved, Staff 8/8 ✓, 
Parents 175/185 95%), Anti-bullying Policy (Needs renewal). Each 
policy card shows: title, effective date, status, acknowledgment 
counts, completion %, last updated. [View] [Edit] [Resend] buttons. 
When clicking a policy, show detail view with PDF preview, acknowledgment 
tracking progress bar, list of staff acknowledged ✓, list of parents 
with some checked ✓ and some pending ✗. Include [Send reminder to pending] 
button. Bottom: [+ Upload New Policy] button. Design is organizational, 
tracking-focused, with color-coded status (green for complete, yellow 
for pending)."
```

---

## ROLE 5: Parent - WhatsApp Interface (Simplified)

### Role Profile
- **Main Goal:** Quick access to child's data without opening web portal
- **Pain Point:** Don't want to download app, just want simple answers
- **Success:** Ask "How's my child doing?" and get answer in 30 seconds
- **Device:** Mobile (via WhatsApp)
- **Platform:** WhatsApp messaging (asynchronous)

### Core Screens to Design

#### SCREEN 5A: WhatsApp Conversation Flow

**Design Brief:**

```
PURPOSE:
WhatsApp conversation between parent and DigiScript AI/teacher.
No app needed—just WhatsApp messaging.

FLOW EXAMPLE:

PARENT MESSAGE (Initiation):
[Parent types in DigiScript WhatsApp chat]
"Hi, how's Jane doing in school?"

AI RESPONSE (Immediate):
"Hi Sarah! 👋 I can help with that. 
Jane's doing great!
├─ Attendance: 95% (excellent)
├─ Recent test: Math 92%, English 88%
├─ Behavior: No incidents
└─ Overall: A student

Any specific area you'd like to know more about?
[View full report] [Talk to teacher]"

---

PARENT FOLLOW-UP:
"Why is her math higher than English?"

AI RESPONSE:
"Great observation! Jane scored 92% on the June math test 
(Topic: multiplication—her strength) and 88% on English (Topic: 
creative writing—still developing). Both are strong scores!

Class averages: Math 83%, English 85%
Jane is above average in both.

[View detailed scores] [Message teacher Mrs. Johnson]"

---

PARENT CONCERN:
"Has she been absent much?"

AI RESPONSE:
"Jane's attendance is excellent: 
✓ 38 out of 40 days present (95%)
Absences: Jun 5 (doctor), Jun 15 (family)

No concerns. The school will alert you if 
attendance drops below 85%.

[View full attendance] [Talk to admin]"

---

ESCALATION TO TEACHER:
"She seems stressed about exams."

AI RESPONSE:
"Thanks for letting us know. That's important feedback.

I'm connecting you with Mrs. Johnson (her teacher).
She'll be in touch shortly to chat.

Mrs. Johnson →
──────────────
(3 min later)

"Hi Sarah! Thanks for sharing. We've noticed Jane is conscientious. 
Let's have a quick chat about exam strategies. Would you be free 
for a 10-min call this week?

How about Thursday after 3pm?"

PARENT: "Thursday works!"

TEACHER: "Great! I'll call you Thursday at 3:15. See you then!"

---

FOLLOW-UP ON EXAM STRATEGIES:
(Next day, after phone call)

TEACHER: "Hi Sarah, thanks for yesterday's call! 
Some resources Jane might enjoy:
[PDF] Exam Study Tips (5 min read)
[Video] Stress Management for Kids (3 min)

Keep encouraging her—she's doing great!"

PARENT: "Thanks so much! Really helps."

---

DESIGN NOTES (for WhatsApp integration):
- Messages are conversational (natural language)
- Quick data access (answers appear in < 1 min)
- Escalation to teacher = handoff at right time
- Links = parents can view reports if interested
- No app download required = low friction
- Asynchronous = parent can message anytime

PROTOTYPE PROMPT:
"Design WhatsApp conversation mockup between parent (Sarah) and 
DigiScript AI/Teacher. Conversation:
1. Parent: 'How's Jane doing in school?'
2. AI response with bullet points: Attendance 95%, Tests 92% Math 
88% English, Behavior clean, Overall A student.
3. Parent: 'Why is math higher than English?'
4. AI: Explains strength/weakness areas, shows class averages, 
Jane's above average both.
5. Parent: 'Stressed about exams'
6. AI: 'Connecting you with teacher Mrs. Johnson'
7. Teacher (3 min later): 'Let's chat about exam strategies, 
Thursday after 3pm?'
8. Parent: 'Works'
9. Teacher: Confirms and sends follow-up resources.

Use iMessage/WhatsApp style bubbles (blue for parent, white for 
AI/teacher). Show timestamps. Professional but friendly tone."
```

---

## Summary: 5 Roles, 5 Design Briefs

| Role | Priority Screen 1 | Priority Screen 2 | Device |
|------|-------------------|-------------------|--------|
| **Admin** | Dashboard (upload button + activity) | Bulk upload wizard (6 steps) | Desktop |
| **Teacher** | Class overview (cards + alerts) | Subject detail drill-down | Mobile |
| **Nurse** | Health dashboard (urgent alerts) | Student health file (tabs) | Desktop |
| **Principal** | Executive dashboard (KPIs + gauges) | Policy management + tracking | Desktop |
| **Parent** | N/A (WhatsApp only) | WhatsApp conversation flow | Mobile (WhatsApp) |

---

## Design System Guidelines (All Roles)

### Color Palette
- **Primary:** Blue (actions, buttons)
- **Alert Red:** Critical/urgent items (health emergency, abuse)
- **Warning Yellow:** Attention needed (follow-ups, approvals)
- **Success Green:** Completed, normal status
- **Neutral Gray:** Secondary info, inactive

### Typography
- Headings: Bold, clear hierarchy
- Body text: 14-16px, readable on mobile
- Action text: Button labels short & clear

### Accessibility
- WCAG 2.1 AA standard
- High contrast ratios
- Screen reader friendly
- Mobile responsive (all screens)
- Touch-friendly buttons (48px minimum)

### Security
- HTTPS everywhere
- No sensitive data in URLs
- Session timeout (10 mins for health/admin)
- "Copy to clipboard" for sensitive data (no screenshots)
- Audit trail logged

---

## Next Steps: From Design Briefs to Implementation

1. **Choose design tool:** Figma, Adobe XD, or Sketch
2. **Create wireframes** for each screen (low-fidelity first)
3. **Get feedback** from real users (admin, teacher, nurse, principal, parent)
4. **Build high-fidelity mockups** (with colors, real text, interactions)
5. **Prototype interactions** (upload flow, escalation handoff, etc.)
6. **Test with real users** before development

---

**Document Status:** Design briefs ready for designer handoff

