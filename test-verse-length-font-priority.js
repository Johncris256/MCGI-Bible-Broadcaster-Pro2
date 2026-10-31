'use strict';
const assert = require('node:assert/strict');

const RANGES = [
  [1, 50], [51, 100], [101, 150], [151, 200], [201, 250], [251, 300], [301, 350],
  [351, 400], [401, 450], [451, 500], [501, 550], [551, 600], [601, 650], [651, 999]
];
const DEFAULTS = [68, 69, 68, 59, 56, 50, 48, 43, 42, 28, 29, 27, 27, 24];
function getLengthBasedFontSize(text, values = DEFAULTS) {
  const length = Array.from(String(text || '').trim()).length;
  for (let i = 0; i < RANGES.length; i++) {
    const [min, max] = RANGES[i];
    if (length >= min && (length <= max || i === RANGES.length - 1)) {
      const n = Number(values[i]);
      return Number.isFinite(n) ? Math.min(100, Math.max(14, n)) : DEFAULTS[i];
    }
  }
  return DEFAULTS[DEFAULTS.length - 1];
}
function resolveTarget(length, layoutMax, values) {
  const text = 'x'.repeat(length);
  const requestedMax = Math.min(100, Math.max(28, Number.parseInt(layoutMax, 10) || 72));
  const lengthMax = getLengthBasedFontSize(text, values);
  return Math.max(14, Math.min(requestedMax, lengthMax));
}

const table = [...DEFAULTS];
// Screenshot scenario: current content length 152 maps to 151-200, whose value is 53px.
table[2] = 88; // 101-150 is intentionally different and must not be selected for length 152.
table[3] = 53;
assert.equal(getLengthBasedFontSize('x'.repeat(152), table), 53);
assert.equal(resolveTarget(152, 80, table), 53, 'active 151-200 row applies even when layout Max is above 72');

// The 100px feature remains possible by editing the ACTIVE length row and setting layout Max >= that value.
table[3] = 88;
assert.equal(resolveTarget(152, 100, table), 88, 'length row can specify 88px with a 100px layout ceiling');
assert.equal(resolveTarget(152, 80, table), 80, 'layout Max remains the upper bound');
table[3] = 100;
assert.equal(resolveTarget(152, 100, table), 100, 'length row and layout Max can both reach 100px');

// Boundary and open-ended last bucket.
assert.equal(getLengthBasedFontSize('x'.repeat(150), table), table[2]);
assert.equal(getLengthBasedFontSize('x'.repeat(151), table), table[3]);
assert.equal(getLengthBasedFontSize('x'.repeat(1000), table), table[13], '651 to 999+ remains open-ended');

console.log('PASS: Verse-length row always controls the target ceiling; layout Max only caps it; 73-100px remains available through the active row.');
