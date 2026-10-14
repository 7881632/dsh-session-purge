/**
 * End-to-end proof harness for the recycle bin (milestone M1), driven against
 * the REAL `@deepseek-ai/dsh-session-persistence-jsonl` backend over a
 * throwaway sessions root.
 *
 * For every session present it proves the full round trip on disk:
 *
 *   trash   → the directory is gone and `backend.list()` no longer sees it
 *   restore → `backend.list()` sees it again, and the directory is
 *             BYTE-IDENTICAL to what it was before
 *   purge   → payload and metadata are both gone
 *   sweep   → an entry backdated past the retention window is deleted
 *
 * The restore step is the one that proves the design: the backend validates a
 * log against the path derived from its own header and fails the ENTIRE listing
 * on a mismatch, so `list()` succeeding after a restore is real evidence that
 * the payload landed exactly where it came from.
 *
 * A copy of one real session directory (when the machine has one) is included
 * on top of a fixture created by the backend, so the run covers genuine log
 * artifacts without ever touching the user's own files.
 *
 * Run: node tools/repro-trash.mjs
 */
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const DSH_HOME = process.env.DSH_HOME ?? join(homedir(), '.dsh');
const SESSIONS_ROOT = join(DSH_HOME, 'sessions');

/**
 * Locate every candidate JSONL backend, best first.
 *
 * A machine can hold several installs at once (a pnpm-global `dsh` plus this
 * checkout's dev dependency) and they may be different session-format
 * generations, so the caller picks the first candidate that can materialize a
 * current-format session — that is the generation the running `dsh web` uses.
 */
async function resolveBackends() {
    const candidates = [];
    const push = (path) => {
        if (path !== undefined && existsSync(path) && !candidates.includes(path)) candidates.push(path);
    };
    const explicit = process.env.DSH_WEB_APP_DIR;
    if (explicit !== undefined && explicit !== '') push(await findBackendUnder(explicit));
    const globalRoots = [
        process.env.PNPM_GLOBAL_DIR,
        process.env.LOCALAPPDATA === undefined
            ? undefined
            : join(process.env.LOCALAPPDATA, 'pnpm', 'global', 'v11'),
        join(process.env.XDG_DATA_HOME ?? join(homedir(), '.local', 'share'), 'pnpm', 'global', 'v11'),
        join(homedir(), 'Library', 'pnpm', 'global', 'v11'),
    ].filter((root) => root !== undefined && existsSync(root));
    for (const global of globalRoots) {
        for (const entry of await safeReaddir(global)) {
            if (!entry.isDirectory()) continue;
            push(await findBackendUnder(join(global, entry.name, 'node_modules', '.pnpm')));
        }
    }
    push(fileURLToPath(new URL(
        '../node_modules/@deepseek-ai/dsh-session-persistence-jsonl/lib/index.js',
        import.meta.url,
    )));
    if (candidates.length === 0) {
        throw new Error(
            'could not locate dsh-session-persistence-jsonl; run `pnpm install` (dev dependency) '
            + 'or set DSH_WEB_APP_DIR to the directory containing node_modules/@deepseek-ai',
        );
    }
    return candidates;
}

/** Short, readable label for a candidate path, keeping the install hash. */
function labelFor(path) {
    const normalized = path.replace(/\\/g, '/');
    const marker = normalized.indexOf('/.pnpm/');
    if (marker === -1) return normalized;
    const head = normalized.slice(0, marker);
    return `${head.slice(head.lastIndexOf('/') + 1)}${normalized.slice(marker)}`;
}

async function findBackendUnder(dir) {
    const nested = join(dir, 'node_modules', '@deepseek-ai', 'dsh-session-persistence-jsonl', 'lib', 'index.js');
    if (existsSync(nested)) return nested;
    for (const entry of await safeReaddir(dir)) {
        if (!entry.isDirectory()) continue;
        if (!entry.name.startsWith('@deepseek-ai+dsh-session-pe')) continue;
        const candidate = join(
            dir, entry.name, 'node_modules', '@deepseek-ai',
            'dsh-session-persistence-jsonl', 'lib', 'index.js',
        );
        if (existsSync(candidate)) return candidate;
    }
    return undefined;
}

