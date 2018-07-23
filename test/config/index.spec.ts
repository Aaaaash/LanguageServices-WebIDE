import { test } from 'ava';

import { serverBaseUri, temporaryData } from '../../src/config';

test('shouold be return base uri', (t) => {
  t.plan(1);
  if (process.env.NODE_ENV === 'dev') {
    const devUri = serverBaseUri('dev_language_serevr');
    t.is(devUri, '/Users/sakura/lsp/LanguageServices-WebIDE/dev_language_serevr');
  } else {
    const devUri = serverBaseUri('dev_language_serevr');
    t.is(devUri, '/data/coding-ide-home/LanguageServices-WebIDE/dev_language_serevr');
  }
});

test('should be return temporary data path', (t) => {
  t.plan(2);

  const spaceKey = 'qwerty';

  process.env.NODE_ENV = 'dev';
  t.is(temporaryData(spaceKey), `/Users/sakura/lsp/lsp-workspace/${spaceKey}`);

  process.env.NODE_ENV = 'prod';
  t.is(temporaryData(spaceKey), `/data/coding-ide-home/lsp-workspace/${spaceKey}`);
});
