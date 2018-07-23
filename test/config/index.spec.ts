import { test } from 'ava';

import { serverBaseUri, temporaryData } from '../../src/config';

test('shouold be return base uri', (t) => {
  t.plan(2);
  process.env.NODE_ENV = 'dev';
  const devUri = serverBaseUri('dev_language_serevr');
  t.is(devUri, '/Users/sakura/lsp/node-lsp-tcp/dev_language_serevr');

  process.env.NODE_ENV = 'prod';
  const prodUri = serverBaseUri('prod_language_server');
  t.is(prodUri, '/data/coding-ide-home/node-lsp-tcp/prod_language_server');
});

test('should be return temporary data path', (t) => {
  t.plan(2);

  const spaceKey = 'qwerty';

  process.env.NODE_ENV = 'dev';
  t.is(temporaryData(spaceKey), `/Users/sakura/lsp/lsp-workspace/${spaceKey}`);

  process.env.NODE_ENV = 'prod';
  t.is(temporaryData(spaceKey), `/data/coding-ide-home/lsp-workspace/${spaceKey}`);
});
