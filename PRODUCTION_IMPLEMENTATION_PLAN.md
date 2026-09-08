# Production Implementation Plan — NovaCRM AI

**Project:** NovaCRM AI  
**Target:** Production-Grade Enterprise CRM Application  
**Status:** In Progress

---

## 1. Executive Summary & Strategy

The application possesses a solid modern foundation built with React 19, TanStack Start, TanStack Router, TanStack Query, Tailwind CSS v4, and Supabase PostgreSQL. However, while the database migrations specify full CRM schema entities (contacts, companies, deals, tasks, activities, notifications, audit logs), the user interface only had partial organization and member management shells.

This implementation plan resolves all type safety, linting, database schema, and security blockers (P0), followed by implementing all core CRM modules, UI views, data persistence flows, notifications, and AI copilots (P1), and finishing with accessibility, performance, and deployment readiness (P2).

---

## 2. P0 — Critical (Immediate Blockers)

| ID       | Task                                                                                                                                                                                                                                                                                                     | Affected Files                                                                                                          | Dependencies | Risk   |
| :------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------- | :----------- | :----- |
| **P0-1** | **Complete Supabase Database Types Definition**<br>Add all CRM tables (`contacts`, `companies`, `deals`, `activities`, `tasks`, `notifications`, `files`, `audit_logs`) and enums (`crm_stage`, `activity_kind`, `notification_channel`, `notification_status`) to `src/integrations/supabase/types.ts`. | `src/integrations/supabase/types.ts`                                                                                    | None         | Low    |
| **P0-2** | **Fix TypeScript Compilation Errors**<br>Fix `TopNav.tsx` router link paths, `accept-invite.tsx` role enum typecasting, `ws.d.ts` explicit typing, and relation typings in `$orgId.tsx`.                                                                                                                 | `src/components/TopNav.tsx`<br>`src/routes/accept-invite.tsx`<br>`src/types/ws.d.ts`                                    | P0-1         | Low    |
| **P0-3** | **Database Schema & RLS Hardening Migration**<br>Add missing RLS policies for `notifications` (INSERT for org members) and `audit_logs` (INSERT for org members), ensure updated_at triggers and foreign keys.                                                                                           | `supabase/migrations/20260721020000_crm_rls_hardening.sql`<br>`supabase/migrations/20260721011000_bootstrap_schema.sql` | P0-1         | Medium |
| **P0-4** | **ESLint & Prettier Normalization**<br>Configure line ending normalization (`endOfLine: "auto"`) and verify clean `npm run lint` execution.                                                                                                                                                              | `.prettierrc`<br>`eslint.config.js`                                                                                     | None         | Low    |

---

## 3. P1 — High Priority (Core CRM Modules & Capabilities)

| ID       | Task                                                                                                                                                                                                                                                                                                                             | Affected Files                                                                     | Dependencies     | Risk   |
| :------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------- | :--------------- | :----- |
| **P1-1** | **Organization CRM Workspace Navigation & Architecture**<br>Build a robust, modular workspace tab layout (`Overview`, `Contacts`, `Companies`, `Pipeline`, `Tasks`, `Activities`, `AI Copilot`, `Team`, `Audit Logs`, `Settings`) inside `src/routes/_authenticated/organizations.$orgId.tsx` and modular components.            | `src/routes/_authenticated/organizations.$orgId.tsx`<br>`src/components/crm/*`     | P0-1, P0-2       | Medium |
| **P1-2** | **Contacts Module (Full CRUD & CSV Import/Export)**<br>Create contact modal, edit contact modal, delete confirmation, contact details sheet, search by name/email, stage filter, company selector, owner assignment, CSV export and CSV import.                                                                                  | `src/components/crm/ContactsView.tsx`<br>`src/components/crm/ContactModal.tsx`     | P1-1             | Low    |
| **P1-3** | **Companies Module (Full CRUD)**<br>Create company modal, edit company, delete confirmation, search, industry/size filters, revenue tracking, website link, and linked contacts count.                                                                                                                                           | `src/components/crm/CompaniesView.tsx`<br>`src/components/crm/CompanyModal.tsx`    | P1-1             | Low    |
| **P1-4** | **Deals & Sales Pipeline Module (Kanban Board & List View)**<br>Interactive Kanban board categorized by stage (`lead`, `qualified`, `proposal`, `won`, `lost`), stage summary metrics, quick stage movement buttons/dropdowns, deal creation/editing modal, probability slider, expected close date, and linked contact/company. | `src/components/crm/DealsPipelineView.tsx`<br>`src/components/crm/DealModal.tsx`   | P1-2, P1-3       | Medium |
| **P1-5** | **Tasks & Activity Management**<br>Task checklist with priority indicators (`low`, `normal`, `high`, `urgent`), status toggle (`open`, `in_progress`, `completed`), due date picker, assignee selector, and Activity logger (Calls, Emails, Meetings, Notes) with rich timeline feed.                                            | `src/components/crm/TasksView.tsx`<br>`src/components/crm/ActivitiesView.tsx`      | P1-1             | Low    |
| **P1-6** | **Workspace Overview & Analytics Dashboard**<br>KPI metric cards (Total Pipeline Value, Won Revenue, Active Deals, Total Contacts, Open Tasks), Deals by Stage visual breakdown chart, and recent activity timeline.                                                                                                              | `src/components/crm/WorkspaceOverview.tsx`                                         | P1-2, P1-3, P1-4 | Low    |
| **P1-7** | **AI Sales Copilot Integration**<br>Interactive AI Copilot tool with dynamic prompt templates for email drafting, deal closing strategy, meeting summary synthesis, and lead qualification scoring with instant copy capability.                                                                                                 | `src/components/crm/AICopilotModal.tsx`                                            | P1-1             | Low    |
| **P1-8** | **In-App Notifications Center**<br>Notification bell in header with unread badge counter, notification dropdown list, mark-as-read, and automatic notification dispatch when tasks or deals are assigned.                                                                                                                        | `src/components/TopNav.tsx`<br>`src/components/NotificationCenter.tsx`             | P0-3, P1-1       | Low    |
| **P1-9** | **Audit Log Viewer & Organization Settings**<br>Audit log viewer table for admins/owners; Organization settings for renaming workspace, updating slug, viewing subscription plan, and danger zone for workspace deletion.                                                                                                        | `src/components/crm/AuditLogsView.tsx`<br>`src/components/crm/OrgSettingsView.tsx` | P1-1             | Low    |

---

## 4. P2 — Production Polish, Verification & Deployment

| ID       | Task                                                                                                                                                                            | Affected Files                            | Dependencies | Risk |
| :------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :---------------------------------------- | :----------- | :--- |
| **P2-1** | **Global Dashboard Enhancement**<br>Enrich `/_authenticated/dashboard.tsx` with aggregate stats, quick jump to active workspace, and recent CRM highlights.                     | `src/routes/_authenticated/dashboard.tsx` | P1-6         | Low  |
| **P2-2** | **Error Handling & Form Validation Polish**<br>Ensure zero unhandled exceptions, double-submission prevention, accessible loading indicators, and user-friendly error messages. | All CRM views                             | P1-1..P1-9   | Low  |
| **P2-3** | **Accessibility & Mobile Responsiveness**<br>Test responsive viewports (desktop, tablet, mobile) and ensure accessible buttons, labels, and focus rings.                        | Workspace layout                          | All UI views | Low  |
| **P2-4** | **Production Configuration & Environment Documentation**<br>Create `.env.example`, verify build output with `npm run build`, and write `PRODUCTION_READY.md`.                   | `.env.example`<br>`PRODUCTION_READY.md`   | All tasks    | Low  |

---
