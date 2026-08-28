# Goodlist — Project Plan

**Project status:** Product concept and dossier defined; clickable prototype was discussed but cancelled before project initialization.  
**Working title:** Goodlist  
**Previous placeholder name:** Goodlist  
**Product type:** Solo-first personal todo list that can expand into a private household task-sharing app.  
**Target platforms:** iOS and Android.  
**Proposed client:** React Native with Expo and TypeScript.  
**Proposed backend:** Supabase Auth, PostgreSQL, Row Level Security, Realtime, and optional Edge Functions.  
**Prepared by:** Manus AI.  

---

## 1. Product summary

Goodlist is a personal-first mobile application that begins as a simple, useful todo list for one person and gradually expands into a private household coordination space.

A new user should be able to sign up, log in, and immediately create Personal tasks without creating a family, inviting a partner, or completing household setup. When the user is ready, they can create or join a household and add a partner. Later, the household can add children through age-appropriate profiles or child accounts.

The defining product distinction is between two task types:

| Task area | Meaning |
|---|---|
| **Personal** | Tasks the user creates for themselves. These work in Solo mode and Household mode. |
| **Requested** | Tasks another household member asks the user to complete. These become available after collaboration is enabled. |

> **Product promise:** Keep your own tasks organized, and make household requests clear, visible, and easy to complete.

The product should feel warm, simple, and low-friction. It should help people coordinate responsibilities without feeling like a workplace project-management system.

---

## 2. Product evolution model

The product should grow through three stages rather than requiring a complete household during onboarding.

| Stage | User state | Available capabilities |
|---|---|---|
| **Stage 1: Solo** | One person uses the app independently. | Personal tasks, due dates, notes, completion, history, and basic filters. |
| **Stage 2: Partner collaboration** | The user creates or joins a household and adds a partner. | Personal tasks plus Requested tasks between adult household members. |
| **Stage 3: Family expansion** | The household adds children. | Child profiles or child accounts, assigned tasks, restricted permissions, and age-appropriate experiences. |

The transition from Solo mode to Household mode must not require recreating or duplicating existing Personal tasks. Existing tasks should remain available after a household is created.

---

## 3. Problem statement

People manage personal reminders and household responsibilities through memory, conversations, messaging apps, shared notes, and informal reminders. These channels make it difficult to answer basic questions:

- What exactly needs to be done?
- Who requested it?
- Who is expected to complete it?
- Is the task still open?
- Has it already been completed?

Many existing task applications are designed for individual productivity, work projects, or complex shared lists. Goodlist focuses on the smaller but common gap between a private reminder and a household request.

The application should let a person receive value alone while providing a natural path to collaboration when their situation changes.

---

## 4. Product principles

| Principle | Product implication |
|---|---|
| **Solo value first** | A user should not need a partner or family to benefit from the app. |
| **Collaboration is optional** | Household setup should be available when needed, not forced during onboarding. |
| **Fast task entry** | A title is the only required task field. |
| **Clear ownership** | Every task should make creator and assignee understandable. |
| **Private by default** | Personal tasks should be private to the owner unless the user explicitly changes the policy later. |
| **Friendly accountability** | Requested tasks should clarify responsibility without punishment, public shaming, or aggressive overdue language. |
| **Small surface area** | Advanced features should follow observed user behavior rather than assumptions. |
| **Secure household boundaries** | Users must not access data belonging to another household. |

---

## 5. Brand identity

### 5.1 Selected logo direction

The selected concept is the **Friendly Checklist** logo. It combines a checklist document, a clear completion mark, and a small green leaf accent inside a rounded navy app-icon shape. The design communicates organization, progress, and a positive everyday habit without making Goodlist look family-only.

The logo should be treated as the preferred visual identity for the current prototype and early product materials. It is suitable for the solo-first positioning because the checklist is the primary symbol; the household meaning can be introduced through the product experience rather than forced into the logo.

### 5.2 Logo system

