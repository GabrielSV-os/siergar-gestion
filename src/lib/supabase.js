import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase environment variables are missing. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

const supabaseReal = createClient(supabaseUrl, supabaseAnonKey);

// ─────────────────────────────────────────────────────────────────────────────
// Demo-mode in-memory store — cleared automatically on page reload
// ─────────────────────────────────────────────────────────────────────────────

const _demoInserts = new Map(); // table → [record, ...]
const _demoUpdates = new Map(); // table → [{ filters:[{col,val}], newData:{} }, ...]
const _demoDeletes = new Map(); // table → Set(id as string)

function _inserts(t) { if (!_demoInserts.has(t)) _demoInserts.set(t, []); return _demoInserts.get(t); }
function _updates(t) { if (!_demoUpdates.has(t)) _demoUpdates.set(t, []); return _demoUpdates.get(t); }
function _deletes(t) { if (!_demoDeletes.has(t)) _demoDeletes.set(t, new Set()); return _demoDeletes.get(t); }

// Known FK relationships used to enrich demo records with joined data
const FK_RELATIONS = {
    inventario:             [{ fk: 'material_id', foreignTable: 'materiales', localKey: 'materiales' }],
    movimientos_inventario: [{ fk: 'material_id', foreignTable: 'materiales', localKey: 'materiales' }],
    consumo_materiales:     [{ fk: 'material_id', foreignTable: 'materiales', localKey: 'materiales' }],
    proyecto_inventario:    [{ fk: 'material_id', foreignTable: 'materiales', localKey: 'materiales' }],
    consumos_diarios:       [{ fk: 'brigada_id',  foreignTable: 'brigadas',   localKey: 'brigadas'   },
                             { fk: 'personal_id', foreignTable: 'personal',   localKey: 'personal'   }],
    brigada_personal:       [{ fk: 'brigada_id',  foreignTable: 'brigadas',   localKey: 'brigadas'   },
                             { fk: 'personal_id', foreignTable: 'personal',   localKey: 'personal'   }],
    brigada_asistencia:     [{ fk: 'personal_id', foreignTable: 'personal',   localKey: 'personal'   }],
};

// Populate FK join fields on a demo record, using demo inserts OR the real data
// already present in the SELECT result (for real FK targets like real material_id).
function _enrich(record, table, realData) {
    const rels = FK_RELATIONS[table];
    if (!rels) return record;
    const out = { ...record };
    for (const { fk, foreignTable, localKey } of rels) {
        if (!out[fk] || out[localKey]) continue;
        // 1. Try demo inserts for that foreign table
        const fromDemo = _inserts(foreignTable).find(r => String(r.id) === String(out[fk]));
        if (fromDemo) { out[localKey] = fromDemo; continue; }
        // 2. Try the real SELECT result (which already has joined data)
        if (realData) {
            const host = realData.find(r => r[localKey] && String(r[localKey].id) === String(out[fk]));
            if (host) out[localKey] = host[localKey];
        }
    }
    return out;
}

// Apply all pending demo updates that match a record's fields.
function _applyUpdates(record, pendingUpdates) {
    let out = record;
    for (const { filters, newData } of pendingUpdates) {
        if (filters.every(({ col, val }) => String(out[col]) === String(val))) {
            out = { ...out, ...newData };
        }
    }
    return out;
}

