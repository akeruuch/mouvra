import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const root = new URL('../', import.meta.url);
const catalog = JSON.parse(readFileSync(new URL('research/mice.json', root), 'utf8'));

test('expanded catalog includes discoverable Attack Shark models with official provenance', () => {
  const models = catalog.products.filter((p: {brand: string}) => /attack shark/i.test(p.brand));
  assert.ok(models.length > 0, 'Attack Shark should be discoverable in the catalog');
  for (const p of models) {
    assert.ok(p.sources.some((url: string) => new URL(url).hostname === 'attackshark.com'));
  }
});

test('catalog IDs, images, GLBs and optional numeric values are safe for product routes', () => {
  const seen = new Set();
  for (const p of catalog.products) {
    assert.match(p.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(!seen.has(p.id), `Duplicate route ${p.id}`); seen.add(p.id);
    assert.ok(p.sources.length > 0, `No sources for ${p.id}`);
    for (const url of p.sources) assert.equal(new URL(url).protocol, 'https:');
    for (const value of [p.weightG, p.dpiMax, p.pollingHzIncluded, p.pollingHzMax, ...Object.values(p.dimensionsMm)]) {
      assert.ok(value === null || typeof value === 'number' && Number.isFinite(value) && value > 0, `Invalid specification in ${p.id}`);
    }
    for (const image of new Set<string>([p.image, ...p.gallery])) {
      assert.match(image, /^\/images\/[a-z0-9_.-]+$/i);
      const file = new URL(`public${image}`, root);
      assert.ok(statSync(file).size > 100, `Missing/empty asset ${fileURLToPath(file)}`);
      const bytes = readFileSync(file);
      assert.ok(bytes.subarray(0,4).toString() === 'RIFF' || bytes.subarray(1,4).toString() === 'PNG' || bytes[0] === 0xff || bytes.subarray(4,12).toString().includes('ftyp'), `Unexpected image response: ${image}`);
    }
    if (p.model3d) {
      const bytes = readFileSync(new URL(`public${p.model3d.path}`, root));
      assert.equal(bytes.subarray(0,4).toString(), 'glTF');
      assert.equal(bytes.readUInt32LE(8), bytes.length);
      assert.equal(p.model3d.official, true);
    }
  }
});
