# ADR 0006: Production Deployment Belongs to Nabhold Infrastructure

## Status

Accepted

## Decision

Baobab Trade owns its image, local development Compose model, health endpoints and runtime requirement declaration. `nabhold/infrastructure` owns production infrastructure, secret injection, environment topology and deployment orchestration.

## Consequences

- Application and infrastructure lifecycle remain independently governed.
- Trade contains no AWS account IDs, production domains or cloud credentials.
- `runtime/requirements.yaml` becomes the explicit hand-off interface.
- Local Docker Compose is not a production deployment specification.
