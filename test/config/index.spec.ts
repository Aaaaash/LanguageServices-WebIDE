import { test } from 'ava';

import { serverBaseUri, temporaryData } from '../../src/config';

test('shouold be return base uri', (t) => {
  t.plan(1);
  const uri = serverBaseUri('dev_language_serevr');
  t.regex(uri, /[a-zA-z]+[^\s]*/);
});

test('should be return temporary data path', (t) => {
  t.plan(2);

  const spaceKey = 'qwerty';

  process.env.NODE_ENV = 'dev';
  t.is(temporaryData(spaceKey), `/Users/sakura/lsp/lsp-workspace/${spaceKey}`);

  process.env.NODE_ENV = 'prod';
  t.is(temporaryData(spaceKey), `/data/coding-ide-home/lsp-workspace/${spaceKey}`);
});