async function safeReaddir(dir) {
    try {
        return await readdir(dir, { withFileTypes: true });
    }
    catch {
        return [];
    }
}

/** The smallest context the host half needs: two services and a home. */
function fakeCtx(home, persistence, workspaces) {
    const services = {
        sessionPersistence: {
            list: async () => persistence.list(),
            locate: (meta) => persistence.locate(meta),
        },
        workspaceRegistry: workspaces,
    };
    return {
        dshHomePath: home,
        get: (name) => services[name],
        effect: (callback) => callback(),
    };
}

/** Hash every file under `dir`, keyed by relative path. */
async function snapshotTree(dir) {
    const out = {};
    const stack = [dir];
    while (stack.length > 0) {
        const current = stack.pop();
        for (const dirent of await readdir(current, { withFileTypes: true })) {
            const child = join(current, dirent.name);
            if (dirent.isDirectory()) stack.push(child);
            else if (dirent.isFile()) {
                out[relative(dir, child)] = createHash('sha256')
                    .update(await readFile(child)).digest('hex');
            }
        }
    }
    return out;
}

async function pathExists(path) {
    return existsSync(path);
}

/** Pick one real session directory to copy, when the machine has one. */
async function pickSourceSession() {
    for (const project of await safeReaddir(SESSIONS_ROOT)) {
        if (!project.isDirectory()) continue;
        const projectDir = join(SESSIONS_ROOT, project.name);
        for (const entry of await safeReaddir(projectDir)) {
            if (!entry.isDirectory()) continue;
            const dir = join(projectDir, entry.name);
            const files = await safeReaddir(dir);
            if (files.some((file) => /^session(\.v\d+)?\.jsonl(\.zstd)?$/.test(file.name))) {
                // The project key matters: a log is only accepted at the path
                // its own header derives, so the copy must keep the original
                // project directory name.
                return { id: entry.name, dir, project: project.name };
            }
        }
    }
    return undefined;
}

// ── setup ──────────────────────────────────────────────────────────────────

const {
    listTrashEntries, purgeSession, restoreSession, sweepTrash, trashSession, writeSettings,
} = await import('../lib/index.js');

const root = join(await mkdtemp(join(tmpdir(), 'dsh-trash-')), 'sessions');
const home = join(root, '..', 'home');
await mkdir(root, { recursive: true });
await mkdir(home, { recursive: true });

const failures = [];
const check = (label, condition, detail) => {
    const ok = condition === true;
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail === undefined ? '' : `  (${detail})`}`);
    if (!ok) failures.push(label);
    return ok;
};

const projectDir = join(root, '--dsh-trash-fixture--');
await mkdir(projectDir, { recursive: true });

/** Materialize one fixture session; returns the format version the backend accepted. */
async function createFixture(backendInstance, dir) {
    const id = `session-${createHash('sha1').update(String(Date.now())).digest('hex').slice(0, 32)}`;
    for (const version of [4, 3]) {
        try {
            const handle = await backendInstance.create({
                version,
                id,
                createdAt: Date.now(),
                cwd: dir,
                isSeeded: false,
                delegationDepth: 0,
            });
            await handle.flush();
            await handle.close();
            return version;
        }
        catch (error) {
            const text = `${error?.name ?? ''} ${error?.message ?? ''}`;
            if (!/SessionFormat|encodeCurrent requires/.test(text)) throw error;
        }
    }
    throw new Error('this backend accepts neither session format v4 nor v3');
}

let candidates;
try {
    candidates = await resolveBackends();
}
catch (error) {
    console.log(`SKIP: ${String(error?.message ?? error)}`);
    console.log('      (install dsh, or set DSH_WEB_APP_DIR, to run the end-to-end check)');
    process.exit(0);
}

// Probe every install in a scratch root and keep the one that writes the
// NEWEST session format: on a machine with several dsh installs (a pnpm-global
// one plus this checkout's dev dependency) the oldest would otherwise win and
// the run would never touch the generation the running `dsh web` actually uses.
const probeRoot = join(root, '..', 'probe');
let chosen = null;
for (const candidate of candidates) {
    const { default: Instance } = await import(`file://${candidate.replace(/\\/g, '/')}`);
    const probeDir = join(probeRoot, String(candidates.indexOf(candidate)));
    await mkdir(probeDir, { recursive: true });
    const instance = new Instance(
        { on() {}, effect: (cb) => cb(), reflect: { provide() {} }, logger: console },
        { root: probeDir, compression: 'zstd' },
    );
    try {
        const version = await createFixture(instance, probeDir);
        console.log(`  candidate: ${labelFor(candidate)} → session format v${version}`);
        if (chosen === null || version > chosen.version) {
            chosen = { Instance, path: candidate, version };
        }
        if (version === 4) break;
    }
    catch (error) {
        const text = `${error?.name ?? ''} ${error?.message ?? ''}`;
        if (/SessionFormat|encodeCurrent requires|neither session format/.test(text)) {
            console.log(`  candidate: ${labelFor(candidate)} → unusable (cannot create a session)`);
            continue;
        }
        throw error;
    }
}
await rm(probeRoot, { recursive: true, force: true });
if (chosen === null) throw new Error('no installed backend could materialize a session fixture');

