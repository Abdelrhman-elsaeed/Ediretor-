import {defineConfig} from 'vitest/config';
export default defineConfig({test: {include: ['packages/**/*.test.ts', 'experiments/**/*.test.ts'], maxWorkers: 2}});
