import test from 'node:test';
import assert from 'node:assert/strict';
import { SEEK_EPSILON, SEEK_STALL_MS, createSeeker } from '../src/pages/TourPage/seeker.ts';

/** Soxta video: currentTime berilsa seek boshlanadi; `finish()` chaqirilganda tugaydi va 'seeked' beriladi. */
class FakeVideo {
  private t = 0;
  private target: number | null = null;
  private listeners = new Set<() => void>();
  assignments: number[] = [];
  assignedWhileSeeking = 0;
  get currentTime() { return this.target ?? this.t; }
  set currentTime(value: number) {
    if (this.target !== null) this.assignedWhileSeeking++;
    this.target = value;
    this.assignments.push(value);
  }
  get seeking() { return this.target !== null; }
  addEventListener(_type: 'seeked', l: () => void) { this.listeners.add(l); }
  removeEventListener(_type: 'seeked', l: () => void) { this.listeners.delete(l); }
  finish() {
    if (this.target === null) return;
    this.t = this.target;
    this.target = null;
    for (const l of [...this.listeners]) l();
  }
  listenerCount() { return this.listeners.size; }
  setNow(value: number) { this.t = value; }
}

test('seeker: birinchi so\'rov darrov seek boshlaydi', () => {
  const v = new FakeVideo();
  const seeker = createSeeker(v);
  seeker.request(5);
  assert.deepEqual(v.assignments, [5]);
  assert.equal(seeker.busy(), true);
  v.finish();
  assert.equal(seeker.busy(), false);
});

test('seeker: seek ketayotganda yangilari yuborilmaydi, faqat eng oxirgisi `seeked` dan keyin qo\'llanadi', () => {
  const v = new FakeVideo();
  const seeker = createSeeker(v);
  seeker.request(1);
  for (let i = 2; i <= 50; i++) seeker.request(i); // 49 ta so'rov, hali seek tugamagan
  assert.deepEqual(v.assignments, [1]);
  assert.equal(v.assignedWhileSeeking, 0);
  v.finish(); // 1 tugadi -> eng oxirgi (50) yuboriladi
  assert.deepEqual(v.assignments, [1, 50]);
  assert.equal(seeker.busy(), true);
  v.finish();
  assert.equal(v.currentTime, 50);
  assert.equal(seeker.busy(), false);
  assert.equal(v.assignedWhileSeeking, 0);
});

test('seeker: allaqachon shu joyda (epsilon ichida) bo\'lsa seek yuborilmaydi', () => {
  const v = new FakeVideo();
  v.setNow(10);
  const seeker = createSeeker(v);
  seeker.request(10 + SEEK_EPSILON / 2);
  seeker.request(10);
  assert.deepEqual(v.assignments, []);
  assert.equal(seeker.busy(), false);
  seeker.request(10 + SEEK_EPSILON * 3);
  assert.equal(v.assignments.length, 1);
});

test('seeker: NaN/Infinity so\'rovi e\'tiborsiz; cancel kutilayotgan so\'rovni bekor qiladi', () => {
  const v = new FakeVideo();
  const seeker = createSeeker(v);
  seeker.request(Number.NaN);
  assert.deepEqual(v.assignments, []);
  seeker.request(3);
  seeker.request(9);
  seeker.cancel();
  v.finish();
  assert.deepEqual(v.assignments, [3]);
  assert.equal(seeker.busy(), false);
});

test('seeker: qotib qolgan seek (tarmoq) SEEK_STALL_MS dan keyin almashtiriladi', () => {
  let now = 1000;
  const v = new FakeVideo();
  const seeker = createSeeker(v, () => now);
  seeker.request(5);
  now += SEEK_STALL_MS - 1;
  seeker.request(8);
  assert.deepEqual(v.assignments, [5]);
  now += 2;
  seeker.request(8);
  assert.deepEqual(v.assignments, [5, 8]);
});

test('seeker: destroy tinglovchini olib tashlaydi', () => {
  const v = new FakeVideo();
  const seeker = createSeeker(v);
  assert.equal(v.listenerCount(), 1);
  seeker.request(2);
  seeker.request(7);
  seeker.destroy();
  assert.equal(v.listenerCount(), 0);
  v.finish();
  assert.deepEqual(v.assignments, [2]);
});
