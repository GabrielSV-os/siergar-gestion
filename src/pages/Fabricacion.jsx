import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRealtime } from '../lib/useRealtime';
import { useToast } from '../components/Toast';
import {
    Hammer, Plus, X, ArrowLeft, Search, Trash2, Edit2, Package, TrendingUp, TrendingDown,
    DollarSign, Settings2, Check, AlertTriangle
} from 'lucide-react';
import CountUp from '../components/CountUp';

export default function Fabricacion() {
    const toast = useToast();
    const [catalogo, setCatalogo] = useState([]);
    const [lotes, setLotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Selected lote
    const [selectedLote, setSelectedLote] = useState(null);
    const [loteMateriales, setLoteMateriales] = useState([]);

    // Modals
    const [showNewLote, setShowNewLote] = useState(false);
    const [showCatalogo, setShowCatalogo] = useState(false);
    const [showAddMaterial, setShowAddMaterial] = useState(false);
    const [showEditLote, setShowEditLote] = useState(false);
    const [showAddCatalogo, setShowAddCatalogo] = useState(false);
    const [editCatalogoItem, setEditCatalogoItem] = useState(null);

    // Forms
    const [loteForm, setLoteForm] = useState({ codigo: '', descripcion: '', fecha: new Date().toISOString().split('T')[0], cantidad_herrajes: 1, precio_venta_unitario: 0 });
    const [materialRows, setMaterialRows] = useState([{ catalogo_id: '', cantidad: '', precio_unitario: '' }]);
    const [catForm, setCatForm] = useState({ nombre: '', precio_estandar: '', unidad: 'unidad' });

    useEffect(() => { loadData(); }, []);

    useRealtime(
        ['fabricacion_catalogo', 'fabricacion_lotes', 'fabricacion_materiales'],
        loadData,
        'fabricacion-realtime'
    );

    async function loadData() {
        if (lotes.length === 0) setLoading(true);
        try {
            const [catRes, lotRes] = await Promise.all([
                supabase.from('fabricacion_catalogo').select('*').order('nombre'),
                supabase.from('fabricacion_lotes').select('*').order('created_at', { ascending: false })
            ]);
            setCatalogo(catRes.data || []);
            setLotes(lotRes.data || []);

            // If a lote is selected, reload its materials
            if (selectedLote) {
                const { data } = await supabase.from('fabricacion_materiales')
                    .select('*, fabricacion_catalogo(nombre, unidad)')
                    .eq('lote_id', selectedLote.id);
                setLoteMateriales(data || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function selectLote(lote) {
        setSelectedLote(lote);
        const { data } = await supabase.from('fabricacion_materiales')
            .select('*, fabricacion_catalogo(nombre, unidad)')
            .eq('lote_id', lote.id);
        setLoteMateriales(data || []);
    }

    // --- AUTO CODE ---
    function generateNextCode() {
        if (lotes.length === 0) return 'A0001';
        const nums = lotes.map(l => {
            const m = l.codigo.match(/^A(\d+)$/i);
            return m ? parseInt(m[1], 10) : 0;
        });
        const max = Math.max(...nums, 0);
        return `A${String(max + 1).padStart(4, '0')}`;
    }

    function openNewLote() {
        setLoteForm({ codigo: generateNextCode(), descripcion: '', fecha: new Date().toISOString().split('T')[0], cantidad_herrajes: 1, precio_venta_unitario: 0 });
        setShowNewLote(true);
    }

    // --- LOTE CRUD ---
    async function handleCreateLote(e) {
        e.preventDefault();
        const { error } = await supabase.from('fabricacion_lotes').insert({
            codigo: loteForm.codigo.trim().toUpperCase(),
            descripcion: loteForm.descripcion.trim(),
            fecha: loteForm.fecha,
            cantidad_herrajes: parseInt(loteForm.cantidad_herrajes) || 1,
            precio_venta_unitario: parseFloat(loteForm.precio_venta_unitario) || 0
        });
        if (error) { toast(error.message, 'error'); return; }
        toast('Lote creado correctamente');
        setLoteForm({ codigo: '', descripcion: '', fecha: new Date().toISOString().split('T')[0], cantidad_herrajes: 1, precio_venta_unitario: 0 });
        setShowNewLote(false);
        loadData();
    }

    async function handleEditLote(e) {
        e.preventDefault();
        const { error } = await supabase.from('fabricacion_lotes').update({
            codigo: loteForm.codigo.trim().toUpperCase(),
            descripcion: loteForm.descripcion.trim(),
            fecha: loteForm.fecha,
            cantidad_herrajes: parseInt(loteForm.cantidad_herrajes) || 1,
            precio_venta_unitario: parseFloat(loteForm.precio_venta_unitario) || 0
        }).eq('id', selectedLote.id);
        if (error) { toast(error.message, 'error'); return; }
        toast('Lote actualizado');
        setShowEditLote(false);
        const updated = { ...selectedLote, ...loteForm, codigo: loteForm.codigo.trim().toUpperCase(), cantidad_herrajes: parseInt(loteForm.cantidad_herrajes) || 1, precio_venta_unitario: parseFloat(loteForm.precio_venta_unitario) || 0 };
        setSelectedLote(updated);
        loadData();
    }

    async function handleDeleteLote(lote) {
        if (!confirm(`¿Eliminar lote ${lote.codigo}? Se eliminarán todos sus materiales.`)) return;
        const { error } = await supabase.from('fabricacion_lotes').delete().eq('id', lote.id);
        if (error) { toast(error.message, 'error'); return; }
        toast('Lote eliminado');
        if (selectedLote?.id === lote.id) setSelectedLote(null);
        loadData();
    }

    async function toggleLoteEstado() {
        const newEstado = selectedLote.estado === 'activo' ? 'completado' : 'activo';
        await supabase.from('fabricacion_lotes').update({ estado: newEstado }).eq('id', selectedLote.id);
        setSelectedLote({ ...selectedLote, estado: newEstado });
        toast(newEstado === 'completado' ? 'Lote marcado como completado' : 'Lote reactivado');
        loadData();
    }

    // --- MATERIALES PER LOTE ---
    async function handleAddMateriales(e) {
        e.preventDefault();
        const valid = materialRows.filter(r => r.catalogo_id && parseFloat(r.cantidad) > 0);
        if (valid.length === 0) { toast('Agregue al menos un material', 'error'); return; }

        const inserts = valid.map(r => ({
            lote_id: selectedLote.id,
            catalogo_id: r.catalogo_id,
            cantidad: parseFloat(r.cantidad),
            precio_unitario: parseFloat(r.precio_unitario) || 0
        }));
        const { error } = await supabase.from('fabricacion_materiales').insert(inserts);
        if (error) { toast(error.message, 'error'); return; }
        toast(`${valid.length} material(es) agregado(s)`);
        setMaterialRows([{ catalogo_id: '', cantidad: '', precio_unitario: '' }]);
        setShowAddMaterial(false);
        selectLote(selectedLote);
    }

    async function handleDeleteMaterial(id) {
        await supabase.from('fabricacion_materiales').delete().eq('id', id);
        toast('Material eliminado del lote');
        selectLote(selectedLote);
    }

    // --- CATALOGO CRUD ---
    async function handleAddCatalogo(e) {
        e.preventDefault();
        if (!catForm.nombre.trim()) { toast('Ingrese un nombre', 'error'); return; }
        const { error } = await supabase.from('fabricacion_catalogo').insert({
            nombre: catForm.nombre.trim().toUpperCase(),
            precio_estandar: parseFloat(catForm.precio_estandar) || 0,
            unidad: catForm.unidad
        });
        if (error) { toast(error.message, 'error'); return; }
        toast('Material agregado al catálogo');
        setCatForm({ nombre: '', precio_estandar: '', unidad: 'unidad' });
        setShowAddCatalogo(false);
        loadData();
    }

    async function handleEditCatalogo(e) {
        e.preventDefault();
        const { error } = await supabase.from('fabricacion_catalogo').update({
            nombre: catForm.nombre.trim().toUpperCase(),
            precio_estandar: parseFloat(catForm.precio_estandar) || 0,
            unidad: catForm.unidad
        }).eq('id', editCatalogoItem.id);
        if (error) { toast(error.message, 'error'); return; }
        toast('Material actualizado');
        setEditCatalogoItem(null);
        setCatForm({ nombre: '', precio_estandar: '', unidad: 'unidad' });
        loadData();
    }

    async function handleDeleteCatalogo(item) {
        if (!confirm(`¿Eliminar "${item.nombre}" del catálogo?`)) return;
        const { error } = await supabase.from('fabricacion_catalogo').delete().eq('id', item.id);
        if (error) { toast(error.message, 'error'); return; }
        toast('Material eliminado del catálogo');
        loadData();
    }

    // --- CALCULATIONS ---
    function calcLoteCost(loteId, mats) {
        return (mats || loteMateriales).filter(m => m.lote_id === loteId).reduce((sum, m) => sum + m.cantidad * m.precio_unitario, 0);
    }

    function getLoteStats(lote, mats) {
        const totalCost = mats.reduce((sum, m) => sum + m.cantidad * m.precio_unitario, 0);
        const qty = lote.cantidad_herrajes || 1;
        const costPerUnit = totalCost / qty;
        const revenue = qty * (lote.precio_venta_unitario || 0);
        const profit = revenue - totalCost;
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
        return { totalCost, costPerUnit, revenue, profit, margin };
    }

    // --- RENDER ---
    const filteredLotes = lotes.filter(l =>
        l.codigo.toLowerCase().includes(search.toLowerCase()) ||
        (l.descripcion || '').toLowerCase().includes(search.toLowerCase())
    );

    if (loading && lotes.length === 0) {
        return (
            <div>
                <div className="page-header">
                    <div>
                        <h2>Fabricación de Herrajes</h2>
                        <p className="page-header-subtitle">Cargando...</p>
                    </div>
                </div>
            </div>
        );
    }

    // ==================== DETAIL VIEW ====================
    if (selectedLote) {
        const stats = getLoteStats(selectedLote, loteMateriales);
        const isActive = selectedLote.estado === 'activo';
        const fmt = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        return (
            <div>
                <div className="page-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setSelectedLote(null)} style={{ padding: '6px 8px' }}>
                            <ArrowLeft size={18} />
                        </button>
                        <div>
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                {selectedLote.codigo}
                                {isActive && (
                                    <Edit2 size={16} style={{ cursor: 'pointer', color: 'var(--text-muted)' }} onClick={() => {
                                        setLoteForm({
                                            codigo: selectedLote.codigo,
                                            descripcion: selectedLote.descripcion || '',
                                            fecha: selectedLote.fecha,
                                            cantidad_herrajes: selectedLote.cantidad_herrajes,
                                            precio_venta_unitario: selectedLote.precio_venta_unitario
                                        });
                                        setShowEditLote(true);
                                    }} />
                                )}
                                <span className={`badge badge-${isActive ? 'green' : 'blue'}`} style={{ fontSize: 11 }}>
                                    {selectedLote.estado}
                                </span>
                            </h2>
                            <p className="page-header-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                📅 {selectedLote.fecha}{selectedLote.descripcion ? ` · ${selectedLote.descripcion}` : ''}
                            </p>
                        </div>
                    </div>
                    <div className="btn-group">
                        {isActive && (
                            <button className="btn btn-primary" onClick={() => {
                                setMaterialRows([{ catalogo_id: '', cantidad: '', precio_unitario: '' }]);
                                setShowAddMaterial(true);
                            }}>
                                <Plus size={16} /> Agregar Material
                            </button>
                        )}
                        <button className={`btn ${isActive ? 'btn-secondary' : 'btn-primary'}`} onClick={toggleLoteEstado}>
                            {isActive ? <><Check size={16} /> Completar</> : <><Edit2 size={16} /> Reactivar</>}
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
                    <div className="stat-card">
                        <div className="stat-icon blue"><Package size={20} /></div>
                        <div className="stat-info">
                            <h4><CountUp from={0} to={selectedLote.cantidad_herrajes} duration={0.8} /></h4>
                            <p>Herrajes a fabricar</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon orange"><DollarSign size={20} /></div>
                        <div className="stat-info">
                            <h4><CountUp from={0} to={stats.totalCost} duration={0.8} formatFn={fmt} /></h4>
                            <p>Costo total</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon purple"><DollarSign size={20} /></div>
                        <div className="stat-info">
                            <h4><CountUp from={0} to={stats.costPerUnit} duration={0.8} formatFn={fmt} /></h4>
                            <p>Costo por herraje</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon blue"><DollarSign size={20} /></div>
                        <div className="stat-info">
                            <h4><CountUp from={0} to={stats.revenue} duration={0.8} formatFn={fmt} /></h4>
                            <p>Venta total</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className={`stat-icon ${stats.profit >= 0 ? 'green' : 'red'}`}>
                            {stats.profit >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                        </div>
                        <div className="stat-info">
                            <h4 style={{ color: stats.profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                                <CountUp from={0} to={stats.profit} duration={0.8} formatFn={fmt} />
                            </h4>
                            <p>Ganancia</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className={`stat-icon ${stats.margin >= 0 ? 'green' : 'red'}`}>
                            {stats.margin >= 0 ? <TrendingUp size={20} /> : <AlertTriangle size={20} />}
                        </div>
                        <div className="stat-info">
                            <h4 style={{ color: stats.margin >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                                <CountUp from={0} to={stats.margin} duration={0.8} formatFn={v => `${v.toFixed(1)}%`} />
                            </h4>
                            <p>Rentabilidad</p>
                        </div>
                    </div>
                </div>

                {/* Profitability bar */}
                {stats.revenue > 0 && (
                    <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Desglose: Costo vs Ganancia</span>
                            <span style={{ fontWeight: 600, color: stats.profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                                {stats.profit >= 0 ? 'Rentable' : 'No rentable'}
                            </span>
                        </div>
                        <div style={{ height: 24, borderRadius: 12, overflow: 'hidden', display: 'flex', background: 'var(--card-bg)' }}>
                            <div style={{
                                width: `${Math.min((stats.totalCost / stats.revenue) * 100, 100)}%`,
                                background: 'var(--accent-orange)',
                                transition: 'width 0.5s ease',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 11, fontWeight: 600, color: '#fff'
                            }}>
                                {stats.revenue > 0 ? `${((stats.totalCost / stats.revenue) * 100).toFixed(0)}% Costo` : ''}
                            </div>
                            {stats.profit > 0 && (
                                <div style={{
                                    width: `${(stats.profit / stats.revenue) * 100}%`,
                                    background: 'var(--accent-green)',
                                    transition: 'width 0.5s ease',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 11, fontWeight: 600, color: '#fff'
                                }}>
                                    {`${((stats.profit / stats.revenue) * 100).toFixed(0)}% Ganancia`}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Materials table */}
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Material</th>
                                <th style={{ textAlign: 'center' }}>Cantidad</th>
                                <th style={{ textAlign: 'center' }}>Precio Unit.</th>
                                <th style={{ textAlign: 'center' }}>Subtotal</th>
                                {isActive && <th style={{ textAlign: 'center', width: 50 }}></th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loteMateriales.length > 0 ? loteMateriales.map(m => (
                                <tr key={m.id}>
                                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                        {m.fabricacion_catalogo?.nombre || '—'}
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>
                                            {m.fabricacion_catalogo?.unidad || ''}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--accent-blue)' }}>{m.cantidad}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 500 }}>{fmt(m.precio_unitario)}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--accent-orange)' }}>
                                        {fmt(m.cantidad * m.precio_unitario)}
                                    </td>
                                    {isActive && (
                                        <td style={{ textAlign: 'center' }}>
                                            <button className="btn btn-secondary btn-sm" style={{ padding: '4px 6px', color: 'var(--accent-red)' }} onClick={() => handleDeleteMaterial(m.id)}>
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={isActive ? 5 : 4}>
                                        <div className="empty-state">
                                            <Package size={32} />
                                            <h4>Sin materiales</h4>
                                            <p>Agregue materiales para calcular el costo de fabricación.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                            {loteMateriales.length > 0 && (
                                <tr style={{ fontWeight: 700, fontSize: 14 }}>
                                    <td colSpan={2}></td>
                                    <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>TOTAL</td>
                                    <td style={{ textAlign: 'center', color: 'var(--accent-orange)' }}>{fmt(stats.totalCost)}</td>
                                    {isActive && <td></td>}
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Modal: Add Materials */}
                {showAddMaterial && (
                    <div className="modal-overlay" onClick={() => setShowAddMaterial(false)}>
                        <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
                            <div className="modal-header">
                                <h3>Agregar Materiales al Lote</h3>
                                <button className="modal-close" onClick={() => setShowAddMaterial(false)}><X size={18} /></button>
                            </div>
                            <form onSubmit={handleAddMateriales}>
                                <div className="modal-body">
                                    {materialRows.map((row, idx) => (
                                        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px 32px', gap: 8, marginBottom: 8, alignItems: 'end' }}>
                                            <div className="form-group" style={{ margin: 0 }}>
                                                {idx === 0 && <label>Material</label>}
                                                <select className="form-select" value={row.catalogo_id} onChange={e => {
                                                    const rows = [...materialRows];
                                                    rows[idx].catalogo_id = e.target.value;
                                                    const cat = catalogo.find(c => c.id === e.target.value);
                                                    if (cat) rows[idx].precio_unitario = cat.precio_estandar;
                                                    setMaterialRows(rows);
                                                }} required>
                                                    <option value="">Seleccionar...</option>
                                                    {catalogo.filter(c => {
                                                        if (c.id === row.catalogo_id) return true;
                                                        const usedInRows = materialRows.some((r, i) => i !== idx && r.catalogo_id === c.id);
                                                        const usedInLote = loteMateriales.some(m => m.catalogo_id === c.id);
                                                        return !usedInRows && !usedInLote;
                                                    }).map(c => (
                                                        <option key={c.id} value={c.id}>{c.nombre}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="form-group" style={{ margin: 0 }}>
                                                {idx === 0 && <label>Cantidad</label>}
                                                <input type="number" className="form-input" value={row.cantidad} min="0.01" step="any"
                                                    onChange={e => { const rows = [...materialRows]; rows[idx].cantidad = e.target.value; setMaterialRows(rows); }} required />
                                            </div>
                                            <div className="form-group" style={{ margin: 0 }}>
                                                {idx === 0 && <label>Precio Unit.</label>}
                                                <input type="number" className="form-input" value={row.precio_unitario} min="0" step="any"
                                                    onChange={e => { const rows = [...materialRows]; rows[idx].precio_unitario = e.target.value; setMaterialRows(rows); }} required />
                                            </div>
                                            <button type="button" className="btn btn-secondary btn-sm" style={{ padding: '6px', height: 36, alignSelf: idx === 0 ? 'end' : 'center' }}
                                                onClick={() => { if (materialRows.length > 1) setMaterialRows(materialRows.filter((_, i) => i !== idx)); }}>
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 4 }}
                                        onClick={() => setMaterialRows([...materialRows, { catalogo_id: '', cantidad: '', precio_unitario: '' }])}>
                                        <Plus size={14} /> Añadir fila
                                    </button>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowAddMaterial(false)}>Cancelar</button>
                                    <button type="submit" className="btn btn-primary">Guardar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Modal: Edit Lote */}
                {showEditLote && (
                    <div className="modal-overlay" onClick={() => setShowEditLote(false)}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Editar Lote</h3>
                                <button className="modal-close" onClick={() => setShowEditLote(false)}><X size={18} /></button>
                            </div>
                            <form onSubmit={handleEditLote}>
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label>Código *</label>
                                        <input className="form-input" value={loteForm.codigo} onChange={e => setLoteForm({ ...loteForm, codigo: e.target.value })} required />
                                    </div>
                                    <div className="form-group">
                                        <label>Descripción</label>
                                        <input className="form-input" value={loteForm.descripcion} onChange={e => setLoteForm({ ...loteForm, descripcion: e.target.value })} />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        <div className="form-group">
                                            <label>Fecha</label>
                                            <input type="date" className="form-input" value={loteForm.fecha} onChange={e => setLoteForm({ ...loteForm, fecha: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label>Cantidad de herrajes</label>
                                            <input type="number" className="form-input" value={loteForm.cantidad_herrajes} min="1"
                                                onChange={e => setLoteForm({ ...loteForm, cantidad_herrajes: e.target.value })} required />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Precio de venta por herraje</label>
                                        <input type="number" className="form-input" value={loteForm.precio_venta_unitario} min="0" step="any"
                                            onChange={e => setLoteForm({ ...loteForm, precio_venta_unitario: e.target.value })} required />
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowEditLote(false)}>Cancelar</button>
                                    <button type="submit" className="btn btn-primary">Guardar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ==================== LIST VIEW ====================
    return (
        <div>
            <div className="page-header">
                <div>
                    <h2>Fabricación de Herrajes</h2>
                    <p className="page-header-subtitle">Control de lotes, costos y rentabilidad</p>
                </div>
                <div className="btn-group">
                    <button className="btn btn-secondary" onClick={() => setShowCatalogo(true)}>
                        <Settings2 size={16} /> Catálogo
                    </button>
                    <button className="btn btn-primary" onClick={openNewLote}>
                        <Plus size={16} /> Nuevo Lote
                    </button>
                </div>
            </div>

            <div className="search-bar">
                <Search />
                <input type="text" placeholder="Buscar lote por código o descripción..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {/* Lotes list */}
            {filteredLotes.length > 0 ? (
                <div className="card-grid">
                    {filteredLotes.map((lote, i) => (
                        <LoteCard key={lote.id} lote={lote} index={i} onClick={() => selectLote(lote)} onDelete={() => handleDeleteLote(lote)} />
                    ))}
                </div>
            ) : (
                <div className="empty-state" style={{ marginTop: 40 }}>
                    <Hammer size={40} />
                    <h4>{search ? 'Sin resultados' : 'Sin lotes de fabricación'}</h4>
                    <p>{search ? 'Intente con otro término' : 'Cree un nuevo lote para comenzar.'}</p>
                </div>
            )}

            {/* Modal: New Lote */}
            {showNewLote && (
                <div className="modal-overlay" onClick={() => setShowNewLote(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Nuevo Lote de Fabricación</h3>
                            <button className="modal-close" onClick={() => setShowNewLote(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleCreateLote}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Código</label>
                                    <input className="form-input" value={loteForm.codigo} readOnly style={{ opacity: 0.7, cursor: 'default' }} />
                                </div>
                                <div className="form-group">
                                    <label>Descripción</label>
                                    <input className="form-input" placeholder="Descripción opcional" value={loteForm.descripcion} onChange={e => setLoteForm({ ...loteForm, descripcion: e.target.value })} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div className="form-group">
                                        <label>Fecha</label>
                                        <input type="date" className="form-input" value={loteForm.fecha} onChange={e => setLoteForm({ ...loteForm, fecha: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Cantidad de herrajes</label>
                                        <input type="number" className="form-input" value={loteForm.cantidad_herrajes} min="1"
                                            onChange={e => setLoteForm({ ...loteForm, cantidad_herrajes: e.target.value })} required />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Precio de venta por herraje</label>
                                    <input type="number" className="form-input" value={loteForm.precio_venta_unitario} min="0" step="any"
                                        placeholder="0.00" onChange={e => setLoteForm({ ...loteForm, precio_venta_unitario: e.target.value })} required />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowNewLote(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">Crear Lote</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Catálogo */}
            {showCatalogo && (
                <div className="modal-overlay" onClick={() => { setShowCatalogo(false); setEditCatalogoItem(null); }}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
                        <div className="modal-header">
                            <h3>Catálogo de Materiales</h3>
                            <button className="modal-close" onClick={() => { setShowCatalogo(false); setEditCatalogoItem(null); }}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                                <button className="btn btn-primary btn-sm" onClick={() => {
                                    setCatForm({ nombre: '', precio_estandar: '', unidad: 'unidad' });
                                    setShowAddCatalogo(true);
                                }}>
                                    <Plus size={14} /> Agregar Material
                                </button>
                            </div>
                            {catalogo.length > 0 ? (
                                <div className="table-container" style={{ marginBottom: 0 }}>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Material</th>
                                                <th style={{ textAlign: 'center' }}>Precio Estándar</th>
                                                <th style={{ textAlign: 'center' }}>Unidad</th>
                                                <th style={{ textAlign: 'center', width: 80 }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {catalogo.map(c => (
                                                <tr key={c.id}>
                                                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{c.nombre}</td>
                                                    <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--accent-blue)' }}>
                                                        {c.precio_estandar.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>{c.unidad}</td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                                                            <button className="btn btn-secondary btn-sm" style={{ padding: '4px 6px' }} onClick={() => {
                                                                setEditCatalogoItem(c);
                                                                setCatForm({ nombre: c.nombre, precio_estandar: c.precio_estandar, unidad: c.unidad });
                                                            }}>
                                                                <Edit2 size={13} />
                                                            </button>
                                                            <button className="btn btn-secondary btn-sm" style={{ padding: '4px 6px', color: 'var(--accent-red)' }}
                                                                onClick={() => handleDeleteCatalogo(c)}>
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="empty-state">
                                    <Package size={28} />
                                    <p>Sin materiales en el catálogo.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Add/Edit catálogo item */}
            {(showAddCatalogo || editCatalogoItem) && (
                <div className="modal-overlay" style={{ zIndex: 1001 }} onClick={() => { setShowAddCatalogo(false); setEditCatalogoItem(null); }}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <div className="modal-header">
                            <h3>{editCatalogoItem ? 'Editar Material' : 'Nuevo Material'}</h3>
                            <button className="modal-close" onClick={() => { setShowAddCatalogo(false); setEditCatalogoItem(null); }}><X size={18} /></button>
                        </div>
                        <form onSubmit={editCatalogoItem ? handleEditCatalogo : handleAddCatalogo}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Nombre *</label>
                                    <input className="form-input" value={catForm.nombre} onChange={e => setCatForm({ ...catForm, nombre: e.target.value })} required />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div className="form-group">
                                        <label>Precio Estándar</label>
                                        <input type="number" className="form-input" value={catForm.precio_estandar} min="0" step="any"
                                            onChange={e => setCatForm({ ...catForm, precio_estandar: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Unidad</label>
                                        <select className="form-select" value={catForm.unidad} onChange={e => setCatForm({ ...catForm, unidad: e.target.value })}>
                                            <option value="unidad">Unidad</option>
                                            <option value="kg">Kg</option>
                                            <option value="m">Metro</option>
                                            <option value="litro">Litro</option>
                                            <option value="pie">Pie</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => { setShowAddCatalogo(false); setEditCatalogoItem(null); }}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">{editCatalogoItem ? 'Guardar' : 'Agregar'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- LOTE CARD COMPONENT ---
function LoteCard({ lote, index, onClick, onDelete }) {
    const [mats, setMats] = useState([]);
    useEffect(() => {
        supabase.from('fabricacion_materiales').select('cantidad, precio_unitario').eq('lote_id', lote.id)
            .then(({ data }) => setMats(data || []));
    }, [lote.id]);

    const totalCost = mats.reduce((s, m) => s + m.cantidad * m.precio_unitario, 0);
    const revenue = lote.cantidad_herrajes * (lote.precio_venta_unitario || 0);
    const profit = revenue - totalCost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const fmt = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return (
        <div className="proyecto-card" style={{ animationDelay: `${index * 0.06}s` }} onClick={onClick}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <h4 style={{ flex: 1 }}>{lote.codigo}</h4>
                <span className={`badge badge-${lote.estado === 'activo' ? 'green' : 'blue'}`} style={{ fontSize: 10 }}>
                    {lote.estado}
                </span>
                <button className="btn btn-secondary btn-sm" style={{ padding: '4px 6px', color: 'var(--accent-red)' }}
                    onClick={e => { e.stopPropagation(); onDelete(); }}>
                    <Trash2 size={14} />
                </button>
            </div>
            <p style={{ marginBottom: 12 }}>
                📅 {lote.fecha} · {lote.cantidad_herrajes} herrajes
                {lote.descripcion ? ` · ${lote.descripcion}` : ''}
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 80 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Costo</div>
                    <div style={{ fontWeight: 600, color: 'var(--accent-orange)', fontSize: 14 }}>{fmt(totalCost)}</div>
                </div>
                <div style={{ flex: 1, minWidth: 80 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Ganancia</div>
                    <div style={{ fontWeight: 600, color: profit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontSize: 14 }}>
                        {fmt(profit)}
                    </div>
                </div>
                <div style={{ minWidth: 55 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Margen</div>
                    <div style={{ fontWeight: 700, color: margin >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontSize: 14 }}>
                        {margin.toFixed(1)}%
                    </div>
                </div>
            </div>
        </div>
    );
}
