import assert from "node:assert/strict";
import test from "node:test";
import { availableBookingTimes } from "./booking-availability.ts";

const slots = [
  { start: "06:00", end: "06:30", available: false },
  { start: "06:30", end: "07:00", available: true },
  { start: "07:00", end: "07:30", available: true },
  { start: "07:30", end: "08:00", available: false },
  { start: "08:00", end: "08:30", available: true },
];
const date = "2026-11-13";
const now = Date.parse("2026-11-13T01:00:00+07:00");

test("hides booked starts and resumes at the end of an existing booking", () => {
  assert.deepEqual(availableBookingTimes(slots, 30, date, now).starts, ["06:30", "07:00", "08:00"]);
});

test("end times stop at the next booking instead of crossing it", () => {
  assert.deepEqual(availableBookingTimes(slots, 30, date, now, "06:30").ends, ["07:00", "07:30"]);
});

test("requires enough consecutive free time for the minimum duration", () => {
  assert.deepEqual(availableBookingTimes(slots, 60, date, now, "06:30"), {
    starts: ["06:30"], ends: ["07:30"],
  });
});

test("rejects a previously selected start after it becomes booked", () => {
  assert.deepEqual(availableBookingTimes(slots, 30, date, now, "06:00").ends, []);
});

test("excludes past starts using Vietnam time", () => {
  assert.deepEqual(availableBookingTimes(slots, 30, date, Date.parse("2026-11-13T07:00:00+07:00")).starts, ["08:00"]);
});

test("does not bridge missing slots or offer a fully booked day", () => {
  assert.deepEqual(availableBookingTimes([slots[1], slots[4]], 60, date, now).starts, []);
  assert.deepEqual(availableBookingTimes(slots.map((slot) => ({ ...slot, available: false })), 30, date, now), { starts: [], ends: [] });
});
