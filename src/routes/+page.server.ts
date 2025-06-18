import type { Actions, PageServerLoad } from './$types';
import { writeFile, mkdir, symlink, cp, appendFile, rm } from 'fs/promises';
import { existsSync } from 'fs';
import portfinder from 'portfinder';
import path from 'path';
import { exec, spawn } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { motisInstances } from '$lib/instances';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


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
      await rm(`./instances/${port}`, { recursive: true, force: true });
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
    while (existsSync(`./instances/${port}`)) {
      port = await portfinder.getPortPromise({ port: port + 1 });
    }

    const templateFolder = path.normalize(`${__dirname}/../../motis/${zone}`);
    const instanceFolder = `./instances/${port}`;

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
    await symlink(`${templateFolder}/data/adr`, `${instanceFolder}/data/adr`, 'dir');
    await symlink(`${templateFolder}/data/osr`, `${instanceFolder}/data/osr`, 'dir');
    await symlink(`${templateFolder}/data/tiles`, `${instanceFolder}/data/tiles`, 'dir');

    await execPromise(`./motis/motis/motis import -c ${instanceFolder}/config.yml -d ${instanceFolder}/data`);

    const motisProcess = spawn('./motis/motis/motis', ['server', '-d', `${instanceFolder}/data`]);
    motisProcess.stdout.on('data', (data) => {
      console.log(`stdout[${port}]: ${data}`);
    });
    motisProcess.stderr.on('data', (data) => {
      console.log(`stderr[${port}]: ${data}`);
    });
    motisInstances.set(port, motisProcess);

    return { success: true, port }
  }
} satisfies Actions;