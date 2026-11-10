import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CONTACT_SAVED_EVENT,
  isRecordedContactSuccess,
  reportContactLead,
} from '../lib/contact-analytics';

test('only genuinely stored successful contact messages become lead events', () => {
  assert.equal(CONTACT_SAVED_EVENT, 'portfolio:contact-saved');
  assert.equal(isRecordedContactSuccess({ ok: true, stored: true }), true);
  assert.equal(isRecordedContactSuccess({ ok: true }), false); // honeypot decoy
  assert.equal(isRecordedContactSuccess({ ok: true, stored: false }), false);
  assert.equal(isRecordedContactSuccess({ ok: false, stored: true }), false);
});

test('GA4 lead event is consent-gated and contains no contact PII', () => {
  const calls: unknown[][] = [];
  const gtag = (...args: unknown[]) => calls.push(args);
  const opts = { gaId: 'G-TESTONLY1234', gtag };

  assert.equal(reportContactLead({ ...opts, choice: null, isAdminRoute: false }), false);
  assert.equal(reportContactLead({ ...opts, choice: 'essential', isAdminRoute: false }), false);
  assert.equal(reportContactLead({ ...opts, choice: 'analytics', isAdminRoute: true }), false);
  assert.equal(reportContactLead({ choice: 'analytics', isAdminRoute: false, gtag }), false);
  assert.equal(reportContactLead({ choice: 'analytics', gaId: 'G-TESTONLY1234', isAdminRoute: false }), false);
  assert.deepEqual(calls, []);

  assert.equal(reportContactLead({ ...opts, choice: 'analytics', isAdminRoute: false }), true);
  assert.deepEqual(calls, [
    ['event', 'generate_lead', { send_to: 'G-TESTONLY1234' }],
  ]);
});
