import { createServer } from 'node:http';

import { createLogger } from '@pulsegrid/utils';

import { loadConfig } from './config.js';
import { MarketState } from './market-state.js';
import { registry } from './metrics.js';
import { GatewayServer } from './server.js';
import { KafkaSource } from './sources/kafka.js';
import { type MarketSource } from './sources/source.js';
import { StandaloneSource } from './sources/standalone.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const logger = createLogger('gateway');
  logger.info({ mode: config.mode, scenario: config.scenario }, 'starting gateway');

  let source: MarketSource;
  if (config.mode === 'kafka') {
    source = new KafkaSource(logger, {
      brokers: config.kafkaBrokers,
      scenario: config.scenario,
      tickMs: config.tickMs,
      seed: config.seed,
    });
  } else {
    source = new StandaloneSource(logger, {
      seed: config.seed,
      scenario: config.scenario,
      tickMs: config.tickMs,
    });
  }

  const state = new MarketState(source.getAssets(), source.getStatus());
  if (source instanceof StandaloneSource) {
    // Warm the engine + cache so the very first client snapshot is fully alive.
    source.warmup(state, 320);
  }

  const server = new GatewayServer(logger, state, source, config.wsPort);
  server.start();
  await source.start();

  // Prometheus scrape endpoint on a dedicated port.
  const metricsServer = createServer(async (req, res) => {
    if (req.url === '/metrics') {
      res.writeHead(200, { 'content-type': registry.contentType });
      res.end(await registry.metrics());
      return;
    }
    res.writeHead(404);
    res.end();
  });
  metricsServer.listen(config.metricsPort, () => {
    logger.info({ port: config.metricsPort }, 'metrics endpoint listening');
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'shutting down');
    await source.stop();
    await server.stop();
    metricsServer.close();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('gateway failed to start', err);
  process.exit(1);
});
