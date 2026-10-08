const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const U = '11111111-1111-4111-8111-111111111111';
const M = '22222222-2222-4222-8222-222222222222';
const A = '33333333-3333-4333-8333-333333333333';
const B = '44444444-4444-4444-8444-444444444444';
const req = body => new Request('https://offline.invalid', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
function database({ user = { id: U }, member = { id: M, user_id: U, full_name: 'Review', allergies: [] }, medicines = [], reports = [], vitals = [], updateRows = [{}], failureTable } = {}) {
  const calls = [];
  const db = {
    auth: { getUser: async () => { calls.push({ auth: true }); return { data: { user }, error: null }; } },
    functions: { invoke: async () => { calls.push({ ai: true }); return { data: null, error: { message: 'Offline' } }; } },
    rpc: async (name, args) => { calls.push({ rpc: name, args }); return { error: null }; },
    from(table) {
      const state = { table, filters: [], mutation: null };
      const result = () => ({ data: table === failureTable ? null : state.mutation === 'update' ? updateRows : state.mutation === 'insert' ? [{ id: A }] : table === 'family_members' ? member ? [member] : [] : table === 'medicines' ? medicines : table === 'medical_records' ? reports : table === 'vital_logs' ? vitals : [], error: table === failureTable ? { message: 'Offline' } : null });
      const chain = {
        select: () => chain, order: () => chain, limit: () => chain,
        eq: (key, value) => { state.filters.push([key, value]); return chain; }, neq: () => chain,
        insert: value => { state.mutation = 'insert'; calls.push({ table, insert: value, filters: state.filters }); return chain; },
        update: value => { state.mutation = 'update'; calls.push({ table, update: value, filters: state.filters }); return chain; },
        maybeSingle: async () => { calls.push(state); const value = result(); return { ...value, data: value.data?.[0] || null }; },
        single: async () => { const value = result(); return { ...value, data: value.data?.[0] || null }; },
        then: (yes, no) => { calls.push(state); return Promise.resolve(result()).then(yes, no); },
      }; return chain;
    },
  }; return { db, calls };
}
function loader({ db = database().db, mocks = {}, globals = {} } = {}) {
  const cache = new Map();
  const defaults = {
    'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status || 200 }) } },
    'next/cache': { revalidatePath() {} },
    '@/lib/supabase/server': { createClient: async () => db },
    '@google/adk': { FunctionTool: class { constructor(options) { Object.assign(this, options); } } },
    zod: require('zod'),
    ...mocks,
  };
  function load(file) {
    const absolute = path.isAbsolute(file) ? file : path.resolve(root, file);
    if (cache.has(absolute)) return cache.get(absolute);
    const exports = {}; cache.set(absolute, exports);
    const source = fs.readFileSync(absolute, 'utf8');
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
    vm.runInNewContext(code, {
      module: { exports }, exports, Buffer, Date, URL, Request, Response, TextDecoder, Uint8Array,
      console: { log() {}, warn() {}, error() {} }, AbortController, AbortSignal, setTimeout, clearTimeout,
      process: { env: {} }, fetch: async () => { throw new Error('No network allowed'); },
      require(name) {
        if (Object.hasOwn(defaults, name)) return defaults[name];
        let target = name.startsWith('@/') ? path.resolve(root, 'src', name.slice(2)) : path.resolve(path.dirname(absolute), name);
        if (!path.extname(target)) target += '.ts';
        return load(target);
      }, ...globals,
    }, { filename: absolute });
    return exports;
  } return load;
}
const validMedicine = { medicine_name: 'Review', dosage_form: 'TABLET', unit: 'TABLETS', quantity: 0, storage_location: 'Cabinet', family_member_id: M, expiry_date: '2027-12-01' };
for (const file of ['enrich', 'ai/scan-medicine', 'ai/analyze-report', 'ai/health-summary', 'ai/check-interactions', 'agent/chat']) test(`Anonymous ${file} is denied before AI or database access`, async () => {
  const { db, calls } = database({ user: null });
  const response = await loader({ db })(`src/app/api/${file}/route.ts`).POST(req({}));
  assert.equal(response.status, 401); assert.equal(calls.length, 1); assert.ok(calls[0].auth);
});
test('Malformed JSON returns 400', async () => {
  const response = await loader()('src/app/api/enrich/route.ts').POST(new Request('https://offline.invalid', { method: 'POST', body: '{' }));
  assert.equal(response.status, 400);
});
test('Too many photos are rejected before provider use', async () => {
  const response = await loader()('src/app/api/ai/scan-medicine/route.ts').POST(req({ images: Array(5).fill({ fileBase64: 'dGVzdA==' }) }));
  assert.equal(response.status, 400);
});
test('Request guard caps streamed body even without content-length', async () => {
  const guard = loader()('src/lib/server/requestGuard.ts');
  await assert.rejects(() => guard.readJSON(req({ text: 'a'.repeat(100) }), 20), /too large/);
});
test('AI burst budget limits the thirteenth request', async () => {
  const guard = loader()('src/lib/server/requestGuard.ts');
  for (let i = 0; i < 12; i++) await guard.authenticatedAI();
  await assert.rejects(() => guard.authenticatedAI(), /Too many/);
});
for (const [name, options, expected] of [
  ['empty records', {}, 'INSUFFICIENT_DATA'],
  ['abnormal lab', { reports: [{ test_date: '2026-10-06', biomarkers: [{ name: 'Test', value: 12, unit: 'u', status: 'ABNORMAL' }] }] }, 'MODERATE_ATTENTION'],
  ['critical home reading', { vitals: [{ name: 'Oxygen', value: 80, unit: '%', status: 'CRITICAL' }] }, 'ATTENTION_REQUIRED'],
]) test(`Summary handles ${name} without an invented wellness score`, async () => {
  const { db, calls } = database(options);
  const response = await loader({ db })('src/app/api/ai/health-summary/route.ts').POST(req({ familyMemberId: M, member: { id: 'attacker' }, vitalLogs: [] }));
  assert.equal(response.status, 200); assert.equal(response.body.data.vitality_status, expected); assert.equal(response.body.data.vitality_score, null);
  for (const query of calls.filter(c => c.table)) assert.ok(query.filters.some(([key, value]) => key === 'user_id' && value === U));
  assert.doesNotMatch(response.body.data.clinical_overview, /optimal|all.*normal/i);
});
test('Summary and chat reject an inaccessible member', async () => {
  for (const file of ['ai/health-summary', 'agent/chat']) {
    const { db } = database({ member: null });
    const result = await loader({ db })(`src/app/api/${file}/route.ts`).POST(req({ familyMemberId: M, prompt: 'Review' }));
    assert.equal(result.status, 404);
  }
});
test('Summary database failure is not an empty healthy profile', async () => {
  const { db } = database({ failureTable: 'vital_logs' });
  const result = await loader({ db })('src/app/api/ai/health-summary/route.ts').POST(req({ familyMemberId: M }));
  assert.equal(result.status, 503);
});
test('Recorded allergy class never receives compatibility clearance', async () => {
  const { db } = database({ member: { id: M, allergies: ['Penicillin'] }, medicines: [{ medicine_name: 'Amoxicillin', salt_composition: 'Amoxicillin' }] });
  const result = await loader({ db })('src/app/api/ai/health-summary/route.ts').POST(req({ familyMemberId: M }));
  assert.ok(result.body.data.allergy_warnings.length); assert.match(result.body.data.medication_evaluation, /require review/);
});
test('Chat without AI never claims an audit or SAFE', async () => {
  const result = await loader()('src/app/api/agent/chat/route.ts').POST(req({ prompt: 'Review' }));
  assert.equal(result.body.data.safety_flag, 'UNKNOWN'); assert.match(result.body.data.response, /unavailable/);
});
test('Failed regulatory screen logs UNKNOWN and changes no ban flags or successful-check date', async () => {
  const { db, calls } = database({ medicines: [{ id: A, medicine_name: 'Review', is_banned: true }] });
  await loader({ db })('src/app/actions/safety.ts').runSafetyAudit();
  const saved = calls.find(c => c.rpc).args.p_entries;
  assert.equal(saved[0].result_status, 'UNKNOWN'); assert.equal(calls.filter(c => c.update).length, 0);
});
test('Failed interaction provider returns UNAVAILABLE and null result', async () => {
  const { db } = database({ medicines: [{ medicine_name: 'Review' }] });
  const result = await loader({ db })('src/app/api/ai/check-interactions/route.ts').POST(req({ family_member_id: M, new_medicine_salt: 'Review' }));
  assert.equal(result.status, 503); assert.equal(result.body.hasInteraction, null);
});
test('Unknown, impossible and absent expiry dates remain UNKNOWN', () => {
  const { calculateExpiryStatus } = loader()('src/lib/utils/expiryCalculator.ts');
  for (const value of ['not-a-date', '2026-02-30', '', null]) assert.equal(calculateExpiryStatus(value).urgency, 'UNKNOWN');
  assert.equal(calculateExpiryStatus('2020-01-01').urgency, 'EXPIRED');
});
test('Age is valid across month ends and rejects future/impossible dates', () => {
  class FixedDate extends Date { constructor(...args) { super(...(args.length ? args : ['2026-03-01T12:00:00'])); } }
  const { calculateAge } = loader({ globals: { Date: FixedDate } })('src/lib/utils/ageCalculator.ts');
  const age = calculateAge('2026-01-31');
  assert.equal(age.months, 1); assert.equal(age.days, 1);
  assert.equal(calculateAge('2026-02-30'), null); assert.equal(calculateAge('2027-01-01'), null);
});
test('Medicine mutation rejects protected fields and invalid dates', async () => {
  const { db, calls } = database();
  const route = loader({ db })('src/app/api/medicines/[id]/route.ts');
  for (const body of [{ ...validMedicine, is_banned: false }, { ...validMedicine, user_id: U }, { ...validMedicine, expiry_date: '2026-02-30' }, { ...validMedicine, quantity: -1 }]) {
    const result = await route.PUT(req(body), { params: Promise.resolve({ id: A }) }); assert.equal(result.status, 400);
  }
  assert.equal(calls.filter(c => c.update).length, 0);
});
test('Medicine zero-row update is 404 and includes owner filter', async () => {
  const { db, calls } = database({ updateRows: [] });
  const result = await loader({ db })('src/app/api/medicines/[id]/route.ts').PUT(req(validMedicine), { params: Promise.resolve({ id: A }) });
  assert.equal(result.status, 404);
  assert.ok(calls.find(c => c.update).filters.some(([key, value]) => key === 'user_id' && value === U));
});
test('Medicine creation permits zero stock and unassigned household inventory', async () => {
  const { db, calls } = database();
  const result = await loader({ db })('src/app/api/medicines/route.ts').POST(req({ ...validMedicine, family_member_id: null }));
  assert.equal(result.status, 200); assert.equal(calls.find(c => c.insert).insert[0].quantity, 0);
});
test('Vitals reject negative, infinite, missing pressure and unsupported units', async () => {
  const { db, calls } = database(); const route = loader({ db })('src/app/actions/vitals.ts');
  const base = { family_member_id: M, name: 'Review', vital_type: 'BLOOD_PRESSURE', unit: 'mmHg', value: 120 };
  for (const payload of [{ ...base, value: -1 }, { ...base, value: Infinity }, base, { ...base, value_secondary: 80, unit: '%' }]) assert.equal((await route.createVitalLog(payload)).success, false);
  assert.equal(calls.filter(c => c.insert).length, 0);
});
test('Glucose units are converted and client NORMAL override is ignored', async () => {
  const { db, calls } = database(); const route = loader({ db })('src/app/actions/vitals.ts');
  for (const unit of ['mg/dL', 'mmol/L']) await route.createVitalLog({ family_member_id: M, vital_type: 'BLOOD_GLUCOSE', name: 'Glucose', value: 5.5, unit, context: 'Fasting', status: 'NORMAL' });
  const values = calls.filter(c => c.insert).map(c => c.insert[0]); assert.equal(values[0].status, 'LOW'); assert.equal(values[1].status, 'NORMAL');
});
test('Unclassified vitals remain UNKNOWN', async () => {
  const { db, calls } = database(); await loader({ db })('src/app/actions/vitals.ts').createVitalLog({ family_member_id: M, vital_type: 'TEMPERATURE', name: 'Temperature', value: 98.6, unit: '°F' });
  assert.equal(calls.find(c => c.insert).insert[0].status, 'UNKNOWN');
});
test('Offline regulatory and unmatched diagnostic tools issue UNKNOWN', async () => {
  const load = loader();
  assert.equal((await load('src/lib/agent/tools/safetyScanTools.ts').queryBannedDrugsListTool.execute({ medicine_name: 'Unknown' })).status, 'UNKNOWN');
  const diagnostic = load('src/lib/agent/tools/diagnosticTools.ts').evaluateBiomarkerRangeTool;
  assert.equal((await diagnostic.execute({ biomarker_name: 'Unknown', value: 999999, unit: 'review-unit' })).status, 'UNKNOWN');
  assert.equal((await diagnostic.execute({ biomarker_name: 'Test', value: 12, unit: 'mg/dL', reference_unit: 'mmol/L', reference_min: 5, reference_max: 10 })).status, 'UNKNOWN');
});
test('Regulatory results are matched by ID and duplicates rejected', async () => {
  const sources = ['https://cdsco.gov.in/notice-A', 'https://www.fda.gov/notice-B'];
  let entries = [{ medicine_id: B, status: 'WARNING', summary: 'Finding B', source_urls: [sources[1]] }, { medicine_id: A, status: 'WARNING', summary: 'Finding A', source_urls: [sources[0]] }];
  const load = loader({ globals: { fetch: async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(entries) }] }, groundingMetadata: { groundingChunks: sources.map(uri => ({ web: { uri } })) } }] }) }) } });
  const route = load('src/lib/server/regulatory.ts');
  const result = await route.screenRegulatory([{ id: A }, { id: B }], 'fake', 'test-model');
  assert.match(result[0].summary, /Finding A/); assert.match(result[1].summary, /Finding B/);
  entries[0].medicine_id = A;
  await assert.rejects(() => route.screenRegulatory([{ id: A }, { id: B }], 'fake', 'test-model'), /duplicate/);
});
test('Fabricated or ungrounded official URLs never become a verified warning', async () => {
  const load = loader({ globals: { fetch: async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify([{ medicine_id: A, status: 'WARNING', summary: 'Ban', source_urls: ['https://fda.gov/fiction'] }]) }] } }] }) }) } });
  const result = await load('src/lib/server/regulatory.ts').screenRegulatory([{ id: A }], 'fake', 'test-model');
  assert.equal(result[0].result_status, 'UNKNOWN');
});
test('Malformed Gemini output fails and retry budget is bounded', async () => {
  let calls = 0;
  const load = loader({ globals: { process: { env: { GEMINI_MODELS: 'test-a,test-b,test-c' } }, fetch: async () => { calls++; return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'not valid JSON' }] } }] }) }; } } });
  await assert.rejects(() => load('src/lib/utils/geminiClient.ts').generateGeminiContent([{ text: 'Review' }], 'fake'), /invalid JSON/);
  assert.equal(calls, 1);
});
test('Gemini quota failure stops retries', async () => {
  let calls = 0;
  const load = loader({ globals: { process: { env: { GEMINI_MODELS: 'test-a,test-b,test-c' } }, fetch: async () => { calls++; return { ok: false, status: 429 }; } } });
  await assert.rejects(() => load('src/lib/utils/geminiClient.ts').generateGeminiContent([{ text: 'Review' }], 'fake'));
  assert.equal(calls, 1);
});
test('Unauthenticated memory cannot be stored or recalled', async () => {
  const { db, calls } = database({ user: null }); const mod = loader({ db })('src/lib/agent/tools/clinicalMemoryTools.ts');
  assert.equal((await mod.recordClinicalMemoryTool.execute({ family_member_id: M, headline: 'Private' })).status, 'UNAUTHORIZED');
  assert.equal((await mod.recallPatientMemoriesTool.execute({})).total_memories_found, 0);
  assert.equal(calls.filter(c => c.insert).length, 0);
});
test('Anonymous scheduler request never constructs service-role client', async () => {
  let handler, clients = 0;
  const load = loader({ mocks: { 'https://deno.land/std@0.168.0/http/server.ts': { serve: fn => { handler = fn; } }, 'https://esm.sh/@supabase/supabase-js@2': { createClient: () => { clients++; throw new Error('Forbidden'); } } }, globals: { Deno: { env: { get: name => name === 'SAFETY_SCAN_SECRET' ? 'fake-secret' : 'fake' } } } });
  load('supabase/functions/scan-banned-medicines/index.ts');
  const result = await handler(req({})); assert.equal(result.status, 401); assert.equal(clients, 0);
});