const backend = new chosen.Instance(
    { on() {}, effect: (cb) => cb(), reflect: { provide() {} }, logger: console },
    { root, compression: 'zstd' },
);
const backendPath = chosen.path;
const fixtureVersion = await createFixture(backend, projectDir);
console.log(`backend : ${labelFor(backendPath)} (session format v${fixtureVersion})`);

// 2) Optionally a COPY of one real session directory. A copy the chosen
//    backend cannot read (a newer format than it knows) is dropped again, so
//    the run stays meaningful on every checkout.
const source = await pickSourceSession();
let copied = false;
if (source !== undefined) {
    const targetProject = join(root, source.project);
    await mkdir(targetProject, { recursive: true });
    await cp(source.dir, join(targetProject, source.id), { recursive: true });
    copied = true;
    try {
        await backend.list();
    }
    catch (error) {
        console.log(`note: the installed backend cannot read the copied session `
            + `(${String(error?.message ?? error).slice(0, 120)}); continuing without it`);
        await rm(targetProject, { recursive: true, force: true });
        copied = false;
    }
}

const workspaces = {
    archivedSessionIds: [],
    archiveSession: async () => {},
    unarchiveSession: async () => {},
};
const ctx = fakeCtx(home, backend, workspaces);

// ── the round trip ─────────────────────────────────────────────────────────

const listed = await backend.list();
let realUntouched = true;
console.log(`fixture : ${listed.length} session(s) under ${root}`);
console.log(`real copy: ${copied ? source.id : (source === undefined ? 'none available' : 'skipped (unreadable by this backend)')}`);
console.log('');

