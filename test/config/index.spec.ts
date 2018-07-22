import { test } from 'ava';

import { BASE_URI } from '../../src/config';

test('shouold be return base uri', (t) => {
  t.plan(2);
  process.env.NODE_ENV = 'dev';
  const devUri = BASE_URI('dev_language_serevr');
  t.is(devUri, '/Users/sakura/lsp/node-lsp-tcp/dev_language_serevr');

  process.env.NODE_ENV = 'prod';
  const prodUri = BASE_URI('prod_language_server');
  t.is(prodUri, '/data/coding-ide-home/node-lsp-tcp/prod_language_server');
});
