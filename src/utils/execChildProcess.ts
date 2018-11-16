import * as cp from 'child_process';

export default function execChildProcess(
  process: string,
  workingDirectory: string,
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    cp.exec(
      process,
      { cwd: workingDirectory, maxBuffer: 500 * 1024 },
      (error: Error, stdout: string, stderr: string) => {
        if (error) {
          reject(error);
          return;
        }

        if (stderr && stderr.length > 0) {
          reject(new Error(stderr));
          return;
        }
        resolve(stdout);
      },
    );
  });
}
