import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertPaymentCanAcceptReference,
  assertPaymentCanBeChanged,
  assertPaymentCanBeReviewed,
  getEffectivePaymentStatus,
  getHouseholdPaymentSummary,
} from './payment.rules';

const today = new Date('2030-03-10T12:00:00.000Z');

test('marks an unpaid pending due overdue only after its due day', () => {
  assert.equal(
    getEffectivePaymentStatus({ status: 'pending', dueDate: '2030-03-09T00:00:00.000Z', amount: 500 }, today),
    'overdue'
  );
  assert.equal(
    getEffectivePaymentStatus({ status: 'pending', dueDate: '2030-03-10T00:00:00.000Z', amount: 500 }, today),
    'pending'
  );
});

test('does not mark a submitted reference overdue while it is awaiting review', () => {
  assert.equal(
    getEffectivePaymentStatus({ status: 'pending', dueDate: '2030-03-01T00:00:00.000Z', amount: 500, proofOfPayment: ' REF-1 ' }, today),
    'pending'
  );
});

test('calculates household totals and partial payment status', () => {
  assert.deepEqual(
    getHouseholdPaymentSummary([
      { status: 'confirmed', dueDate: '2030-03-20T00:00:00.000Z', amount: 300 },
      { status: 'pending', dueDate: '2030-03-20T00:00:00.000Z', amount: 200 },
    ], today),
    { totalDue: 500, totalPaid: 300, outstanding: 200, status: 'partial' }
  );
});

test('does not count a household with no dues as paid', () => {
  assert.deepEqual(getHouseholdPaymentSummary([], today), {
    totalDue: 0,
    totalPaid: 0,
    outstanding: 0,
    status: 'unpaid',
  });
});

test('an overdue unpaid item makes a household overdue', () => {
  assert.equal(
    getHouseholdPaymentSummary([
      { status: 'confirmed', dueDate: '2030-03-01T00:00:00.000Z', amount: 300 },
      { status: 'pending', dueDate: '2030-03-01T00:00:00.000Z', amount: 200 },
    ], today).status,
    'overdue'
  );
});

test('allows replacement after rejection but blocks a second reference during review', () => {
  assert.doesNotThrow(() => assertPaymentCanAcceptReference({ status: 'rejected', proofOfPayment: 'OLD-REF' }));
  assert.throws(
    () => assertPaymentCanAcceptReference({ status: 'pending', proofOfPayment: 'REF-1' }),
    /waiting for review/
  );
  assert.throws(
    () => assertPaymentCanAcceptReference({ status: 'confirmed', proofOfPayment: 'REF-1' }),
    /already paid/
  );
});

test('review requires a pending due with a submitted reference', () => {
  assert.doesNotThrow(() => assertPaymentCanBeReviewed({ status: 'pending', proofOfPayment: 'REF-1' }));
  assert.throws(() => assertPaymentCanBeReviewed({ status: 'pending', proofOfPayment: '' }), /submitted reference/);
  assert.throws(() => assertPaymentCanBeReviewed({ status: 'confirmed', proofOfPayment: 'REF-1' }), /submitted reference/);
});

test('confirmed dues cannot be edited or deleted', () => {
  assert.doesNotThrow(() => assertPaymentCanBeChanged({ status: 'pending' }));
  assert.throws(() => assertPaymentCanBeChanged({ status: 'confirmed' }), /Paid dues cannot be edited/);
});
