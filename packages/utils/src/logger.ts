import pino, { type Logger } from 'pino';

const isProd = process.env.NODE_ENV === 'production';

/**
 * Create a structured logger bound to a service name. In development the output
 * is pretty-printed; in production it is line-delimited JSON ready for shipping
 * to a log aggregator.
 */
export function createLogger(service: string): Logger {
  const options: pino.LoggerOptions = {
    name: service,
    level: process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug'),
    base: { service },
  };
  if (!isProd) {
    options.transport = {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss.l', ignore: 'pid,hostname' },
    };
  }
  return pino(options);
}

export type { Logger };
