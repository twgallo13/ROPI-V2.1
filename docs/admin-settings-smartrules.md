# Admin Settings: SmartRules & AITemplate Backend

**Prompt-Version:** Lisa v0.2.0-rc2

## Overview

This document describes the backend implementation for SmartRules and AITemplate CRUD operations.

## Firestore Paths

| Entity | Collection Path |
|--------|-----------------|
| SmartRules | `settings/smartRules/keys/{ruleId}` |
| AITemplates | `settings/aiTemplates/keys/{templateKey}` |

## API Endpoints

### SmartRules

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/settings/smartrules` | List all smart rules |
| GET | `/admin/settings/smartrules/:ruleId` | Get single rule |
| POST | `/admin/settings/smartrules` | Create new rule |
| PUT | `/admin/settings/smartrules/:ruleId` | Update rule |
| DELETE | `/admin/settings/smartrules/:ruleId` | Delete rule |

### AITemplates

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/settings/aitemplates` | List all templates |
| GET | `/admin/settings/aitemplates/:templateKey` | Get single template |
| POST | `/admin/settings/aitemplates` | Create new template |
| PUT | `/admin/settings/aitemplates/:templateKey` | Update template |
| DELETE | `/admin/settings/aitemplates/:templateKey` | Delete template |

## Schema Validation

All entities are validated using Zod schemas from `@ropi-aoss/sdk`:
- `SmartRuleSchema` — validates smart rule structure
- `AITemplateSchema` — validates AI template structure

## Implementation Status

- [x] Service stubs created
- [x] Endpoint handlers scaffolded
- [x] Test stubs created
- [ ] Full service implementation (TODO)
- [ ] Firestore rules for smartRules and aiTemplates
- [ ] Integration tests with emulator

## Notion Build Progress Log

See: [ROPI AOSS Build Progress Log](https://www.notion.so/ROPI-AOSS-Build-Progress-Log)

## Related PRs

- PR #218: Attributes persistence & API (Lisa v0.2.0)
- PR #XXX: SmartRules & AITemplate persistence (this PR)
