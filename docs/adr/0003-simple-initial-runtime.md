# ADR 0003: Start With a Simple Container Runtime

## Status

Accepted

## Decision

The initial development and deployment foundation uses Docker, Docker Compose, PostgreSQL, Redis and HTTP/webhook/event-based integration.

## Consequences

- Local development works in Codespaces and independently with Docker Compose.
- Operational complexity is kept low.
- Kubernetes, Kafka, service meshes and OpenSearch are deferred until demonstrated requirements exist.
