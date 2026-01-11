/**
 * Pact Provider Configuration
 *
 * Configures Pact for provider-side contract verification.
 * The provider (Backend) verifies the contract defined by consumers.
 */
import { Verifier, VerifierOptions } from '@pact-foundation/pact';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface PactProviderConfig {
  providerBaseUrl: string;
  pactUrls?: string[];
  pactBrokerUrl?: string;
  pactBrokerToken?: string;
  publishVerificationResult?: boolean;
  providerVersion?: string;
  providerBranch?: string;
}

export const defaultConfig: PactProviderConfig = {
  providerBaseUrl: process.env.PROVIDER_BASE_URL || 'http://localhost:3000',
  pactUrls: [path.resolve(__dirname, '../../../../../pacts/BMS-Frontend-BMS-Backend.json')],
  pactBrokerUrl: process.env.PACT_BROKER_BASE_URL,
  pactBrokerToken: process.env.PACT_BROKER_TOKEN,
  publishVerificationResult: process.env.CI === 'true',
  providerVersion: process.env.GIT_COMMIT || process.env.GITHUB_SHA || 'local',
  providerBranch: process.env.GIT_BRANCH || process.env.GITHUB_REF_NAME || 'main',
};

export function createVerifierOptions(
  config: PactProviderConfig = defaultConfig,
  stateHandlers?: Record<string, () => Promise<void>>
): VerifierOptions {
  const options: VerifierOptions = {
    provider: 'BMS-Backend',
    providerBaseUrl: config.providerBaseUrl,
    logLevel: 'warn',
    stateHandlers,
  };

  // Use Pact Broker if URL is configured
  if (config.pactBrokerUrl && config.pactBrokerToken) {
    options.pactBrokerUrl = config.pactBrokerUrl;
    options.pactBrokerToken = config.pactBrokerToken;
    options.consumerVersionSelectors = [{ mainBranch: true }, { deployedOrReleased: true }];
    options.enablePending = true;
    options.includeWipPactsSince = '2024-01-01';

    if (config.publishVerificationResult) {
      options.publishVerificationResult = true;
      options.providerVersion = config.providerVersion;
      options.providerVersionBranch = config.providerBranch;
    }
  } else {
    // Use local pact files
    options.pactUrls = config.pactUrls;
  }

  return options;
}

export async function verifyProvider(
  config?: PactProviderConfig,
  stateHandlers?: Record<string, () => Promise<void>>
): Promise<void> {
  const options = createVerifierOptions(config, stateHandlers);
  const verifier = new Verifier(options);
  await verifier.verifyProvider();
}
