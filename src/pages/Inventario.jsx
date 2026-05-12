import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRealtime } from '../lib/useRealtime';
import { useToast } from '../components/Toast';
import { Package, Plus, Search, Upload, ArrowDownCircle, ArrowUpCircle, X, Trash2, History, Download, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import CountUp from '../components/CountUp';

export default function Inventario() {
    const toast = useToast();
    const [materiales, setMateriales] = useState([]);
    const [movimientos, setMovimientos] = useState([]);
    const [consumos, setConsumos] = useState([]);
    const [proyectoInventario, setProyectoInventario] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [searchMovimientos, setSearchMovimientos] = useState('');
    const [activeTab, setActiveTab] = useState('stock');
    const [showAddMaterial, setShowAddMaterial] = useState(false);
    const [showEntrada, setShowEntrada] = useState(false);
    const [showBulkEntrada, setShowBulkEntrada] = useState(false);

    // Form states
    const [newMaterial, setNewMaterial] = useState({ nombre: '', codigo: '', unidad: 'unidad' });
    const [entradaForm, setEntradaForm] = useState({ material_id: '', cantidad: '', descripcion: '' });
    const [bulkRows, setBulkRows] = useState([{ material_id: '', cantidad: '' }]);

    useEffect(() => {
        loadData();
    }, []);

    useRealtime(
        ['materiales', 'inventario', 'movimientos_inventario', 'consumo_materiales', 'proyecto_inventario'],
        loadData,
        'inventario-realtime'
    );

    async function loadData(showSpinner = true) {
        if (showSpinner && materiales.length === 0) setLoading(true);
        try {
            const [matRes, movRes, consRes, pInvRes] = await Promise.all([
                supabase.from('materiales')
                    .select('*, inventario(cantidad)')
                    .order('nombre'),
                supabase.from('movimientos_inventario')
                    .select('*, materiales(nombre), proyectos(nombre), brigadas(nombre)')
                    .order('created_at', { ascending: false })
                    .limit(100),
                supabase.from('consumo_materiales')
                    .select('tipo, cantidad, material_id'),
                supabase.from('proyecto_inventario')
                    .select('material_id, cantidad')
            ]);
            setMateriales(matRes.data || []);
            setMovimientos(movRes.data || []);
            setConsumos(consRes.data || []);
            setProyectoInventario(pInvRes.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddMaterial(e) {
        e.preventDefault();
        const { data, error } = await supabase.from('materiales')
            .insert({ nombre: newMaterial.nombre.toUpperCase(), codigo: newMaterial.codigo, unidad: newMaterial.unidad })
            .select()
            .single();

        if (error) {
            toast(error.message, 'error');
            return;
        }

        // Create inventory record
        await supabase.from('inventario').insert({ material_id: data.id, cantidad: 0 });

        toast('Material agregado correctamente');
        setNewMaterial({ nombre: '', codigo: '', unidad: 'unidad' });
        setShowAddMaterial(false);
        loadData();
    }

    async function handleEntrada(e) {
        e.preventDefault();
        const qty = parseFloat(entradaForm.cantidad);
        if (!entradaForm.material_id || qty <= 0) {
            toast('Seleccione material y cantidad válida', 'error');
            return;
        }

        try {
            // Record movement
            const { error: movError } = await supabase.from('movimientos_inventario').insert({
                material_id: entradaForm.material_id,
                tipo: 'entrada',
                cantidad: qty,
                descripcion: entradaForm.descripcion || 'Entrada de inventario'
            });
            if (movError) { console.error('Movement error:', movError); toast(movError.message, 'error'); return; }

            // Get current inventory
            const { data: inv } = await supabase.from('inventario')
                .select('id, cantidad')
                .eq('material_id', entradaForm.material_id)
                .maybeSingle();

            if (inv) {
                const newQty = (inv.cantidad || 0) + qty;
                const { data: updData, error: updError } = await supabase.from('inventario')
                    .update({ cantidad: newQty, updated_at: new Date().toISOString() })
                    .eq('id', inv.id)
                    .select();
                if (updError) { toast('Error actualizando inventario: ' + updError.message, 'error'); return; }
                if (!updData || updData.length === 0) {
                    console.warn('Update returned no rows, trying direct SQL approach');
                    // Fallback: delete and re-insert
                    await supabase.from('inventario').delete().eq('id', inv.id);
                    const { error: reinsertErr } = await supabase.from('inventario')
                        .insert({ material_id: entradaForm.material_id, cantidad: newQty });
                    if (reinsertErr) console.error('Re-insert error:', reinsertErr);
                }
            } else {
                const { error: insError } = await supabase.from('inventario')
                    .insert({ material_id: entradaForm.material_id, cantidad: qty });
                if (insError) { console.error('Inventory insert error:', insError); toast(insError.message, 'error'); return; }
            }

            toast(`Entrada de ${qty} unidades registrada`);
            setEntradaForm({ material_id: '', cantidad: '', descripcion: '' });
            setShowEntrada(false);
            loadData();
        } catch (err) {
            console.error('Entrada error:', err);
            toast('Error al registrar entrada', 'error');
        }
    }

    async function handleBulkEntrada(e) {
        e.preventDefault();
        const validRows = bulkRows.filter(r => r.material_id && parseFloat(r.cantidad) > 0);
        if (validRows.length === 0) {
            toast('Agregue al menos un material con cantidad válida', 'error');
            return;
        }

        for (const row of validRows) {
            const qty = parseFloat(row.cantidad);

            await supabase.from('movimientos_inventario').insert({
                material_id: row.material_id,
                tipo: 'entrada',
                cantidad: qty,
                descripcion: 'Entrada bulk'
            });

            const { data: inv } = await supabase.from('inventario')
                .select('cantidad')
                .eq('material_id', row.material_id)
                .single();

            if (inv) {
                await supabase.from('inventario')
                    .update({ cantidad: inv.cantidad + qty, updated_at: new Date().toISOString() })
                    .eq('material_id', row.material_id);
            } else {
                await supabase.from('inventario')
                    .insert({ material_id: row.material_id, cantidad: qty });
            }
        }

        toast(`${validRows.length} materiales actualizados`);
        setBulkRows([{ material_id: '', cantidad: '' }]);
        setShowBulkEntrada(false);
        loadData();
    }



    const filteredMateriales = materiales.filter(m =>
        m.nombre.toLowerCase().includes(search.toLowerCase()) ||
        (m.codigo && m.codigo.toLowerCase().includes(search.toLowerCase()))
    );

    if (loading) return <div className="loading-spinner" />;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h2>Inventario</h2>
                    <p className="page-header-subtitle">Gestión de materiales y stock</p>
                </div>
                <div className="btn-group">
                    <button className="btn btn-secondary" onClick={() => setShowBulkEntrada(true)}>
                        <Upload size={16} /> Entrada Bulk
                    </button>
                    <button className="btn btn-secondary" onClick={() => setShowEntrada(true)}>
                        <ArrowDownCircle size={16} /> Registrar Entrada
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowAddMaterial(true)}>
                        <Plus size={16} /> Agregar Material
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="tabs">
                    <button className={`tab ${activeTab === 'stock' ? 'active' : ''}`} onClick={() => setActiveTab('stock')}>
                        Stock Actual
                    </button>
                    <button className={`tab ${activeTab === 'movimientos' ? 'active' : ''}`} onClick={() => setActiveTab('movimientos')}>
                        Historial de Movimientos
                    </button>
                </div>
            </div>

            {activeTab === 'stock' && (
                <>
                    <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center' }}>
                        <div className="search-bar" style={{ margin: 0, flex: 1 }}>
                            <Search />
                            <input
                                type="text"
                                placeholder="Buscar material por nombre o código..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => {
                                const rows = filteredMateriales.map(m => {
                                    const invData = m.inventario;
                                    const stockAlmacen = Array.isArray(invData) ? (invData[0]?.cantidad ?? 0) : (invData?.cantidad ?? 0);
                                    const pInv = proyectoInventario.filter(pi => pi.material_id === m.id);
                                    const totalAsignado = pInv.reduce((s, pi) => s + pi.cantidad, 0);
                                    const matConsumos = consumos.filter(c => c.material_id === m.id && c.tipo === 'consumo');
                                    const totalConsumido = matConsumos.reduce((s, c) => s + c.cantidad, 0);
                                    const asignadoProyecto = Math.max(0, totalAsignado - totalConsumido);
                                    const total = stockAlmacen + asignadoProyecto;

                                    return {
                                        Código: m.codigo || '',
                                        Material: m.nombre,
                                        Unidad: m.unidad,
                                        'Stock Almacén': stockAlmacen,
                                        'Asignado a Proyecto': asignadoProyecto,
                                        Total: total
                                    };
                                });
                                const ws = XLSX.utils.json_to_sheet(rows);
                                const wb = XLSX.utils.book_new();
                                XLSX.utils.book_append_sheet(wb, ws, 'Stock Actual');
                                XLSX.writeFile(wb, `stock_actual_${new Date().toISOString().split('T')[0]}.xlsx`);
                                toast('Excel exportado correctamente');
                            }}>
                                <Download size={14} /> Exportar Excel
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => {
                                const doc = new jsPDF();
                                doc.setFontSize(16);
                                doc.text('Stock Actual de Inventario', 14, 20);
                                doc.setFontSize(10);
                                doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 14, 28);
                                autoTable(doc, {
                                    startY: 35,
                                    head: [['Código', 'Material', 'Unidad', 'Stock Almacén', 'Asignado a Proyecto', 'Total']],
                                    body: filteredMateriales.map(m => {
                                        const invData = m.inventario;
                                        const stockAlmacen = Array.isArray(invData) ? (invData[0]?.cantidad ?? 0) : (invData?.cantidad ?? 0);
                                        const pInv = proyectoInventario.filter(pi => pi.material_id === m.id);
                                        const totalAsignado = pInv.reduce((s, pi) => s + pi.cantidad, 0);
                                        const matConsumos = consumos.filter(c => c.material_id === m.id && c.tipo === 'consumo');
                                        const totalConsumido = matConsumos.reduce((s, c) => s + c.cantidad, 0);
                                        const asignadoProyecto = Math.max(0, totalAsignado - totalConsumido);
                                        const total = stockAlmacen + asignadoProyecto;
                                        return [m.codigo || '', m.nombre, m.unidad, stockAlmacen, asignadoProyecto, total];
                                    }),
                                    styles: { fontSize: 8 },
                                    headStyles: { fillColor: [99, 102, 241] }
                                });
                                doc.save(`stock_actual_${new Date().toISOString().split('T')[0]}.pdf`);
                                toast('PDF exportado correctamente');
                            }}>
                                <FileText size={14} /> Exportar PDF
                            </button>
                        </div>
                    </div>

                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Código</th>
                                    <th>Material</th>
                                    <th>Unidad</th>
                                    <th style={{ textAlign: 'center' }}>Stock en almacén</th>
                                    <th style={{ textAlign: 'center' }}>Asignado a proyecto</th>
                                    <th style={{ textAlign: 'center' }}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredMateriales.length > 0 ? filteredMateriales.map(m => {
                                    const invData = m.inventario;
                                    const stockAlmacen = Array.isArray(invData) ? (invData[0]?.cantidad ?? 0) : (invData?.cantidad ?? 0);

                                    const pInv = proyectoInventario.filter(pi => pi.material_id === m.id);
                                    const totalAsignado = pInv.reduce((s, pi) => s + pi.cantidad, 0);
                                    const matConsumos = consumos.filter(c => c.material_id === m.id && c.tipo === 'consumo');
                                    const totalConsumido = matConsumos.reduce((s, c) => s + c.cantidad, 0);
                                    const asignadoProyecto = Math.max(0, totalAsignado - totalConsumido);
                                    const total = stockAlmacen + asignadoProyecto;

                                    return (
                                        <tr key={m.id}>
                                            <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{m.codigo || '—'}</td>
                                            <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{m.nombre}</td>
                                            <td>{m.unidad}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span style={{
                                                    color: stockAlmacen > 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                                                    fontWeight: 600
                                                }}>
                                                    {stockAlmacen.toLocaleString()}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                                                    {asignadoProyecto.toLocaleString()}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 15 }}>
                                                    {total.toLocaleString()}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr>
                                        <td colSpan="6">
                                            <div className="empty-state">
                                                <Package size={32} />
                                                <h4>No se encontraron materiales</h4>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {activeTab === 'movimientos' && (() => {
                const filteredMovimientos = movimientos.filter(m => {
                    const term = searchMovimientos.toLowerCase();
                    return (
                        (m.materiales?.nombre || '').toLowerCase().includes(term) ||
                        (m.descripcion || '').toLowerCase().includes(term) ||
                        (m.proyectos?.nombre || '').toLowerCase().includes(term) ||
                        (m.brigadas?.nombre || '').toLowerCase().includes(term) ||
                        (m.tipo || '').toLowerCase().includes(term) ||
                        new Date(m.created_at).toLocaleDateString('es-ES').includes(term)
                    );
                });

                return (
                    <>
                        <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center' }}>
                            <div className="search-bar" style={{ margin: 0, flex: 1 }}>
                                <Search />
                                <input
                                    type="text"
                                    placeholder="Buscar por material, proyecto, brigada, tipo o fecha..."
                                    value={searchMovimientos}
                                    onChange={e => setSearchMovimientos(e.target.value)}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => {
                                    const rows = filteredMovimientos.map(m => ({
                                        Fecha: new Date(m.created_at).toLocaleDateString('es-ES'),
                                        Material: m.materiales?.nombre || '—',
                                        Tipo: m.tipo,
                                        Cantidad: m.cantidad,
                                        Descripcion: m.descripcion || '',
                                        Proyecto: m.proyectos?.nombre || '',
                                        Brigada: m.brigadas?.nombre || ''
                                    }));
                                    const ws = XLSX.utils.json_to_sheet(rows);
                                    const wb = XLSX.utils.book_new();
                                    XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
                                    XLSX.writeFile(wb, `movimientos_inventario_${new Date().toISOString().split('T')[0]}.xlsx`);
                                    toast('Excel exportado correctamente');
                                }}>
                                    <Download size={14} /> Exportar Excel
                                </button>
                                <button className="btn btn-secondary btn-sm" onClick={() => {
                                    const doc = new jsPDF();
                                    doc.setFontSize(16);
                                    doc.text('Historial de Movimientos de Inventario', 14, 20);
                                    doc.setFontSize(10);
                                    doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 14, 28);
                                    autoTable(doc, {
                                        startY: 35,
                                        head: [['Fecha', 'Material', 'Tipo', 'Cantidad', 'Descripción', 'Proyecto', 'Brigada']],
                                        body: filteredMovimientos.map(m => [
                                            new Date(m.created_at).toLocaleDateString('es-ES'),
                                            m.materiales?.nombre || '—',
                                            m.tipo,
                                            m.cantidad,
                                            m.descripcion || '',
                                            m.proyectos?.nombre || '',
                                            m.brigadas?.nombre || ''
                                        ]),
                                        styles: { fontSize: 8 },
                                        headStyles: { fillColor: [99, 102, 241] }
                                    });
                                    doc.save(`movimientos_inventario_${new Date().toISOString().split('T')[0]}.pdf`);
                                    toast('PDF exportado correctamente');
                                }}>
                                    <FileText size={14} /> Exportar PDF
                                </button>
                            </div>
                        </div>

                        {filteredMovimientos.length > 0 ? (
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Fecha</th>
                                            <th>Material</th>
                                            <th>Tipo</th>
                                            <th>Cantidad</th>
                                            <th>Descripción</th>
                                            <th>Proyecto</th>
                                            <th>Brigada</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredMovimientos.map(m => (
                                            <tr key={m.id}>
                                                <td>{new Date(m.created_at).toLocaleDateString('es-ES')}</td>
                                                <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{m.materiales?.nombre || '—'}</td>
                                                <td>
                                                    {m.tipo === 'entrada' ?
                                                        <span className="badge badge-green"><ArrowDownCircle size={12} style={{ marginRight: 4 }} /> Entrada</span> :
                                                        <span className="badge badge-red"><ArrowUpCircle size={12} style={{ marginRight: 4 }} /> Salida</span>
                                                    }
                                                </td>
                                                <td style={{ fontWeight: 600 }}>{m.cantidad}</td>
                                                <td>{m.descripcion || '—'}</td>
                                                <td>{m.proyectos?.nombre || '—'}</td>
                                                <td>{m.brigadas?.nombre || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="empty-state">
                                <History size={32} />
                                <h4>No se encontraron movimientos</h4>
                            </div>
                        )}
                    </>
                );
            })()}

            {/* Modal: Agregar Material */}
            {showAddMaterial && (
                <div className="modal-overlay" onClick={() => setShowAddMaterial(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Agregar Material</h3>
                            <button className="modal-close" onClick={() => setShowAddMaterial(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleAddMaterial}>
                                <div className="form-group">
                                    <label>Nombre del material *</label>
                                    <input className="form-input" required value={newMaterial.nombre}
                                        onChange={e => setNewMaterial({ ...newMaterial, nombre: e.target.value })}
                                        placeholder="Ej: CABLE COAXIAL RG-6"
                                    />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Código</label>
                                        <input className="form-input" value={newMaterial.codigo}
                                            onChange={e => setNewMaterial({ ...newMaterial, codigo: e.target.value })}
                                            placeholder="Ej: 1001234"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Unidad</label>
                                        <select className="form-select" value={newMaterial.unidad}
                                            onChange={e => setNewMaterial({ ...newMaterial, unidad: e.target.value })}>
                                            <option value="unidad">Unidad</option>
                                            <option value="metros">Metros</option>
                                            <option value="pies">Pies</option>
                                            <option value="kg">Kilogramos</option>
                                            <option value="rollo">Rollo</option>
                                            <option value="caja">Caja</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-actions">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowAddMaterial(false)}>Cancelar</button>
                                    <button type="submit" className="btn btn-primary">Agregar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Registrar Entrada */}
            {showEntrada && (
                <div className="modal-overlay" onClick={() => setShowEntrada(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Registrar Entrada de Inventario</h3>
                            <button className="modal-close" onClick={() => setShowEntrada(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleEntrada}>
                                <div className="form-group">
                                    <label>Material *</label>
                                    <select className="form-select" required value={entradaForm.material_id}
                                        onChange={e => setEntradaForm({ ...entradaForm, material_id: e.target.value })}>
                                        <option value="">Seleccionar material...</option>
                                        {materiales.map(m => (
                                            <option key={m.id} value={m.id}>{m.codigo ? `[${m.codigo}] ` : ''}{m.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Cantidad *</label>
                                    <input className="form-input" type="number" min="0.01" step="0.01" required
                                        value={entradaForm.cantidad}
                                        onChange={e => setEntradaForm({ ...entradaForm, cantidad: e.target.value })}
                                        placeholder="0"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Descripción</label>
                                    <input className="form-input" value={entradaForm.descripcion}
                                        onChange={e => setEntradaForm({ ...entradaForm, descripcion: e.target.value })}
                                        placeholder="Ej: Compra a proveedor X"
                                    />
                                </div>
                                <div className="form-actions">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowEntrada(false)}>Cancelar</button>
                                    <button type="submit" className="btn btn-success">Registrar Entrada</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Entrada Bulk */}
            {showBulkEntrada && (
                <div className="modal-overlay" onClick={() => setShowBulkEntrada(false)}>
                    <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Entrada de Materiales en Bulk</h3>
                            <button className="modal-close" onClick={() => setShowBulkEntrada(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleBulkEntrada}>
                                {bulkRows.map((row, i) => (
                                    <div className="bulk-row" key={i}>
                                        <select className="form-select" value={row.material_id}
                                            onChange={e => {
                                                const nr = [...bulkRows];
                                                nr[i].material_id = e.target.value;
                                                setBulkRows(nr);
                                            }}>
                                            <option value="">Seleccionar material...</option>
                                            {materiales.map(m => (
                                                <option key={m.id} value={m.id}>{m.codigo ? `[${m.codigo}] ` : ''}{m.nombre}</option>
                                            ))}
                                        </select>
                                        <input className="form-input" type="number" min="0.01" step="0.01"
                                            placeholder="Qty"
                                            value={row.cantidad}
                                            onChange={e => {
                                                const nr = [...bulkRows];
                                                nr[i].cantidad = e.target.value;
                                                setBulkRows(nr);
                                            }}
                                        />
                                        <button type="button" className="remove-btn" onClick={() => {
                                            if (bulkRows.length > 1) setBulkRows(bulkRows.filter((_, j) => j !== i));
                                        }}>
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                                <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 8 }}
                                    onClick={() => setBulkRows([...bulkRows, { material_id: '', cantidad: '' }])}>
                                    <Plus size={14} /> Agregar fila
                                </button>
                                <div className="form-actions">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowBulkEntrada(false)}>Cancelar</button>
                                    <button type="submit" className="btn btn-success">Registrar Todo</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
