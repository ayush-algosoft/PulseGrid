import { ScenarioSchema } from '@pulsegrid/schemas';
import { z } from 'zod';

const ConfigSchema = z.object({
  mode: z.enum(['standalone', 'kafka']).default('standalone'),
  wsPort: z.coerce.number().int().positive().default(4001),
  metricsPort: z.coerce.number().int().positive().default(9101),
  kafkaBrokers: z.string().default('localhost:19092'),
  seed: z.coerce.number().int().default(42),
  scenario: ScenarioSchema.default('showcase'),
  tickMs: z.coerce.number().int().positive().default(250),
});

export type GatewayConfig = z.infer<typeof ConfigSchema>;

export function loadConfig(): GatewayConfig {
  return ConfigSchema.parse({
    mode: process.env.GATEWAY_MODE,
    wsPort: process.env.GATEWAY_WS_PORT,
    metricsPort: process.env.METRICS_PORT,
    kafkaBrokers: process.env.KAFKA_BROKERS,
    seed: process.env.SIM_SEED,
    scenario: process.env.SIM_SCENARIO,
    tickMs: process.env.SIM_TICK_MS,
  });
}