for (const snapshot of listed) {
    const id = snapshot.header.id;
    const location = backend.locate(snapshot.header);
    const dir = location.path.slice(0, location.path.lastIndexOf(process.platform === 'win32' ? '\\' : '/'));
    console.log(`session ${id}`);

    const before = await snapshotTree(dir);
    const trashResult = await trashSession(ctx, id, { title: `title of ${id}` });
    check('trash reports success', trashResult.ok === true && trashResult.mode === 'trashed',
        JSON.stringify(trashResult));
    check('directory left the sessions tree', !(await pathExists(dir)));
    const afterTrash = await backend.list();
    check('backend.list() no longer sees it', !afterTrash.some((row) => row.header.id === id),
        `${afterTrash.length} left`);
    const entries = await listTrashEntries(ctx);
    const entry = entries.find((candidate) => candidate.id === id);
    check('bin holds one entry for it', entry !== undefined);
    check('entry records the proven original directory', entry?.originalDir === dir);
    check('payload is byte-identical inside the bin',
        entry !== undefined && JSON.stringify(await snapshotTree(join(home, 'session-purge', 'trash', entry.trashId)))
            === JSON.stringify(before));

    const restoreResult = await restoreSession(ctx, id);
    check('restore reports success', restoreResult.ok === true, JSON.stringify(restoreResult));
    check('restored to the original directory', restoreResult.restoredTo === dir);
    check('directory is byte-identical again',
        JSON.stringify(await snapshotTree(dir)) === JSON.stringify(before));
    const afterRestore = await backend.list();
    check('backend.list() sees it again (identity check passed)',
        afterRestore.some((row) => row.header.id === id), `${afterRestore.length} listed`);

    const purgeResult = await purgeSession(ctx, id);
    check('purging a session that is NOT in the bin is refused',
        purgeResult.ok === false && purgeResult.code === 'unknown', JSON.stringify(purgeResult));

    // Put it back in the bin, then prove the permanent delete path.
    await trashSession(ctx, id);
    const purgeAgain = await purgeSession(ctx, id);
    check('purge reports success', purgeAgain.ok === true, JSON.stringify(purgeAgain));
    check('directory is gone after purge', !(await pathExists(dir)));
    check('bin metadata is gone after purge',
        !(await listTrashEntries(ctx)).some((candidate) => candidate.id === id));
    console.log('');
}

// ── retention sweep ────────────────────────────────────────────────────────

console.log('retention sweep');
let remaining = await backend.list();
if (remaining.length === 0) {
    // Every session above was purged; materialize one more so the sweep is
    // still exercised end to end.
    await createFixture(backend, projectDir);
    remaining = await backend.list();
}
if (remaining.length > 0) {
    const treeBefore = remaining.map((row) => row.header.id);
    const id = remaining[0].header.id;
    await trashSession(ctx, id);
    const [entry] = (await listTrashEntries(ctx)).filter((candidate) => candidate.id === id);
    const metaPath = join(home, 'session-purge', 'trash', `${entry.trashId}.json`);
    const meta = JSON.parse(await readFile(metaPath, 'utf8'));
    const old = new Date(Date.now() - 31 * 86_400_000).toISOString();
    await writeFile(metaPath, JSON.stringify({ ...meta, deletedAt: old }), 'utf8');

    await writeSettings(ctx, { autoClean: false });
    let swept = await sweepTrash(ctx, { reason: 'repro' });
    check('auto-clean off keeps the expired entry', swept.removed === 0 && swept.skipped === 'disabled');
    await writeSettings(ctx, { autoClean: true, retentionDays: 30 });
    swept = await sweepTrash(ctx, { reason: 'repro' });
    check('expired entry is swept when auto-clean is on', swept.removed === 1,
        JSON.stringify(swept));
    check('bin is empty afterwards', (await listTrashEntries(ctx)).length === 0);
    // The sweep must only ever touch the bin: exactly the trashed session
    // leaves the sessions tree, and nothing else does.
    const treeAfter = (await backend.list()).map((row) => row.header.id);
    check('the sweep removed exactly the trashed session from the tree',
        treeAfter.length === treeBefore.length - 1
        && !treeAfter.includes(id)
        && treeAfter.every((candidate) => treeBefore.includes(candidate)),
        `${treeBefore.length} -> ${treeAfter.length}`);
}
else {
    console.log('  SKIP  no session left to backdate (all were purged above)');
}

if (copied) {
    realUntouched = (await safeReaddir(source.dir))
        .some((file) => /^session(\.v\d+)?\.jsonl(\.zstd)?$/.test(file.name));
    console.log(`\nreal session untouched: ${realUntouched} (${source.dir})`);
}
else {
    console.log('\nreal session untouched: n/a (no readable user session available)');
}

await rm(join(root, '..'), { recursive: true, force: true });

if (failures.length > 0 || !realUntouched) {
    console.error(`\nFAILED: ${failures.length} check(s)${realUntouched ? '' : ' + real session touched'}`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exitCode = 1;
}
else {
    console.log('\nOK: trash → restore → purge → sweep all verified on the real backend');
}