| Element | Direction |
|---|---|
| **Primary symbol** | Rounded checklist document with green checkmark and leaf accent. |
| **Wordmark** | Goodlist wordmark beneath or beside the symbol. |
| **Primary colors** | Deep navy, fresh green, cream, and restrained gray. |
| **Tone** | Friendly, organized, trustworthy, optimistic, and approachable. |
| **Use cases** | App icon, splash screen, sign-up screen, task dashboard, website, and store listing. |
| **Avoid** | Family-only imagery, childish graphics, aggressive productivity styling, and overly corporate visuals. |

The selected source asset is:

```text
/home/ubuntu/upload/goodlist-logo-concept-1.png
```

A production-ready version should later be redrawn or exported as a clean vector asset, with separate icon-only, horizontal lockup, monochrome, dark-background, and small-size variants. The generated concept should be considered a visual direction until the final asset is prepared and trademark clearance is completed.

## 6. Target users

The primary audience is a person who wants a lightweight personal todo list and may later coordinate responsibilities with a partner or children.

Secondary audiences include couples, families, roommates, caregivers, and small household teams. The initial positioning should remain family-oriented, but the product model can support these adjacent groups.

### 5.1 User roles

| Role | Description | Core permissions |
|---|---|---|
| **Solo user** | Uses the app independently before creating a household. | Create, edit, complete, and organize Personal tasks. |
| **Household owner** | Creates the household when collaboration is needed. | Invite members and use normal task actions. |
| **Partner** | Joins as an adult household member. | Create Personal tasks and send or receive Requests. |
| **Child profile/account** | Added in a later product phase. | View and complete assigned tasks; permissions depend on the child model. |
| **Task requester** | Creates a Requested task for another member. | Edit or cancel their own request. |
| **Task assignee** | Receives a Requested task. | View and complete the request. |

The MVP should not introduce separate parent, child, guest, or administrator permission systems until the product has validated the basic solo and partner workflows.

---

## 6. Core user workflows

### 6.1 Solo onboarding

The default onboarding should be:

1. Welcome screen explaining Personal tasks.
2. Sign up or log in.
3. Optional display name setup.
4. Immediate arrival at the Personal task list.
5. Optional, non-blocking prompt to add a household later.

The user should never be forced to create a family before using the core todo list.

### 6.2 Create a Personal task

The user taps **Add task**, enters a title, and saves. Optional fields can include a note and due date. The task appears in the Personal list and can be edited, completed, or deleted.

### 6.3 Add a household later

From the Household tab or a small dashboard action, the user can choose to create a household or join one using an invite code or link. Their existing Personal tasks remain intact.

### 6.4 Add a partner

The household owner invites a partner. Once the partner joins, the app enables the Requested workflow. The user can then send a task to the partner, and the partner can send a task back.

### 6.5 Add children later

The household can eventually add children. This should be treated as a separate design and security phase. The product must decide whether children receive their own login accounts or are represented as supervised profiles under an adult account.

### 6.6 Request a task

The requester taps **Request**, selects a household member, enters a title, optionally adds a note or due date, and saves. The recipient sees the task in Requested with the requester’s name.

### 6.7 Complete a task

The task owner or assignee marks the task complete. The task moves to History and retains completion metadata such as completion time, creator, and assignee.

### 6.8 Edit or cancel a request

The requester can edit or cancel an open request. The assignee can complete the request. Declining and reassignment should be deferred until there is evidence they are necessary.

---

## 7. Recommended app structure

The recommended primary navigation has four destinations.

| Destination | Purpose |
|---|---|
| **Tasks** | Main dashboard for Personal and, after collaboration, Requested tasks. |
| **Household** | Household creation, members, invitations, and collaboration settings. |
| **History** | Completed and cancelled tasks. |
| **Settings** | Profile, notifications, account, and sign-out controls. |

In Solo mode, the Household destination should show a helpful explanation rather than an empty administrative screen. For example: “You’re using Goodlist solo. Add a partner or child later to collaborate.”

---

## 9. Wireframe direction

A low-fidelity wireframe was created for the application. The original wireframe showed six screens, and a revised solo-first version was generated.

The revised wireframe should communicate:

1. A Tasks dashboard with **Solo mode** and Personal tasks as the primary experience.
2. An Add task screen where Personal task is the default choice.
3. A Request screen that explains it becomes available after adding a household.
4. A Requested task detail screen for the later collaboration stage.
5. A Household screen showing that the user can add a partner or child later.
6. A History screen for completed and cancelled tasks.

