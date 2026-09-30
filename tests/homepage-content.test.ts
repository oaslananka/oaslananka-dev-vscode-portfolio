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

  const titles = new Set<string>();
  for (const principle of HOMEPAGE_ENGINEERING_PRINCIPLES) {
    assert.ok(principle.title.trim());
    const bodyWords = words(principle.body).length;
    assert.ok(bodyWords >= 45, `${principle.title} should contain at least 45 words`);
    assert.ok(bodyWords <= 80, `${principle.title} should stay under 80 words`);
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
  const introWords = words(HOMEPAGE_DELIVERY_INTRO).length;
  assert.ok(introWords >= 20 && introWords <= 45, `delivery intro should contain 20–45 words, received ${introWords}`);
  assert.deepEqual(HOMEPAGE_DELIVERY_STAGES.map((stage) => stage.order), ['01', '02', '03', '04']);
  for (const stage of HOMEPAGE_DELIVERY_STAGES) {
    assert.ok(stage.title.trim());
    const bodyWords = words(stage.body).length;
    assert.ok(bodyWords >= 35, `${stage.title} should contain at least 35 words`);
    assert.ok(bodyWords <= 70, `${stage.title} should stay under 70 words`);
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