for (const file of ['enrich-medicine', 'analyze-medical-report']) test(`Anonymous edge ${file} is denied before AI`, async () => {
  let handler, clients = 0;
  const load = loader({ mocks: {
    'https://deno.land/std@0.168.0/http/server.ts': { serve: fn => { handler = fn; } },
    'https://esm.sh/@supabase/supabase-js@2': { createClient: () => { clients++; throw new Error('Forbidden'); } },
  }, globals: { Deno: { env: { get: () => 'fake' } } } });
  load(`supabase/functions/${file}/index.ts`);
  const result = await handler(req({}));
  assert.equal(result.status, 401); assert.equal(clients, 0);
});
test('Report creation validates member ownership and private attachment path', async () => {
  for (const options of [{ member: null }, {}]) {
    const { db, calls } = database(options);
    const route = loader({ db })('src/app/actions/medicalRecords.ts');
    const result = await route.createMedicalRecord({ family_member_id: M, title: 'Report', record_type: 'LAB_REPORT', file_url: options.member === null ? undefined : `foreign-user/${M}/report.pdf` });
    assert.equal(result.success, false); assert.equal(calls.filter(c => c.insert).length, 0);
  }
});
test('Unknown audit status renders unknown without approval language', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const component = tag => props => React.createElement(tag, props, props.children);
  const load = loader({ mocks: {
    react: { ...React, default: React }, 'react/jsx-runtime': require('react/jsx-runtime'),
    'next/link': { default: component('a') },
    '@/components/ui/badge': { Badge: component('span') },
    '@/components/ui/button': { Button: component('button') },
    '@/components/ui/table': Object.fromEntries(['Table','TableBody','TableCell','TableHead','TableHeader','TableRow'].map(name => [name, component('div')])),
    'lucide-react': Object.fromEntries(['ChevronDown','ChevronUp','ExternalLink','ShieldCheck','ShieldAlert','AlertTriangle'].map(name => [name, component('i')])),
  } });
  // The loader compiles TSX using automatic JSX so this exercises actual rendered components.
  const html = renderToStaticMarkup(React.createElement(load('src/components/AuditLogTable.tsx').AuditLogTable, { logs: [{ id: A, medicine_id: A, checked_at: '2026-10-07T12:00:00Z', result_status: 'UNKNOWN', summary: 'Check unavailable' }] }));
  assert.match(html, /UNKNOWN/); assert.doesNotMatch(html, /CLEARED|Safe &amp; Approved/);
});

