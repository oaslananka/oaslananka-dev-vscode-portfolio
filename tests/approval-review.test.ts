import assert from 'node:assert/strict';
import test from 'node:test';

import { groupApprovalFields } from '../lib/admin/approval-review';

test('approval UI groups every proposed field exactly once and preserves original values', () => {
  const patch = {
    title: 'BoardReadyOps', description: 'Hardware review',
    longDescription: '## Engineering problem\nA PCB review gate.',
    coverImage: 'https://media.oaslananka.dev/files/' + 'a'.repeat(64) + '.jpg',
    media: [{ type: 'image', src: '/projects/test.png', alt: 'Test', width: 800, height: 450 }],
    outcomes: ['KiCad ERC/DRC'], published: false, customLegacyField: { a: 1 },
  };
  const current = { title: 'Old name', published: true };
  const before = JSON.stringify({ patch, current });
  const groups = groupApprovalFields(patch, current);
  const entries = groups.flatMap(group => group.fields);
  assert.equal(entries.length, Object.keys(patch).length);
  assert.deepEqual(entries.map(entry => entry.field).sort(), Object.keys(patch).sort());
  assert.deepEqual(entries.find(item => item.field === 'published'), {
    field: 'published', current: true, proposed: false,
  });
  assert.equal(groups.find(group => group.heading === 'Main content')?.fields[0].proposed, patch.longDescription);
  assert.equal(groups.find(group => group.heading === 'Visual assets')?.fields.length, 2);
  assert.equal(groups.find(group => group.heading === 'Additional changes')?.fields[0].field, 'customLegacyField');
  assert.equal(JSON.stringify({ patch, current }), before, 'presentation must never mutate approved data');
});

test('empty proposal has no cards; missing current values remain explicit', () => {
  assert.deepEqual(groupApprovalFields({}, {}), []);
  assert.deepEqual(groupApprovalFields({ body: 'A draft' }, {})[0].fields[0], {
    field: 'body', current: undefined, proposed: 'A draft',
  });
});
