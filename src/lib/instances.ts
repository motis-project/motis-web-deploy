import { env } from "$env/dynamic/private";
import { spawn } from "child_process";

export const motisInstances = new Map<number, ReturnType<typeof spawn>>();

export const startInstance = async (port: number) => {
  const startProcess = () => {
    const motisProcess = spawn(`${env.MOTIS_FOLDER}/motis/motis`, ['server', '-d', `${env.INSTANCE_FOLDER}/${port}/data`]);
    motisProcess.stdout.on('data', (data) => {
      console.log(`stdout[${port}]: ${data}`);
    });
    motisProcess.stderr.on('data', (data) => {
      console.log(`stderr[${port}]: ${data}`);
    });
    motisProcess.on('exit', (code, signal) => {
      // Only restart if the port still exists in the map (was not removed intentionally)
      if (motisInstances.has(port)) {
        console.warn(`motis instance on port ${port} exited with code ${code}, signal ${signal}. Restarting...`);
        setTimeout(startProcess, 1000); // restart after 1s
      } else {
        console.log(`motis instance on port ${port} exited and will not be restarted (was removed intentionally).`);
      }
    });
    motisInstances.set(port, motisProcess);
  };
  startProcess();
}