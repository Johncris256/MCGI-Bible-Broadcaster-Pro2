const assert = require('node:assert/strict');
function normalizeModeAdjustment(value) {
  const item = value && typeof value === 'object' ? value : {};
  const optionalInt = (raw, min, max) => {
    if (raw === null || raw === undefined || raw === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : null;
  };
  return {
    maxFontSize: optionalInt(item.maxFontSize, 28, 100),
    letterSpacing: 0,
    lineSpacing: 1.55
  };
}
function migrate(settings, modes) {
  const globalMax = Number(settings && settings.maxFontSize);
  if (!Number.isFinite(globalMax) || globalMax <= 72) return modes;
  for (const mode of [1, 2, 3, 4]) {
    const adjustment = normalizeModeAdjustment(modes[mode]);
    if (Number(adjustment.maxFontSize) === 72) adjustment.maxFontSize = null;
    modes[mode] = normalizeModeAdjustment(adjustment);
  }
  return modes;
}
const result = migrate({ maxFontSize: 80 }, {
  1: { maxFontSize: 72 },
  2: { maxFontSize: 60 },
  3: { maxFontSize: 95 },
  4: { maxFontSize: null }
});
assert.equal(result[1].maxFontSize, null, 'legacy 72px override should inherit new global 80px');
assert.equal(result[2].maxFontSize, 60, 'deliberate lower per-layout value should remain');
assert.equal(result[3].maxFontSize, 95, 'deliberate higher per-layout value should remain');
assert.equal(result[4].maxFontSize, null, 'already-inherited value should remain inherited');
const stillLegacy = migrate({ maxFontSize: 72 }, { 1: { maxFontSize: 72 }, 2: {}, 3: {}, 4: {} });
assert.equal(stillLegacy[1].maxFontSize, 72, 'do not migrate when global is still 72px');
console.log('PASS: Legacy 72px per-layout caps inherit the raised global limit; intentional overrides are preserved.');
