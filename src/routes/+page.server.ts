import type { Actions, PageServerLoad } from './$types';
import { writeFile, mkdir, symlink, cp, appendFile, rm } from 'fs/promises';
import { existsSync } from 'fs';
import portfinder from 'portfinder';
import path from 'path';
import { exec, spawn } from 'child_process';
import util from 'util';
import { env } from '$env/dynamic/private';
import { motisInstances, startInstance } from '$lib/instances';

const execPromise = util.promisify(exec);

export const load: PageServerLoad = async () => {
  return { ports: motisInstances.keys().toArray() };
}

export const actions = {
  stop: async ({ request }) => {
    const data = await request.formData();
    const port = data.get('port');
    if (!port || typeof port != 'string' || !motisInstances.has(Number(port))) {
      console.error('Invalid port provided', data);
      return { error: 'Invalid port provided' };
    }
    const motisProcess = motisInstances.get(Number(port));
    if (motisProcess) {
      motisProcess.kill('SIGKILL');
      motisInstances.delete(Number(port));
      await rm(`${env.INSTANCE_FOLDER}/${port}`, { recursive: true, force: true });
      console.log(`Stopped and removed instance on port ${port}`);
      return { stop: true, port: Number(port) };
    } else {
      console.error(`No instance found for port ${port}`);
      return { error: `No instance found for port ${port}` };
    }
  },

  create: async ({ request }) => {
    const data = await request.formData();
    const gtfs = data.get('gtfs');
    const zone = data.get('zone');

    if (!gtfs || !(gtfs instanceof File) || !zone || typeof zone != 'string') {
      console.error('No file provided', data);
      return { error: 'No file provided' };
    }

    let port = await portfinder.getPortPromise({ port: 8080 });
    while (existsSync(`${env.INSTANCE_FOLDER}/${port}`)) {
      port = await portfinder.getPortPromise({ port: port + 1 });
    }

    const templateFolder = path.normalize(`${env.MOTIS_FOLDER}/${zone}`);
    const instanceFolder = `${env.INSTANCE_FOLDER}/${port}`;

    await rm(instanceFolder, { recursive: true, force: true });
    await mkdir(`${instanceFolder}/data`, { recursive: true });
    await cp(`${templateFolder}/config.yml`, `${instanceFolder}/config.yml`);
    await appendFile(`${instanceFolder}/config.yml`, `
  port: ${port}
timetable:
  datasets:
    ${zone}:
      path: ${instanceFolder}/gtfs.zip
`);
    await writeFile(`${instanceFolder}/gtfs.zip`, gtfs.stream());

    await cp(`${templateFolder}/data/meta`, `${instanceFolder}/data/meta`, { recursive: true });
    rm(`${instanceFolder}/data/meta/adr_extend.json`, { force: true });

    const adrFiles = [
      "inner_rings_data.bin",
      "inner_rings_idx_0.bin",
      "inner_rings_idx_1.bin",
      "inner_rings_idx_2.bin",
      "outer_rings_data.bin",
      "outer_rings_idx_0.bin",
      "outer_rings_idx_1.bin",
      "rtree_data.bin",
      "rtree_meta.bin",
      "street_segments_data.bin",
      "street_segments_idx_0.bin",
      "street_segments_idx_1.bin",
      "t.bin"
    ];
    await mkdir(`${instanceFolder}/data/adr`, { recursive: true });
    adrFiles.forEach(async (file) => {
      const srcPath = path.join(templateFolder, 'data', 'adr', file);
      const destPath = path.join(instanceFolder, 'data', 'adr', file);
      await symlink(srcPath, destPath, 'file');
    });

    await symlink(`${templateFolder}/data/osr`, `${instanceFolder}/data/osr`, 'dir');
    await symlink(`${templateFolder}/data/tiles`, `${instanceFolder}/data/tiles`, 'dir');

    await execPromise(`${env.MOTIS_FOLDER}/motis/motis import -c ${instanceFolder}/config.yml -d ${instanceFolder}/data`);

    startInstance(port);

    return { success: true, port }
  }
} satisfies Actions;