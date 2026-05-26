import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from 'prom-client';

/** Prometheus registry and metrics for the gateway. Scraped on METRICS_PORT. */
export const registry = new Registry();
collectDefaultMetrics({ register: registry, prefix: 'gateway_' });

export const activeConnections = new Gauge({
  name: 'gateway_active_connections',
  help: 'Number of currently connected WebSocket clients',
  registers: [registry],
});

export const eventsIngested = new Counter({
  name: 'gateway_events_ingested_total',
  help: 'Total market events ingested into gateway state',
  labelNames: ['type'] as const,
  registers: [registry],
});

export const framesSent = new Counter({
  name: 'gateway_frames_sent_total',
  help: 'Total WebSocket frames pushed to clients',
  registers: [registry],
});

export const messagesSent = new Counter({
  name: 'gateway_messages_sent_total',
  help: 'Total individual server messages delivered (a frame may batch many)',
  registers: [registry],
});

export const framesDropped = new Counter({
  name: 'gateway_frames_dropped_total',
  help: 'High-frequency messages coalesced away under backpressure (latest-wins)',
  labelNames: ['channel'] as const,
  registers: [registry],
});

export const broadcastDuration = new Histogram({
  name: 'gateway_broadcast_duration_ms',
  help: 'Time spent fanning out a batch of events to all clients',
  buckets: [0.5, 1, 2, 5, 10, 25, 50, 100],
  registers: [registry],
});

export const kafkaConnected = new Gauge({
  name: 'gateway_kafka_connected',
  help: '1 when the Kafka source is connected, 0 otherwise',
  registers: [registry],
});