The visual direction is intentionally low fidelity: grayscale structure, thin wireframe borders, generous whitespace, clear labels, and a restrained blue accent for primary actions and selected states.

The wireframe artifact is located at:

```text
/home/ubuntu/family-todo-wireframe-solo-first.png
```

---

## 10. MVP scope

### 9.1 Include in the first usable release

| Area | MVP scope |
|---|---|
| Authentication | Sign up, log in, log out, session restoration. |
| Solo mode | Immediate use without household creation. |
| Personal tasks | Create, edit, complete, delete, and view active tasks. |
| Task fields | Title required; note and due date optional. |
| History | View completed and cancelled tasks. |
| Household path | Create or join a household when ready. |
| Partner collaboration | Invite and add a partner. |
| Requested tasks | Send, view, complete, edit, and cancel requests. |
| Security | Server-side household and user permissions. |
| Feedback | Loading, success, error, and empty states. |

### 9.2 Defer

The following should not be required for the first release:

- Recurring chores.
- Comments and chat.
- Attachments and photos.
- Subtasks.
- Points, rewards, badges, or leaderboards.
- Complex parental controls.
- Calendar synchronization.
- Email reminders.
- Multiple household memberships.
- Advanced analytics.
- AI task generation.
- Task reassignment and decline workflows.

Child support is a later product phase and should not be rushed into the first solo or partner release.

---

## 11. Functional requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | A user can create an account and log in. | Must have |
| FR-02 | A user can use the app without creating or joining a household. | Must have |
| FR-03 | A user can create, edit, complete, and delete Personal tasks. | Must have |
| FR-04 | A user can view completed tasks in History. | Should have |
| FR-05 | A user can create a household or join with an invite code or link. | Must have |
| FR-06 | A household owner can invite a partner. | Must have |
| FR-07 | A household member can request a task from another member. | Must have |
| FR-08 | A Requested task shows its requester and assignee. | Must have |
| FR-09 | The assignee can complete a Requested task. | Must have |
| FR-10 | The requester can edit or cancel an open request. | Must have |
| FR-11 | The app displays an in-app indicator for new Requests. | Should have |
| FR-12 | The app handles loading, error, empty, and offline-like states clearly. | Must have |
| FR-13 | The household can later support child profiles or accounts. | Later |

---

## 12. Task model and business rules

Use a unified `tasks` table with an explicit origin field.

| Origin | Creator | Assignee | Availability |
|---|---|---|---|
| `personal` | Current user | Same user | Solo mode and Household mode. |
| `requested` | Household member | Another household member | Household mode only. |

Use the following statuses:

| Status | Meaning |
|---|---|
| `open` | Task remains active. |
| `completed` | Task has been completed. |
| `cancelled` | Task or request has been cancelled. |

Business rules:

- Personal tasks may have a nullable `family_id` in Solo mode.
- Personal tasks must have the same creator and assignee.
- Requested tasks must belong to a household.
- Requested tasks must have a creator and assignee who are members of the same household.
- The assignee can complete a Requested task.
- The requester can edit or cancel an open Requested task.
- Completed and cancelled tasks remain stored for History.
- Personal tasks are private to the owner by default.
- Requested tasks are visible to the creator and assignee by default.

---

## 13. Supabase data model

| Table | Important fields | Purpose |
|---|---|---|
| `profiles` | `id`, `display_name`, `avatar_url`, `created_at` | User profile data connected to Supabase Auth. |
| `families` | `id`, `name`, `invite_code`, `created_by`, `mode`, `created_at` | Optional private household container. |
| `family_members` | `family_id`, `user_id`, `profile_type`, `role`, `joined_at` | Links adult users and later child profiles to households. |
| `tasks` | `id`, `family_id`, `creator_id`, `assignee_id`, `title`, `notes`, `due_at`, `origin`, `status`, `completed_at`, `created_at`, `updated_at` | Stores Personal and Requested tasks. |
| `notifications` | `id`, `user_id`, `task_id`, `type`, `read_at`, `created_at` | Supports in-app event indicators. |

