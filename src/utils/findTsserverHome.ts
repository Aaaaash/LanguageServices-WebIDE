import * as cp from 'child_process';
import { trim } from 'lodash';

function findTsserverHome(): Promise<string> {
  return new Promise((resolve, reject) => {
    cp.exec('which tsserver', (err, stdout, stderr) => {
      if (err) {
        reject(err);
      }
      resolve(trim(stdout));
    });
  });
}

export default findTsserverHome;
