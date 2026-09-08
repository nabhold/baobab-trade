# CI/CD and production conformance

Gate 17 makes release readiness machine-testable. `conformance/production-controls.json` is the auditable control inventory; tests prove the declared runtime, architecture constraints, documentation and workflow coverage have not drifted.

Pull requests must pass formatting, lint, type-checking, unit/contract/isolation/security/conformance tests, build, fresh-database migration and Gates 1–13 integration, production-provider migration, CodeQL, action pinning, dependency/secret/container scanning and the release-readiness build. Deployment remains owned by `nabhold/infrastructure`; this repository produces a verified release candidate and does not embed cloud credentials or topology.

Failures block promotion. Bypassing a failed conformance check requires an explicit, reviewed change to the control inventory or workflow—not a retry until the lights happen to turn green.
