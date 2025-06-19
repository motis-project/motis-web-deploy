import { env } from "$env/dynamic/private";
import { spawn } from "child_process";

export const motisInstances = new Map<number, ReturnType<typeof spawn>>();

export const startInstance = async (port: number) => {
  const motisProcess = spawn(`${env.MOTIS_FOLDER}/motis/motis`, ['server', '-d', `${env.INSTANCE_FOLDER}/${port}/data`]);
  motisProcess.stdout.on('data', (data) => {
    console.log(`stdout[${port}]: ${data}`);
  });
  motisProcess.stderr.on('data', (data) => {
    console.log(`stderr[${port}]: ${data}`);
  });
  motisInstances.set(port, motisProcess);
}