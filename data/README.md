# FoundersHub — Data & Database Schema Documentation

This directory documents the data schemas, seed entities, and relational structures used across the FoundersHub ecosystem.

## Primary Entities (MongoDB Collections)

### 1. `users`
- **Fields**: `name`, `email`, `passwordHash`, `role` (`FOUNDER`, `DEVELOPER`, `INVESTOR`), `avatarUrl`, `timestamps`
- **Description**: Central user authentication and profile record.

### 2. `startups`
- **Fields**: `founderId`, `name`, `tagline`, `description`, `industry`, `stage`, `website`, `readinessScore`, `status`
- **Description**: Ventures founded on the platform with 3-point AI validation readiness scores.

### 3. `departments`
- **Fields**: `startupId`, `name` (Engineering, Product, Growth, Finance, Legal, Marketing, Design, Operations), `status`
- **Description**: 8 modular business units orchestrating sprint deliverables.

### 4. `tasks`
- **Fields**: `startupId`, `departmentId`, `title`, `description`, `assigneeId`, `status` (`BACKLOG`, `TODO`, `IN_PROGRESS`, `DONE`), `points`, `dueDate`
- **Description**: Kanban deliverables driving dynamic equity vests.

### 5. `developerprofiles`
- **Fields**: `userId`, `skills`, `bio`, `githubUrl`, `portfolioUrl`, `resumeUrl`, `availability`, `executionScore`, `badges`
- **Description**: Builder profile with resume storage and verified execution score.

### 6. `joinrequests`
- **Fields**: `developerId`, `startupId`, `departmentId`, `status` (`PENDING`, `ACCEPTED`, `REJECTED`), `message`, `resumeUrl`
- **Description**: Formal builder applications to join a startup's department.

### 7. `financialtransactions`
- **Fields**: `startupId`, `type` (`INCOME`, `EXPENSE`, `INVESTMENT`), `amount`, `category`, `description`, `date`
- **Description**: Ledger entries powering startup burn rate and runway calculations.

### 8. `fundinginterests`
- **Fields**: `startupId`, `investorId`, `amount`, `status`, `message`, `platformFee`, `createdAt`
- **Description**: Investor capital commitments post-sprint completion.
