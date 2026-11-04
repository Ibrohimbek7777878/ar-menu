import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TOURS_URL, tourAiSuggestUrl, tourAiSuggestionsUrl, tourHotspotsUrl, tourIdFromSearch, tourPublishUrl, tourStopsUrl, tourUnpublishUrl, tourUrl, tourVideoUrl,
} from './urls.ts';

test('API manzillari', () => {
  assert.equal(TOURS_URL, '/api/restaurant/admin/v1/tours/');
  assert.equal(tourUrl(7), '/api/restaurant/admin/v1/tours/7/');
  assert.equal(tourVideoUrl(7), '/api/restaurant/admin/v1/tours/7/video/');
  assert.equal(tourStopsUrl(7), '/api/restaurant/admin/v1/tours/7/stops/');
  assert.equal(tourHotspotsUrl(7), '/api/restaurant/admin/v1/tours/7/hotspots/');
  assert.equal(tourPublishUrl(7), '/api/restaurant/admin/v1/tours/7/publish/');
  assert.equal(tourUnpublishUrl(7), '/api/restaurant/admin/v1/tours/7/unpublish/');
  assert.equal(tourAiSuggestUrl(7), '/api/restaurant/admin/v1/tours/7/ai-suggest/');
  assert.equal(tourAiSuggestionsUrl(7), '/api/restaurant/admin/v1/tours/7/ai-suggestions/');
});

test('noto\'g\'ri raqam manzil qurishda rad etiladi (yo\'l buzilmasin)', () => {
  for (const bad of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) assert.throws(() => tourUrl(bad), /Noto'g'ri/, String(bad));
});

test('tourIdFromSearch: ?id= o\'qish', () => {
  assert.equal(tourIdFromSearch('?id=12'), 12);
  assert.equal(tourIdFromSearch('id=3&x=1'), 3);
  for (const bad of ['', '?id=', '?id=0', '?id=-4', '?id=abc', '?id=1.5', '?id=1e3', '?id=12345678901', '?other=1', '?id=../x']) assert.equal(tourIdFromSearch(bad), null, bad);
});
