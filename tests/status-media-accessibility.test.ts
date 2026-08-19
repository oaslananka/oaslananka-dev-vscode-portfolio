import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  projectMediaSchema,
  resolveVideoAccessibility,
} from '../lib/project-content';

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('bottom bar uses native outputs for live status text', () => {
  const source = read('components/Bottombar.tsx');
  assert.equal((source.match(/<output/g) ?? []).length, 3);
  assert.doesNotMatch(source, /role="status"/);
});

test('video media accepts explicit audio and text-track metadata', () => {
  const parsed = projectMediaSchema.parse({
    type: 'video',
    src: '/demo.mp4',
    poster: '/poster.webp',
    alt: 'Demo',
    width: 640,
    height: 360,
    audio: 'captions',
    track: {
      kind: 'captions',
      src: '/demo.en.vtt',
      srcLang: 'en',
      label: 'English captions',
    },
  });
  assert.equal(parsed.type, 'video');
  assert.equal(parsed.audio, 'captions');
  assert.equal(parsed.track?.kind, 'captions');
});

test('current silent demo resolves a descriptive text track', () => {
  const parsed = projectMediaSchema.parse({
    type: 'video',
    src: '/projects/sky-track-vision/demo.mp4',
    poster: '/projects/sky-track-vision/poster.webp',
    alt: 'SkyTrackVision demo',
    width: 756,
    height: 424,
  });
  assert.equal(parsed.type, 'video');
  if (parsed.type !== 'video') return;
  const accessibility = resolveVideoAccessibility(parsed);
  assert.equal(accessibility.audio, 'none');
  assert.deepEqual(accessibility.track, {
    kind: 'descriptions',
    src: '/projects/sky-track-vision/demo.en.vtt',
    srcLang: 'en',
    label: 'English visual descriptions',
  });
});

test('silent video rendering exposes muted state and a text track', () => {
  const source = read('components/ProjectMediaGallery.tsx');
  assert.match(source, /muted=\{videoAccessibility\.audio === 'none'\}/);
  assert.match(source, /<track/);
  assert.match(source, /kind=\{videoAccessibility\.track\.kind\}/);
  assert.match(source, /Silent recording; no audio track is present\./);
});

test('visual description track covers the complete silent demo', () => {
  const track = read('public/projects/sky-track-vision/demo.en.vtt');
  assert.match(track, /^WEBVTT/m);
  assert.match(track, /00:00\.000 --> 00:06\.000/);
  assert.match(track, /00:20\.000 --> 00:24\.700/);
  assert.match(track, /Silent screen recording/);
});
