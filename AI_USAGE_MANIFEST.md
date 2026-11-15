# AI Usage Manifest

## Purpose

This manifest records AI assistance used during the audit and remediation of
the integrated Django backend and React frontend.

## Scope

The audited areas are:

- `nasa_api`
- `src`
- dependency and build configuration
- frontend/backend API contracts

Visual design, layout, styling, and scientific data values are outside the
requested change scope.

## AI-assisted activities

- Inspected backend views, services, settings, URLs, frontend services,
  components, types, and build configuration.
- Checked API validation, error handling, data contracts, and technical
  terminology.
- Proposed and applied focused correctness and reliability fixes.
- Added or updated regression tests where behavior required protection.
- Ran Django checks, endpoint smoke tests, TypeScript checks, lint, and
  production builds.

## Human review requirements

Human review remains required for scientific interpretation, external data
provenance, deployment configuration, security approval, and product decisions.
This audit does not replace peer review or acceptance testing.

## Verification record

The audit corrected backend configuration safety, PostgreSQL environment
selection, removal of fabricated disaster generation, scientific catalog
contract behavior, stale frontend status text, and technical comments. It
added regression coverage in `nasa_api/test_catalog.py`.

Commands executed successfully:

- `python manage.py check`
- Django catalog and endpoint smoke tests
- `python -m unittest nasa_api.test_catalog -v`
- `corepack pnpm typecheck`
- `corepack pnpm lint`
- `corepack pnpm build`
- `git diff --check`

Known limits remain: scientific interpretation, external catalog provenance,
deployment secrets, and production acceptance require human review. Both
Windows-local checks and Docker Compose (`Docker version 29.9.3, build 5457199`,
`Docker Compose version v5.7.0`) deployment checks passed, including container
build, PostgreSQL migrations, Redis health checks, read-only catalog volume
mounting (`/pipeline_data/data/processed/hazard_catalog.parquet`), and HTTP
endpoint smoke tests for `/api/catalog/status/` and `/api/predictions/`.