### 12.1 Solo-mode data behavior

A Solo Personal task should have:

```text
origin = personal
creator_id = current user
assignee_id = current user
family_id = null
```

A Household Personal task can optionally be associated with the active household, but it should remain visible only to its owner unless the product later introduces shared Personal tasks.

A Requested task should have:

```text
origin = requested
creator_id = requester
assignee_id = recipient
family_id = active household
```

### 12.2 Child data considerations

Child support requires a deliberate decision between two models:

| Model | Description | Key concern |
|---|---|---|
| **Child profile** | A child is represented inside the household without an independent login. | Simpler onboarding but adult-controlled interaction. |
| **Child account** | A child has an authenticated account with restricted permissions. | More flexible but requires stronger consent, privacy, and account controls. |

The first child release should likely begin with a supervised profile or highly restricted account model. It should not automatically grant child users the same capabilities as adult members.

---

## 14. Security and permissions

Supabase Row Level Security should be enabled on every application table. Access must be enforced at the database layer, not only through client-side filters.

| Operation | Solo Personal task | Household Personal task | Requested task |
|---|---|---|---|
| Read | Owner | Owner | Creator and assignee by default |
| Create | User for themselves | User for themselves | Household member for another member |
| Edit content | Owner | Owner | Creator while open |
| Complete | Owner | Owner | Assignee |
| Delete/cancel | Owner | Owner | Creator; cancellation preferred |

Security tests should include multiple users in the same household and users in separate households. A user must not be able to read, update, or infer tasks belonging to another household.

Child permissions should be designed and tested separately. The system should support restrictions such as viewing only assigned tasks, completing tasks, and preventing account or household administration.

---

## 15. React Native architecture

The proposed application uses React Native with Expo and TypeScript. A suitable project structure is:

```text
app/
  _layout.tsx
  (tabs)/
    _layout.tsx
    index.tsx              # Tasks dashboard
    household.tsx          # Household and members
    history.tsx            # Completed/cancelled tasks
    settings.tsx           # Profile and settings
  auth/
    sign-in.tsx
    sign-up.tsx
    join-household.tsx
  task/
    new.tsx
    [id].tsx
components/
  task-row.tsx
  task-folder.tsx
  member-picker.tsx
  empty-state.tsx
  loading-state.tsx
lib/
  supabase.ts
  types.ts
  queries/
  mutations/
  validation/
hooks/
  use-auth.ts
  use-household.ts
  use-tasks.ts
```

Implementation guidelines:

- Use shared TypeScript types for users, profiles, households, members, and tasks.
- Keep Supabase calls in a query and mutation layer rather than scattering them across screens.
- Use form validation for task creation and household actions.
- Use `FlatList` for task lists.
- Use safe-area-aware screen containers.
- Include loading, empty, success, and error states.
- Make the Tasks screen useful before household setup.
- Preserve existing Personal tasks during the Solo-to-Household transition.
- Use Realtime only after the base data flow is reliable.

---

## 16. Screen specifications for the first clickable prototype

The previously discussed clickable prototype was cancelled before project initialization. If restarted, the first prototype should focus on the solo flow only.

### Screen 1: Sign up

Required elements:

- App name: Goodlist.
- Email field.
- Password field.
- Confirm password field if using password authentication.
- Primary button: **Create account**.
- Link: **Already have an account? Log in**.
- Optional display-name field or setup after registration.

### Screen 2: Log in

Required elements:

- Email field.
- Password field.
- Primary button: **Log in**.
- Link: **Create an account**.
- Optional **Forgot password?** action.

### Screen 3: Solo task list

Required elements:

- Header: **Goodlist**.
- Subtitle or status: **Solo mode**.
- Primary section: **Personal**.
- Example task rows.
- Completion checkboxes.
- Empty state when no tasks exist.
- Primary action: **+ Add task**.
- Optional non-blocking action: **Add household later**.

### Screen 4: Add Personal task

Required elements:

- Title: **Add task**.
- Task title input.
- Optional note field.
- Optional due-date field.
- Primary action: **Save task**.
- Back navigation.

### Screen 5: Household invitation prompt

