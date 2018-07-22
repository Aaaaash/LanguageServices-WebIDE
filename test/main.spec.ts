import { test } from 'ava';
import * as cp from 'child_process';

test('test server for main.ts', (t) => {
  t.plan(1);
  const process = cp.fork('../src/main.ts');
  if (process) {
    t.pass();
  }
});
