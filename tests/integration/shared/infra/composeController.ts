import { spawn } from 'node:child_process';
import { once } from 'node:events';

export type ComposeProfile = 'core' | 'full-stack' | 'ml-suite' | 'resilience' | 'observability';

export interface ComposeOptions {
  profile?: ComposeProfile;
  composeFiles?: string[];
  env?: NodeJS.ProcessEnv;
}

const DEFAULT_FILES = ['docker-compose.yml', 'docker-compose.integration.yml'];

export class ComposeController {
  private readonly profile: ComposeProfile;
  private readonly composeFiles: string[];
  private readonly env: NodeJS.ProcessEnv;

  constructor({ profile = 'core', composeFiles = DEFAULT_FILES, env = process.env }: ComposeOptions = {}) {
    this.profile = profile;
    this.composeFiles = composeFiles;
    this.env = env;
  }

  async up(wait = true): Promise<void> {
    const args = this.buildArgs(['up', '-d', ...(wait ? ['--wait'] : [])]);
    await this.exec(args);
  }

  async down(removeVolumes = false): Promise<void> {
    const args = this.buildArgs(['down', ...(removeVolumes ? ['-v'] : [])]);
    await this.exec(args);
  }

  async logs(service?: string): Promise<string> {
    const args = this.buildArgs(['logs', ...(service ? [service] : [])]);
    return this.exec(args, { collectStdout: true });
  }

  async restart(service: string): Promise<void> {
    const args = this.buildArgs(['restart', service]);
    await this.exec(args);
  }

  private buildArgs(command: string[]): string[] {
    const args = ['compose'];
    for (const file of this.composeFiles) {
      args.push('-f', file);
    }

    args.push('--profile', this.profile, ...command);
    return args;
  }

  private async exec(args: string[], { collectStdout = false }: { collectStdout?: boolean } = {}): Promise<string> {
    const child = spawn('docker', args, {
      env: this.env,
      stdio: collectStdout ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    });

    let output = '';
    if (collectStdout && child.stdout) {
      child.stdout.on('data', (chunk) => {
        output += chunk.toString();
      });
    }

    const [code] = (await once(child, 'exit')) as [number | null];
    if (code && code !== 0) {
      throw new Error(`docker compose exited with code ${code ?? -1}`);
    }

    return output;
  }
}