This can be a later prototype screen, not part of the initial solo onboarding.

Required elements:

- Explanation that the user can continue solo.
- Action: **Add a partner or child later**.
- Action to create a household.
- Action to join a household.

---

## 17. Monetization strategy

The most natural long-term business model is freemium subscription rather than advertising.

The free Solo experience should be complete enough to build trust and habit. Premium value should come from household coordination and expansion features rather than restricting basic personal task management.

| Plan | Possible capabilities |
|---|---|
| **Free Solo** | Personal tasks, notes, due dates, completion, history, and basic filters. |
| **Free or trial Household** | Basic partner collaboration and a limited number of Requests. |
| **Premium Household** | Multiple children, recurring chores, reminders, push notifications, shared visibility, advanced history, custom categories, and household settings. |
| **Optional lifetime purchase** | One-time unlock for users who prefer not to subscribe. |

Possible starting pricing hypotheses to test later:

- Approximately $3–$6 per month for Premium Household.
- Approximately $30–$50 per year for an annual plan.
- A possible lifetime purchase for early adopters.

These are test assumptions, not validated pricing decisions. Pricing should be tested only after measuring solo retention, partner invitations, and household feature usage.

The recommended monetization sequence is:

1. Launch the Solo experience.
2. Measure task creation and weekly retention.
3. Add optional household collaboration.
4. Measure how many users invite a partner.
5. Add child-focused capabilities after household usage is established.
6. Test a paid household plan around advanced collaboration features.

---

## 18. Roadmap

### Phase 1: Product foundation

Finalize the name, terminology, Solo mode behavior, household visibility rules, and partner invitation flow. Define whether the first authentication method is email/password or magic link.

### Phase 2: Solo MVP

Build authentication, session restoration, the Personal task dashboard, task creation, editing, completion, deletion, history, and clear loading and empty states. The app should feel complete at this phase without any household setup.

### Phase 3: Optional household setup

Add household creation, invite codes or links, joining, member listing, partner invitation, and seamless migration from Solo mode to Household mode.

### Phase 4: Requested tasks

Add member selection, request creation, requester metadata, assignee completion, requester editing, cancellation, in-app indicators, and security tests.

### Phase 5: Collaboration quality

Add Realtime updates, notification preferences, push notifications if justified, conflict handling, accessibility improvements, analytics, and recovery from network failures.

### Phase 6: Child expansion

Design child profiles or child accounts, parental permissions, age-appropriate task presentation, and supervised task assignment. Treat this phase as a separate product and security project.

### Phase 7: Monetization

After usage is validated, test Premium Household pricing and subscription placement. Do not paywall the basic Solo Personal task experience initially.

---

## 19. Validation plan

### 18.1 Core hypotheses

| Hypothesis | Validation signal |
|---|---|
| Solo users understand the app immediately. | New users create a Personal task without instruction. |
| The Personal experience is useful without a household. | Users return and create tasks before inviting anyone. |
| Users understand the expansion path. | Users can find Household setup without being forced through it. |
| Partner Requests reduce ambiguity. | Users can identify requester and assignee. |
| Collaboration creates additional value. | Solo users invite a partner and continue using Requests. |
| Children are a meaningful later expansion. | Families request child profiles or child-specific controls. |

### 18.2 Pilot success measures

| Measure | Interpretation |
|---|---|
| Solo users who create a first Personal task | Measures initial activation. |
| Solo users who return during the second week | Measures early personal utility. |
| Users who create or join a household | Measures collaboration demand. |
| Users who invite a partner | Measures expansion conversion. |
| Households creating at least one Requested task | Tests the collaboration feature. |
| Requested tasks completed within seven days | Measures practical usefulness. |
| Confusion around Solo mode, Household, and Requested | Identifies information architecture problems. |

---

## 20. Risks and mitigations

