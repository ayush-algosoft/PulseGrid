# ADR 0001 — Redpanda over Apache Kafka for local streaming

- **Status:** Accepted
- **Date:** 2026-05-27

## Context

The platform is event-driven and must run end-to-end from a single
`docker compose up` on a developer laptop. Apache Kafka requires a JVM and
(historically) ZooKeeper or KRaft configuration, and is heavy to start.

## Decision

Use **Redpanda** as the Kafka-compatible broker. It speaks the Kafka protocol
(so `kafkajs` is unchanged), is a single native binary, starts in seconds, and
runs comfortably in one container with `--smp 1 --memory 1G`.

## Consequences

- Fast, low-footprint local boot; no ZooKeeper/KRaft ceremony.
- The client code (`kafkajs`) is identical to a real Kafka deployment, so
  swapping in managed Kafka later is a config change, not a code change.
- We rely on `rpk` (Redpanda's CLI) for the one-shot topic creation step.
