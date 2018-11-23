import * as cp from 'child_process';
import { trim } from 'lodash';

function findMonoHome(): Promise<string> {
  return new Promise((resolve, reject) => {
    cp.exec('which mono', (err, stdout, stderr) => {
      if (err) {
        reject(err);
      }
      resolve(trim(stdout));
    });
  });
}

export default findMonoHome;