test('Private document access checks the owner before issuing a short-lived link', async () => {
  const { db } = database({ reports: [{ family_member_id: M, file_url: `${U}/${M}/report.pdf` }] });
  let signed = 0;
  db.storage = { from: () => ({ createSignedUrl: async (path, seconds) => {
    signed++; assert.equal(path, `${U}/${M}/report.pdf`); assert.equal(seconds, 60);
    return { data: { signedUrl: 'https://offline.invalid/signed' }, error: null };
  } }) };
  const load = loader({ db, mocks: { 'next/server': { NextResponse: {
    json: (body, options = {}) => ({ body, status: options.status || 200 }),
    redirect: (url, options) => ({ url, ...options }),
  } } } });
  const result = await load('src/app/api/medical-records/[id]/document/route.ts').GET(new Request('https://offline.invalid'), { params: Promise.resolve({ id: A }) });
  assert.equal(result.status, 307); assert.equal(signed, 1); assert.match(result.headers['Cache-Control'], /no-store/);
});
test('Private document refuses a foreign storage path', async () => {
  const { db } = database({ reports: [{ family_member_id: M, file_url: `foreign/${M}/report.pdf` }] });
  const result = await loader({ db })('src/app/api/medical-records/[id]/document/route.ts').GET(new Request('https://offline.invalid'), { params: Promise.resolve({ id: A }) });
  assert.equal(result.status, 403);
});

test('Scheduler with a busy durable lease performs no scan and no writes', async () => {
  let handler;
  const { db, calls } = database({ medicines: [{ id: A }] });
  db.rpc = async (name, args) => { calls.push({ rpc: name, args }); return { data: false, error: null }; };
  const load = loader({ mocks: {
    'https://deno.land/std@0.168.0/http/server.ts': { serve: fn => { handler = fn; } },
    'https://esm.sh/@supabase/supabase-js@2': { createClient: () => db },
  }, globals: { crypto: require('node:crypto').webcrypto, Deno: { env: { get: name => name === 'SAFETY_SCAN_SECRET' ? 'fake-secret' : 'fake' } } } });
  load('supabase/functions/scan-banned-medicines/index.ts');
  const result = await handler(new Request('https://offline.invalid', { method: 'POST', headers: { authorization: 'Bearer fake-secret' } }));
  assert.equal(result.status, 409); assert.equal(calls.length, 1); assert.equal(calls[0].rpc, 'acquire_safety_scan');
});
