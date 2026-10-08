const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const root = path.resolve(__dirname, '..');
const U = '11111111-1111-4111-8111-111111111111';
const M = '22222222-2222-4222-8222-222222222222';
const B = '33333333-3333-4333-8333-333333333333';
const member = { id: M, user_id: U, full_name: 'Fixture A', allergies: [] };

function hooks() {
  const slots = [], cleanup = [];
  let cursor = 0;
  return { reset: () => { cursor = 0; }, cleanup: () => cleanup.forEach(f => f()), react: { ...React,
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
    useRef(value) { const i = cursor++; return slots[i] ||= { current: value }; },
    useId() { const i = cursor++; return slots[i] ||= 'fixture-' + i; },
    useEffect(fn) { const i = cursor++; if (!(i in slots)) { slots[i] = true; const result = fn(); if (typeof result === 'function') cleanup.push(result); } },
    useMemo: fn => fn(), useCallback: fn => fn, useTransition: () => [false, fn => fn()],
  }};
}
function database({ user = { id: U }, medicines = [], reports = [], vitals = [], failed } = {}) {
  const calls = [];
  return { calls, db: { auth: { getUser: async () => ({ data: { user } }) }, from(table) {
    let filters = [], range, single = false;
    const events = [];
    const values = () => {
      let data = table === 'family_members' ? [member] : table === 'medicines' ? medicines : table === 'medical_records' ? reports : table === 'vital_logs' ? vitals : [];
      for (const [key, value] of filters) data = data.filter(row => row[key] === value);
      const count = data.length;
      if (range) data = data.slice(range[0], range[1] + 1);
      calls.push({ table, events });
      return { data: table === failed ? null : single ? data[0] || null : data, count, error: table === failed ? { message: 'Fixture failure' } : null };
    };
    const chain = {
      select: fields => { events.push(['select', fields]); return chain; },
      eq: (key, value) => { filters.push([key, value]); events.push(['eq', key, value]); return chain; },
      order: (...args) => { events.push(['order', ...args]); return chain; },
      range: (a, b) => { range = [a, b]; events.push(['range', a, b]); return chain; },
      or: value => { events.push(['or', value]); return chain; },
      lt: () => chain, gt: () => chain, gte: () => chain, lte: () => chain, is: () => chain,
      maybeSingle: () => { single = true; return Promise.resolve(values()); },
      single: () => { single = true; return Promise.resolve(values()); },
      then: (yes, no) => Promise.resolve(values()).then(yes, no),
    }; return chain;
  } } };
}
function loader({ db = database().db, react = React, fetcher = async () => { throw Error('No network permitted'); }, actions = {} } = {}) {
  const cache = new Map(), components = new Map();
  function component(name) { if (!components.has(name)) { const C = () => null; C.displayName = name; C.mock = true; components.set(name, C); } return components.get(name); }
  function load(file) {
    let absolute = path.isAbsolute(file) ? file : path.join(root, file);
    if (!path.extname(absolute)) absolute = ['.ts', '.tsx'].map(ext => absolute + ext).find(fs.existsSync);
    if (cache.has(absolute)) return cache.get(absolute);
    const loadedModule = { exports: {} }; cache.set(absolute, loadedModule.exports);
    const code = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    vm.runInNewContext(code, { module: loadedModule, exports: loadedModule.exports, console, Date, JSON, Buffer, URL, URLSearchParams, TextEncoder, AbortController, AbortSignal, setTimeout, clearTimeout, confirm: () => true, process: { env: {} }, window: { confirm: () => true, alert() {} }, crypto: require('node:crypto').webcrypto, fetch: fetcher,
      require(name) {
        if (name === 'react') return react;
        if (name === 'react/jsx-runtime') return require('react/jsx-runtime');
        if (name === '@/lib/supabase/server' || name === '@/lib/supabase/client') return { createClient: name.endsWith('/server') ? async () => db : () => db };
        if (name === 'next/navigation') return { useRouter: () => ({ refresh() {}, push() {} }), redirect: () => { throw Error('Redirect to login'); }, notFound: () => { throw Error('Not found'); } };
        if (name === 'next/link' || name === 'next/image') return { __esModule: true, default: component(name) };
        if (name === 'lucide-react' || name.startsWith('@/components/') || name.startsWith('./ui/')) return new Proxy({}, { get: (_, key) => key === '__esModule' ? true : component(String(key)) });
        if (name === '@/lib/utils/imageCompressor') return { compressImageForVision: async () => ({ fileBase64: 'Zml4dHVyZQ==', mimeType: 'application/pdf' }) };
        if (name.startsWith('@/app/actions/')) return actions[name] || new Proxy({}, { get: () => async () => ({ success: false, error: 'Fixture mutation failed' }) });
        if (name.startsWith('@/')) return load(path.join(root, 'src', name.slice(2)));
        if (name.startsWith('.')) return load(path.join(path.dirname(absolute), name));
        return require(name);
      },
    }, { filename: absolute });
    cache.set(absolute, loadedModule.exports); return loadedModule.exports;
  } return load;
}
function walk(node, predicate) {
  if (node == null || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(n => walk(n, predicate));
  return [...(predicate(node) ? [node] : []), ...walk(node.props?.children, predicate)];
}
function text(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(text).join(' ');
  return text(node.props?.children);
}
function find(node, predicate) { const result = walk(node, predicate)[0]; assert.ok(result, 'Expected rendered control'); return result; }
function renderer(load, hook, file, name, props) {
  const C = load(file)[name];
  return () => { hook.reset(); let tree = C(props); while (typeof tree.type === 'function' && !tree.type.mock) tree = tree.type(tree.props); return tree; };
}

test('Anonymous dashboard redirects instead of displaying an empty health profile', async () => {
  await assert.rejects(() => loader({ db: database({ user: null }).db })('src/app/page.tsx').default({ searchParams: Promise.resolve({}) }), /Redirect/);
});
test('Empty dashboard describes health as unassessed', async () => {
  const tree = await loader()('src/app/page.tsx').default({ searchParams: Promise.resolve({}) });
  assert.match(text(tree), /health status is unassessed/); assert.doesNotMatch(text(tree), /optimal|Good to consume/);
});
test('Failed record reads render explicit recovery without health reassurance', async () => {
  const tree = await loader({ db: database({ failed: 'medical_records' }).db })('src/app/page.tsx').default({ searchParams: Promise.resolve({}) });
  assert.ok(walk(tree, n => n.type?.displayName === 'DataUnavailable').length);
  assert.doesNotMatch(text(tree), /optimal|all.*normal/i);
});
test('Banned but unexpired medicine remains a warning; expiry has no consumption clearance', async () => {
  const medicine = { id: B, user_id: U, medicine_name: 'Fixture', is_banned: true, expiry_date: '2050-01-01' };
  const tree = await loader({ db: database({ medicines: [medicine] }).db })('src/app/page.tsx').default({ searchParams: Promise.resolve({ q: 'other' }) });
  assert.match(text(tree), /recorded regulatory warnings/); assert.match(text(tree), /More than 45 days until expiry/); assert.doesNotMatch(text(tree), /Good to consume|AI Verified/);
});
test('Inventory and history filters run before pagination and queries are bounded', async () => {
  const { db, calls } = database();
  await loader({ db })('src/app/page.tsx').default({ searchParams: Promise.resolve({ q: 'fixture', page: '2' }) });
  const inventory = calls.find(c => c.table === 'medicines' && c.events.some(e => e[0] === 'or'));
  assert.ok(inventory.events.findIndex(e => e[0] === 'or') < inventory.events.findIndex(e => e[0] === 'range'));
  assert.deepEqual(inventory.events.find(e => e[0] === 'range'), ['range', 12, 23]);
  await loader({ db })('src/app/safety/page.tsx').default({ searchParams: Promise.resolve({ q: 'fixture', page: '2' }) });
  const history = calls.find(c => c.table === 'safety_audit_logs');
  assert.ok(history.events.findIndex(e => e[0] === 'or') < history.events.findIndex(e => e[0] === 'range'));
});
test('Unknown expiry and abnormal measurements have explicit non-normal styles', () => {
  const status = loader()('src/lib/utils/statusPresentation.ts');
  assert.match(status.expiryPresentation.UNKNOWN.badge, /slate/);
  assert.match(status.measurementPresentation('UNKNOWN').className, /slate/);
  assert.match(status.measurementPresentation('ABNORMAL').className, /amber/);
});
test('Reading series preserve source, patient, context and date without older-home precedence', () => {
  const { latestRecordedReadings } = loader()('src/lib/utils/recordReadings.ts');
  const values = latestRecordedReadings([{ id: B, family_member_id: M, family_members: member, test_date: '2026-10-01', biomarkers: [{ name: 'Glucose', value: '182', unit: 'mg/dL', status: 'HIGH' }] }], [{ id: 'home', family_member_id: M, family_members: member, name: 'Glucose', value: 101, unit: 'mg/dL', context: 'Fasting', recorded_at: '2020-01-01' }]);
  assert.equal(values.length, 2); assert.equal(values[0].value, '182'); assert.equal(values[0].memberName, member.full_name); assert.equal(values[0].source, 'Lab report'); assert.equal(values[0].date, '2026-10-01');
});
test('Emergency QR keeps essential fields, reports omissions and respects UTF-8 capacity', () => {
  const { buildEmergencyCard } = loader()('src/lib/utils/emergencyCard.ts');
  const medicines = Array.from({ length: 40 }, (_, i) => ({ medicine_name: '薬品 ' + i + ' fixture medicine long description', salt_composition: 'Fixture salt' }));
  const card = buildEmergencyCard({ full_name: 'Fixture', allergies: ['Recorded allergy'], chronic_conditions: ['Recorded condition'] }, medicines, 'Unknown', '2026-10-08');
  assert.ok(card.omitted > 0); assert.ok(new TextEncoder().encode(card.qrText).length <= 1200);
  assert.match(card.qrText, /Recorded allergy|Recorded condition/); assert.match(card.qrText, /2026-10-08/); assert.match(card.qrText, /omitted/); assert.match(card.fullText, /薬品 39/);
  const huge = buildEmergencyCard({ full_name: 'Fixture', allergies: ['A'.repeat(2000)] }, [], 'Unknown', '2026-10-08');
  assert.equal(huge.qrText, null); assert.ok(huge.fullText.length > 2000);
});
test('Canceling a report scan then changing patient/file never applies the old results', async () => {
  const h = hooks(); let resolve;
  const pending = new Promise(r => { resolve = r; });
  const load = loader({ react: h.react, fetcher: () => pending });
  const render = renderer(load, h, 'src/components/AddMedicalRecordModal.tsx', 'AddMedicalRecordModal', { familyMembers: [member, { id: B, full_name: 'Fixture B' }] });
  let tree = render();
  find(tree, n => n.type === 'select' && n.props.id.endsWith('-member')).props.onChange({ target: { value: M } }); tree = render();
  find(tree, n => n.type === 'input' && n.props.type === 'file').props.onChange({ target: { files: [{ name: 'A.pdf', size: 100, type: 'application/pdf' }] } }); tree = render();
  const extracting = find(tree, n => n.props.onClick && text(n).trim() === 'Extract blank fields with AI').props.onClick();
  await Promise.resolve(); await Promise.resolve(); tree = render();
  assert.equal(find(tree, n => n.type === 'fieldset').props.disabled, true);
  find(tree, n => n.type?.displayName === 'Dialog').props.onOpenChange(false); tree = render();
  find(tree, n => n.type === 'select' && n.props.id.endsWith('-member')).props.onChange({ target: { value: B } }); tree = render();
  find(tree, n => n.type === 'input' && n.props.type === 'file').props.onChange({ target: { files: [{ name: 'B.pdf', size: 100, type: 'application/pdf' }] } });
  resolve({ ok: true, json: async () => ({ success: true, data: { title: 'Extracted from A' } }) }); await extracting; tree = render();
  assert.equal(find(tree, n => n.type === 'input' && n.props.name === 'title').props.value, '');
});
test('AI report extraction preserves existing user-entered fields', async () => {
  const h = hooks();
  const load = loader({ react: h.react, fetcher: async () => ({ ok: true, json: async () => ({ success: true, data: { title: 'AI title', summary: 'AI notes' } }) }) });
  const render = renderer(load, h, 'src/components/AddMedicalRecordModal.tsx', 'AddMedicalRecordModal', { familyMemberId: M, familyMemberName: 'Fixture' });
  let tree = render();
  find(tree, n => n.type === 'input' && n.props.name === 'title').props.onChange({ target: { value: 'Reviewed title' } }); tree = render();
  find(tree, n => n.type === 'textarea').props.onChange({ target: { value: 'Reviewed notes' } }); tree = render();
  await find(tree, n => n.props.onClick && text(n).trim() === 'Extract blank fields with AI').props.onClick(); tree = render();
  assert.equal(find(tree, n => n.type === 'input' && n.props.name === 'title').props.value, 'Reviewed title');
  assert.equal(find(tree, n => n.type === 'textarea').props.value, 'Reviewed notes');
});
test('New measurements begin unclassified and report controls have real labels', () => {
  const h = hooks(), load = loader({ react: h.react });
  const render = renderer(load, h, 'src/components/AddMedicalRecordModal.tsx', 'AddMedicalRecordModal', { familyMemberId: M });
  let tree = render(); find(tree, n => n.props.onClick && text(n).trim() === 'Add measurement').props.onClick(); tree = render();
  assert.ok(walk(tree, n => n.type === 'select' && n.props.value === 'UNKNOWN').length);
  for (const label of walk(tree, n => n.type === 'label' && n.props.htmlFor)) assert.ok(walk(tree, n => n.props.id === label.props.htmlFor).length);
});
test('Allergy-only summary warnings are visible and chat is available before generation', async () => {
  const h = hooks(), load = loader({ react: h.react, fetcher: async () => ({ ok: true, json: async () => ({ success: true, data: { clinical_overview: 'Fixture overview', vitality_status: 'INSUFFICIENT_DATA', allergy_warnings: ['Recorded allergy warning'], age_specific_alerts: [] } }) }) });
  const render = renderer(load, h, 'src/components/AIHealthSummaryCard.tsx', 'AIHealthSummaryCard', { member, medicines: [], medicalRecords: [], vitalLogs: [] });
  let tree = render(); assert.match(text(tree), /Ask about these records/);
  await find(tree, n => n.props.onClick && text(n).trim() === 'Generate record summary').props.onClick(); tree = render();
  assert.match(text(tree), /Recorded allergy warning/); assert.match(text(tree), /Fixture overview/); assert.doesNotMatch(text(tree), /Age-related review warnings/);
});
test('Failed report deletion stays open with an accessible error', async () => {
  const h = hooks(), load = loader({ react: h.react });
  const render = renderer(load, h, 'src/components/MedicalRecordDetailModal.tsx', 'MedicalRecordDetailModal', { record: { id: B, family_member_id: M, title: 'Fixture report', biomarkers: [] }, familyMemberName: 'Fixture' });
  let tree = render();
  await find(tree, n => n.props.onClick && /Delete/.test(text(n))).props.onClick(); tree = render();
  assert.match(text(find(tree, n => n.props.role === 'alert')), /Fixture mutation failed/);
});

test('Missing regulatory evidence is unassessed and attempted screens do not become clearance', () => {
  const C = loader()('src/components/RegulatoryRecordStatus.tsx').RegulatoryRecordStatus;
  let tree = C({ medicine: { medicine_name: 'Fixture', last_regulatory_screen: '2026-10-08T06:00:00Z' } });
  assert.match(text(tree), /Status is unassessed/);
  assert.match(text(tree), /Last successful response:.*Date not recorded/);
  tree = C({ medicine: { medicine_name: 'Fixture', last_safety_check: '2026-10-07T06:00:00Z' } });
  assert.match(text(tree), /No current clearance is established/);
  assert.doesNotMatch(text(tree), /AI Verified|Safe to consume/);
});

test('Changing a vital draft member clears the previous reading and measurement actions have distinct names', () => {
  const h = hooks(), load = loader({ react: h.react });
  const render = renderer(load, h, 'src/components/LogVitalModal.tsx', 'LogVitalModal', { familyMembers: [member, { id: B, full_name: 'Fixture B' }] });
  let tree = render();
  find(tree, n => n.type === 'select').props.onChange({ target: { value: M } }); tree = render();
  find(tree, n => n.type?.displayName === 'Input' && n.props.type === 'number').props.onChange({ target: { value: '101' } }); tree = render();
  find(tree, n => n.type === 'select').props.onChange({ target: { value: B } }); tree = render();
  assert.equal(find(tree, n => n.type?.displayName === 'Input' && n.props.type === 'number').props.value, '');
  assert.equal(find(tree, n => n.type === 'select').props.value, B);
  const presets = walk(tree, n => n.type === 'button' && n.props['aria-pressed'] !== undefined && n.props['aria-label']);
  assert.equal(new Set(presets.map(n => n.props['aria-label'])).size, 7);
});

test('Medicine edit read failure offers recovery and a missing owned medicine is a 404', async () => {
  const failedTree = await loader({ db: database({ failed: 'medicines' }).db })('src/app/medicines/[id]/edit/page.tsx').default({ params: Promise.resolve({ id: B }) });
  assert.ok(walk(failedTree, n => n.type?.displayName === 'DataUnavailable').length);
  await assert.rejects(() => loader()('src/app/medicines/[id]/edit/page.tsx').default({ params: Promise.resolve({ id: B }) }), /Not found/);
});
