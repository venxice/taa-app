import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertActiveAccount, assertCurrentSession } from './auth.rules';

test('only verified accounts have active access sessions', () => {
  assert.doesNotThrow(() => assertActiveAccount('verified'));
  for (const status of ['pending', 'rejected', 'suspended', 'disabled']) {
    assert.throws(() => assertActiveAccount(status), /not active/);
  }
});

test('token version changes revoke access and refresh sessions', () => {
  assert.doesNotThrow(() => assertCurrentSession(4, 4));
  assert.throws(() => assertCurrentSession(3, 4), /Session expired/);
  assert.throws(() => assertCurrentSession(undefined, 0), /Session expired/);
});
