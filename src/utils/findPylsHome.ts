import * as cp from 'child_process';
import { trim } from 'lodash';

function findPylsHome(): Promise<string> {
  return new Promise((resolve, reject) => {
    cp.exec('which pyls', (err, stdout, stderr) => {
      if (err) {
        reject(err);
      }
      resolve(trim(stdout));
    });
  });
}

export default findPylsHome;
