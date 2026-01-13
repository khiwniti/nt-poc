import { beforeAll, afterAll } from 'vitest';
import { HarnessContext } from '../shared/harnessContext';

const ctx = new HarnessContext({ profile: 'core' });

beforeAll(async () => {
  await ctx.up();
});

afterAll(async () => {
  await ctx.down();
});
