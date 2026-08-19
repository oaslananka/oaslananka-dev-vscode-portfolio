import assert from 'node:assert/strict';
import test from 'node:test';

import {
  HOMEPAGE_DELIVERY_INTRO,
  HOMEPAGE_DELIVERY_STAGES,
  HOMEPAGE_ENGINEERING_PRINCIPLES,
} from '../lib/homepage-content';

const words = (value: string) =>
  value.trim().split(/\s+/).filter(Boolean);

test('homepage production principles are substantial, bounded, and evidence-led', () => {
  assert.equal(HOMEPAGE_ENGINEERING_PRINCIPLES.length, 3);

  const totalWords = HOMEPAGE_ENGINEERING_PRINCIPLES.reduce(
    (total, principle) => total + words(principle.body).length,
    0,
  );
  assert.ok(totalWords >= 260, `expected at least 260 words, received ${totalWords}`);
  assert.ok(totalWords <= 330, `expected at most 330 words, received ${totalWords}`);

  const titles = new Set<string>();
  for (const principle of HOMEPAGE_ENGINEERING_PRINCIPLES) {
    assert.ok(principle.title.trim());
    assert.ok(principle.body.trim());
    assert.ok(principle.linkLabel.trim());
    assert.match(principle.href, /^\/(?:projects|articles)\/[a-z0-9-]+$/);
    assert.equal(titles.has(principle.title), false);
    titles.add(principle.title);
  }

  const authoredText = HOMEPAGE_ENGINEERING_PRINCIPLES
    .map(({ title, body, linkLabel }) => `${title} ${body} ${linkLabel}`)
    .join(' ');
  assert.doesNotMatch(authoredText, /\b(?:TBD|TODO|lorem ipsum)\b/i);
  assert.doesNotMatch(
    authoredText,
    /\b(?:number one|top-ranked|millions? of users|customers?|market leader|industry-leading)\b/i,
  );
});


test('homepage delivery path explains a bounded prototype-to-release workflow', () => {
  assert.equal(HOMEPAGE_DELIVERY_STAGES.length, 4);
  const totalWords = words(HOMEPAGE_DELIVERY_INTRO).length + HOMEPAGE_DELIVERY_STAGES.reduce((total, stage) => total + words(stage.body).length, 0);
  assert.ok(totalWords >= 340, `expected at least 340 words, received ${totalWords}`);
  assert.ok(totalWords <= 420, `expected at most 420 words, received ${totalWords}`);
  assert.deepEqual(HOMEPAGE_DELIVERY_STAGES.map((stage) => stage.order), ['01', '02', '03', '04']);
  for (const stage of HOMEPAGE_DELIVERY_STAGES) {
    assert.ok(stage.title.trim());
    assert.ok(stage.body.trim());
  }
});


test('homepage methodology avoids repeated positioning phrases', () => {
  const authoredText = [
    ...HOMEPAGE_ENGINEERING_PRINCIPLES.flatMap((item) => [
      item.title,
      item.body,
      item.linkLabel,
    ]),
    HOMEPAGE_DELIVERY_INTRO,
    ...HOMEPAGE_DELIVERY_STAGES.flatMap((stage) => [stage.title, stage.body]),
  ]
    .join(' ')
    .toLowerCase();

  for (const phrase of [
    'production-first',
    'inspect-first',
    'explicit human approval',
    'bounded failure modes',
  ]) {
    assert.ok(
      authoredText.split(phrase).length - 1 <= 1,
      `${phrase} should appear at most once`,
    );
  }
});
