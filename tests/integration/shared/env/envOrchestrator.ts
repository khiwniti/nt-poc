import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

export interface EnvTemplate {
  service: string;
  entries: Record<string, string>;
}

export interface EnvMaterializationResult {
  runId: string;
  files: Record<string, string>;
}

export class EnvOrchestrator {
  constructor(private readonly baseDir = join(tmpdir(), 'bms-integration-envs')) {}

  async materialize(templates: EnvTemplate[]): Promise<EnvMaterializationResult> {
    const runId = randomUUID();
    const runDir = join(this.baseDir, runId);
    await fs.mkdir(runDir, { recursive: true });

    const files: Record<string, string> = {};
    for (const template of templates) {
      const filePath = join(runDir, `${template.service}.env.integration`);
      const content = Object.entries(template.entries)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
      await fs.writeFile(filePath, `${content}\n`, 'utf8');
      files[template.service] = filePath;
    }

    return { runId, files };
  }
}
