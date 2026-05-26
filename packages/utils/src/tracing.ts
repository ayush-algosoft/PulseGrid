import { randomBytes } from 'node:crypto';

import type { Logger } from 'pino';

/**
 * Minimal, dependency-light tracing helper shaped like an OpenTelemetry span.
 * It emits structured start/end logs carrying a trace id and duration, which is
 * enough to correlate work across services in the logs. The shape intentionally
 * mirrors OTel so it can be swapped for a real exporter without touching call
 * sites.
 */
export interface Span {
  traceId: string;
  end(attrs?: Record<string, unknown>): void;
}

function traceId(): string {
  return randomBytes(8).toString('hex');
}

export function startSpan(logger: Logger, name: string, attrs: Record<string, unknown> = {}): Span {
  const id = traceId();
  const start = performance.now();
  logger.debug({ span: name, traceId: id, ...attrs, event: 'span.start' });
  return {
    traceId: id,
    end(endAttrs = {}) {
      const durationMs = Number((performance.now() - start).toFixed(2));
      logger.debug({ span: name, traceId: id, durationMs, ...endAttrs, event: 'span.end' });
    },
  };
}