// Merge demo overlay into a real SELECT result (array or single-object).
function _applyOverlay(result, table) {
    if (result.error) return result;

    const inserts = _inserts(table);
    const updates = _updates(table);
    const deletes = _deletes(table);

    // ── Array result (most SELECTs) ──────────────────────────────────────────
    if (Array.isArray(result.data)) {
        const realData = result.data;
        let data = realData.filter(r => !deletes.has(String(r.id)));
        if (updates.length) data = data.map(r => _applyUpdates(r, updates));
        if (inserts.length) data = [...data, ...inserts.map(r => _enrich(r, table, realData))];
        return { ...result, data };
    }

    // ── Single-object result (.single() / .maybeSingle()) ───────────────────
    if (result.data && typeof result.data === 'object') {
        const r = result.data;
        if (deletes.has(String(r.id))) return { ...result, data: null };
        return { ...result, data: updates.length ? _applyUpdates(r, updates) : r };
    }

    return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// DemoWriteBuilder — intercepts insert / upsert / update / delete
// ─────────────────────────────────────────────────────────────────────────────

class DemoWriteBuilder {
    constructor(seed, table, op) {
        this._table   = table;
        this._op      = op;
        this._newData = seed;   // used by update
        this._filters = [];     // accumulated eq() filters
        this._doSelect = false;
        this._doSingle = false;
        this._record   = null;
        this._committed = false;

        // Inserts are stored immediately (before await) so that subsequent
        // SELECTs in the same async flow already see the fake record.
        if ((op === 'insert' || op === 'upsert') && seed) {
            this._record = {
                id: `demo-${Date.now()}`,
                created_at: new Date().toISOString(),
                ...seed,
            };
            _inserts(table).push(this._record);
        }
    }

    select()      { this._doSelect = true; return this; }
    single()      { this._doSingle = true; return this; }
    maybeSingle() { this._doSingle = true; return this; }

    eq(col, val) {
        if (this._op === 'update') {
            this._filters.push({ col, val: String(val) });
        }
        if (this._op === 'delete' && col === 'id') {
            const id = String(val);
            _deletes(this._table).add(id);
            // Also remove from demo inserts if this was a demo record
            const list = _inserts(this._table);
            const idx  = list.findIndex(r => String(r.id) === id);
            if (idx !== -1) list.splice(idx, 1);
        }
        return this;
    }

    // All other filter / modifier methods just chain
    neq() { return this; }   gt()  { return this; }   gte() { return this; }
    lt()  { return this; }   lte() { return this; }   in()  { return this; }
    is()  { return this; }   like(){ return this; }   ilike(){ return this; }
    or()  { return this; }   not() { return this; }   filter(){ return this; }
    contains(){ return this; }  containedBy(){ return this; }
    overlaps() { return this; } order(){ return this; }
    limit() { return this; }    range(){ return this; }
    head()  { return this; }    returns(){ return this; }
    throwOnError(){ return this; }

    _commit() {
        if (this._committed) return;
        this._committed = true;
        if (this._op === 'update' && this._filters.length > 0 && this._newData) {
            _updates(this._table).push({ filters: this._filters, newData: this._newData });
        }
    }

    _resolve() {
        this._commit();

        let data;
        if (this._op === 'insert' || this._op === 'upsert') {
            const r = this._record;
            data = this._doSingle ? (r ?? null)
                 : this._doSelect ? (r ? [r] : [])
                 : null;
        } else if (this._op === 'update') {
            // Return a non-empty result when .select() is chained so callers
            // don't hit "no rows returned" fallback paths.
            data = this._doSingle ? (this._newData ?? null)
                 : this._doSelect ? (this._newData ? [this._newData] : [])
                 : null;
        } else {
            data = null;
        }

        return { data, error: null, count: null, status: 200, statusText: 'OK' };
    }

    then(resolve, reject) { return Promise.resolve(this._resolve()).then(resolve, reject); }
    catch(fn)   { return Promise.resolve(this._resolve()).catch(fn); }
    finally(fn) { return Promise.resolve(this._resolve()).finally(fn); }
}

// ─────────────────────────────────────────────────────────────────────────────
// DemoSelectWrapper — wraps real SELECT and merges demo overlay into results
// ─────────────────────────────────────────────────────────────────────────────

class DemoSelectWrapper {
    constructor(real, table) { this._real = real; this._table = table; }

    single()      { this._real = this._real.single();      return this; }
    maybeSingle() { this._real = this._real.maybeSingle(); return this; }
    eq(...a)      { this._real = this._real.eq(...a);      return this; }
    neq(...a)     { this._real = this._real.neq(...a);     return this; }
    gt(...a)      { this._real = this._real.gt(...a);      return this; }
    gte(...a)     { this._real = this._real.gte(...a);     return this; }
    lt(...a)      { this._real = this._real.lt(...a);      return this; }
    lte(...a)     { this._real = this._real.lte(...a);     return this; }
    in(...a)      { this._real = this._real.in(...a);      return this; }
    is(...a)      { this._real = this._real.is(...a);      return this; }
    like(...a)    { this._real = this._real.like(...a);    return this; }
    ilike(...a)   { this._real = this._real.ilike(...a);   return this; }
    or(...a)      { this._real = this._real.or(...a);      return this; }
    not(...a)     { this._real = this._real.not(...a);     return this; }
    filter(...a)  { this._real = this._real.filter(...a);  return this; }
    contains(...a){ this._real = this._real.contains(...a);return this; }
    order(...a)   { this._real = this._real.order(...a);   return this; }
    limit(...a)   { this._real = this._real.limit(...a);   return this; }
    range(...a)   { this._real = this._real.range(...a);   return this; }
    head(...a)    { this._real = this._real.head(...a);    return this; }

    then(resolve, reject) {
        return this._real
            .then(result => _applyOverlay(result, this._table))
            .then(resolve, reject);
    }
    catch(fn)   { return this._real.catch(fn); }
    finally(fn) { return this._real.finally(fn); }
}

// ─────────────────────────────────────────────────────────────────────────────
// isDemoMode
// ─────────────────────────────────────────────────────────────────────────────

function isDemoMode() {
    return localStorage.getItem('siergar-demo-mode') === 'true';
}

// ─────────────────────────────────────────────────────────────────────────────
// Main proxy
// ─────────────────────────────────────────────────────────────────────────────

export const supabase = new Proxy(supabaseReal, {
    get(target, prop) {
        if (prop === 'from' && isDemoMode()) {
            return (table) => {
                const realBuilder = target.from(table);
                return new Proxy(realBuilder, {
                    get(bt, method) {
                        if (method === 'insert' || method === 'upsert') {
                            return (data) => new DemoWriteBuilder(
                                Array.isArray(data) ? (data[0] ?? null) : (data ?? null),
                                table, method
                            );
                        }
                        if (method === 'update') {
                            return (data) => new DemoWriteBuilder(data ?? null, table, 'update');
                        }
                        if (method === 'delete') {
                            return () => new DemoWriteBuilder(null, table, 'delete');
                        }
                        if (method === 'select') {
                            return (...args) => new DemoSelectWrapper(bt.select(...args), table);
                        }
                        const val = bt[method];
                        return typeof val === 'function' ? val.bind(bt) : val;
                    }
                });
            };
        }

        if (prop === 'storage' && isDemoMode()) {
            return {
                from: () => ({
                    upload: () => Promise.resolve({ data: { path: 'demo/placeholder.jpg' }, error: null }),
                    getPublicUrl: () => ({ data: { publicUrl: '' } }),
                    remove: () => Promise.resolve({ data: null, error: null }),
                    createSignedUrl: () => Promise.resolve({ data: { signedUrl: '' }, error: null }),
                    list: () => Promise.resolve({ data: [], error: null }),
                }),
            };
        }

        const val = target[prop];
        return typeof val === 'function' ? val.bind(target) : val;
    },
});
