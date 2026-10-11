import {access, mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {idSchema} from '../../../packages/contracts/src/project';
import type {AssetStorage} from '../application/ports';
export class LocalStorage implements AssetStorage {
  constructor(public readonly root: string) {}
  path(key: string): string {return join(this.root, idSchema.parse(key));}
  async init(): Promise<void> {await mkdir(this.root, {recursive: true});}
  async exists(key: string): Promise<boolean> {try {await access(this.path(key)); return true;} catch {return false;}}
}
