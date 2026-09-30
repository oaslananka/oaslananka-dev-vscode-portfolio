import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import AgentDiscoveryLink from '../components/AgentDiscoveryLink';

test('agent discovery link renders the llms.txt describedby relation', () => {
  const markup = renderToStaticMarkup(createElement(AgentDiscoveryLink));

  assert.ok(markup.startsWith('<link'));
  assert.ok(markup.includes('rel="describedby"'));
  assert.ok(markup.includes('href="/llms.txt"'));
});
