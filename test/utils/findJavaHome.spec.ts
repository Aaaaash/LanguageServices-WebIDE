import { test } from 'ava';

import findJavaHome from '../../src/utils/findJavaHome';

test('should be return java_home', async (t) => {
  t.plan(1);
  const javahome = await findJavaHome();
  if ((<string>javahome).indexOf('/bin/java') !== -1) {
    t.pass();
  }
});
