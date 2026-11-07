# GreenLoop (Nexterra) – Workspace Guidelines & Agent Permissions

## 1. Workspace Scope & Authorization
- **Workspace Root**: `C:\Users\GOKUL KRISHNA\Desktop\Nexterra`
- **Authorized Scope**: Full read, write, edit, search, and development execution access across all project files, source code, Edge Functions, tests, and configurations within this directory.
- **Autonomous Execution**:
  - The agent is pre-authorized to read, inspect, search, create, and edit files in this workspace without requesting redundant per-file approval.
  - Development lifecycle operations (running TypeScript builds, Vitest unit tests, linters, dependency management, and standard Git branch actions) are pre-authorized to run inside the standard workspace sandbox.

## 2. Core Operational Principles
1. **Zero Unnecessary Prompts**: Proceed directly with code analysis, editing, building, and testing required to complete approved user tasks.
2. **Preserve Functionality**: Preserve existing architecture (React + Vite + TypeScript, Supabase backend, Tailwind CSS, Google Stitch design system).
3. **Preserve Documentation Integrity**: Preserve comments, docstrings, and established type definitions unless an update is explicitly requested.

## 3. Strict Security Boundaries
- **Secrets Protection**:
  - NEVER expose, print, or log API keys, access tokens, service role keys, or database credentials.
  - NEVER output the raw contents of `.env`, `.env.local`, or Supabase secrets.
- **Non-Destructive Guarantee**:
  - NEVER drop database tables, delete production records, or reset schemas without explicit written confirmation.
  - NEVER execute destructive system-level commands (e.g. indiscriminate directory deletion, disk-level operations).
- **Workspace Confinement**:
  - All file creation and edits must remain strictly within `C:\Users\GOKUL KRISHNA\Desktop\Nexterra`.
  - Do not modify files outside the workspace directory without explicit instruction.
- **Confirmation Requirements**:
  - Explicit user confirmation is required before:
    1. Performing irreversible or destructive data deletions.
    2. Overwriting or resetting remote Git repositories.
    3. Performing production database schema drops or data purges.
