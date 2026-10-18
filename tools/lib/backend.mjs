/**
 * Open the JSONL session-persistence backend for the repro harnesses.
 *
 * The backend's published shape changed in DSH 0.2.1
 * (`docs/upgrade-guide/v0.2.1-alpha.1/jsonl-persistence-plugin`):
 *
 *   ≤ 0.2.0  `export default JsonlSessionPersistence` — a concrete class the
 *            harness constructs directly with a minimal context.
 *   0.2.1+   `export const name / Config / apply` — a function plugin with no
 *            default export, mounted on a real Cordis `Context`; the service
 *            comes back through `ctx.get('sessionPersistence')`.
 *
 * Both generations expose the same service surface (`create` / `list` /
 * `locate` / …), so callers only need the returned `persistence` object.
 * Not a published file: `tools/` is not in package.json `files`.
 */
import { createRequire } from 'node:module';

/** Import one absolute file path as ESM regardless of the host platform. */
function importPath(path) {
    return import(`file://${path.replace(/\\/g, '/')}`);
}

/** The smallest context the pre-0.2.1 concrete constructor accepts. */
function legacyContext() {
    return { on() {}, effect: (callback) => callback(), reflect: { provide() {} }, logger: console };
}

/**
 * Open one backend generation over `config.root`.
 * @param backendPath - absolute path to `dsh-session-persistence-jsonl/lib/index.js`.
 * @param config - `{ root, compression }` accepted by both generations.
 * @returns the `sessionPersistence` instance and an idempotent disposer.
 */
export async function openSessionPersistence(backendPath, config) {
    const module = await importPath(backendPath);
    // A class export means the legacy generation; a plugin object has `apply`
    // and no default. Checking the default keeps transitional builds (both
    // exports) on the path that needs no Cordis context.
    if (typeof module.default === 'function') {
        return { persistence: new module.default(legacyContext(), config), dispose: async () => {} };
    }
    const requireFromBackend = createRequire(backendPath);
    const { Context } = await importPath(requireFromBackend.resolve('@deepseek-ai/cordis'));
    const ctx = new Context();
    await ctx.plugin(module, config);
    const persistence = ctx.get('sessionPersistence');
    if (persistence === undefined) {
        await ctx.fiber.dispose();
        throw new Error(`backend at ${backendPath} mounted without a sessionPersistence service`);
    }
    let disposed = false;
    return {
        persistence,
        dispose: async () => {
            if (disposed) return;
            disposed = true;
            // Cordis 4 root contexts expose no `dispose()`; the fiber owns the
            // plugin tree teardown (the same call the scope helper quiesces).
            await ctx.fiber.dispose();
        },
    };
}
