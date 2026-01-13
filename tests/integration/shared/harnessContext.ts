import type { EnvTemplate, EnvMaterializationResult } from './env/envOrchestrator';
import { EnvOrchestrator } from './env/envOrchestrator';
import { ComposeController, type ComposeProfile } from './infra/composeController';

export interface HarnessOptions {
  profile?: ComposeProfile;
  envTemplates?: EnvTemplate[];
}

export class HarnessContext {
  private composed = false;
  private readonly compose: ComposeController;
  private readonly envOrchestrator = new EnvOrchestrator();
  private envFiles?: EnvMaterializationResult;

  constructor(private readonly options: HarnessOptions = {}) {
    this.compose = new ComposeController({ profile: options.profile });
  }

  async up(): Promise<void> {
    if (this.composed) {
      return;
    }

    if (this.options.envTemplates?.length) {
      this.envFiles = await this.envOrchestrator.materialize(this.options.envTemplates);
      process.env.HARNESS_ENV_FILES = JSON.stringify(this.envFiles.files);
      process.env.HARNESS_RUN_ID = this.envFiles.runId;
    }

    await this.compose.up(true);
    this.composed = true;
  }

  async down(): Promise<void> {
    if (!this.composed) {
      return;
    }

    await this.compose.down(true);
    this.composed = false;
  }

  async logs(service?: string): Promise<string> {
    return this.compose.logs(service);
  }
}
