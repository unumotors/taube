/* eslint-disable max-len */
/* eslint-disable global-require */
import test from 'ava'

import { escape } from '../lib/helpers/converter.js'

test('converter works as expected', (t) => {
  t.is(escape('test - test - test %&!"(/§&!/(?`!"§4'), 'test---test---test-%25%26%21%22%28/%A7%26%21/%28%3F%60%21%22%A74')
})