| Risk | Consequence | Mitigation |
|---|---|---|
| Users think the app requires a family. | Solo users abandon onboarding. | Make Solo mode the default and remove blocking household setup. |
| Household features overwhelm solo users. | The personal todo experience feels unnecessarily complex. | Hide or minimize collaboration controls until needed. |
| The Personal/Requested distinction is unclear. | Users create tasks in the wrong place. | Use plain-language descriptions and requester metadata. |
| Requests feel controlling. | Users reject the product emotionally. | Use friendly language and avoid punishment or public scoring. |
| Personal tasks become visible unintentionally. | Privacy and trust failure. | Use database-level policies and private-by-default behavior. |
| Child accounts are implemented too early. | Security and product complexity increase. | Treat child support as a later phase with a separate permission model. |
| Solo tasks are lost during household setup. | Users lose trust in the product. | Keep Personal tasks independent and test migration explicitly. |
| Notification volume becomes irritating. | Users mute or uninstall the app. | Start with in-app indicators and add configurable push later. |
| Scope expands too quickly. | Launch is delayed and product identity weakens. | Validate Solo first, then partner collaboration, then children. |

---

## 21. Open decisions

These decisions should be made before implementation begins:

| Decision | Recommended default |
|---|---|
| Is household setup required during onboarding? | No. Solo mode is the default. |
| Can users remain permanently solo? | Yes. |
| Can users join multiple households? | No for the MVP. |
| What should the collaboration area be called? | Household. |
| Who sees Personal tasks? | The owner only. |
| Who sees Requested tasks? | Creator and assignee only. |
| Can a request be declined? | Not in the MVP. |
| Can a request be reassigned? | Not in the MVP. |
| Are due dates optional? | Yes. |
| Are push notifications required at launch? | No. Begin with in-app indicators. |
| How are children represented? | Decide later between supervised profiles and restricted child accounts. |
| Should Personal tasks receive a household ID after setup? | Prefer keeping their original identity; household association can remain nullable or optional. |
| What authentication method is used first? | Choose the simplest reliable method: email/password or magic link. |

---

## 22. Definition of done for the solo-first MVP

The solo-first MVP is complete when a new user can:

1. Create an account.
2. Log in and restore their session.
3. Arrive directly at a Personal task list.
4. Create a Personal task.
5. Edit, complete, and delete the task.
6. View completed tasks in History.
7. Use the app without creating or joining a household.
8. Discover an optional Household expansion path without being interrupted.

The next release is complete when a user can additionally create or join a household, invite a partner, send a Requested task, complete it from the recipient account, and observe the updated status from the requester account.

---

## 23. Immediate next steps

The recommended order of work is:

1. Confirm Goodlist as the working product name and preserve the selected Friendly Checklist logo direction.
2. Prepare clean logo variants from the selected concept for app icon, splash screen, and wordmark use.
3. Confirm whether “Household” is the preferred collaboration label.
2. Decide email/password versus magic-link authentication.
3. Define the first three solo task examples and empty-state copy.
4. Create the Supabase schema for profiles, optional households, members, and tasks.
5. Write Row Level Security policies for Solo and Household modes.
6. Initialize the React Native project when ready.
7. Build the five-screen solo clickable prototype: Sign up, Log in, Tasks, Add task, and optional Household prompt.
8. Test the solo flow with several people before implementing partner collaboration.

The most important first vertical slice is:

> **Sign up → create a Personal task → complete it → see it in History.**

The most important second vertical slice is:

> **Create household → invite partner → send Request → partner completes it → requester sees completion.**

---

## Naming decision

**Goodlist** is now the leading working name for the application. The name is broad enough for a solo Personal todo list and does not prematurely restrict the product to families. Household collaboration can remain a feature or mode rather than defining the primary brand.

**Suggested tagline:** “A better place for your everyday tasks.”

The user has confirmed that the name appeared safe in their Play Store check. This is a useful initial signal; before launch, also check trademark conflicts, app-store conflicts in target markets, domain availability, social handles, and potential confusion with existing products.

---

## 24. Final product recommendation

Goodlist should be built as a **solo-first personal productivity app with an optional household collaboration layer**. This approach lowers the barrier to entry, lets one person receive value immediately, and creates a natural expansion path when a partner or children are added.

The product identity should remain simple: Personal tasks belong to me; Requested tasks come from someone in my household. Build and validate those two ideas in sequence, preserve user data during every expansion stage, and delay child-specific complexity until the Solo and Partner experiences are dependable.
