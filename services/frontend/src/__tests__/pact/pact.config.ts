/**
 * Pact Consumer Configuration
 *
 * Configures Pact for consumer-side contract testing.
 * The consumer (Frontend) defines the contract expectations.
 */
import { PactV4, SpecificationVersion } from '@pact-foundation/pact';
import * as path from 'path';
import { fileURLToPath } from 'url';

// @ts-expect-error import.meta works in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const pactConfig = {
  consumer: 'BMS-Frontend',
  provider: 'BMS-Backend',
  pactDir: path.resolve(__dirname, '../../../../../pacts'),
  spec: SpecificationVersion.SPECIFICATION_VERSION_V4,
};

export function createPact(): PactV4 {
  return new PactV4({
    consumer: pactConfig.consumer,
    provider: pactConfig.provider,
    dir: pactConfig.pactDir,
    spec: pactConfig.spec,
    logLevel: 'warn',
  });
}
