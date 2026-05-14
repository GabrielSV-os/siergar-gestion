import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRealtime } from '../lib/useRealtime';
import { useToast } from '../components/Toast';
import { Package, Plus, Search, Upload, ArrowDownCircle, ArrowUpCircle, X, Trash2, History, Download, FileText, MoreVertical, FileSpreadsheet } from 'lucide-react';
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
    const [showActionsDropdown, setShowActionsDropdown] = useState(false);
    const [showExcelImport, setShowExcelImport] = useState(false);
    const [excelPreview, setExcelPreview] = useState([]);
    const [excelError, setExcelError] = useState('');

    // Form states
    const [newMaterial, setNewMaterial] = useState({ nombre: '', codigo: '', unidad: 'unidad' });
    const [entradaForm, setEntradaForm] = useState({ material_id: '', cantidad: '', descripcion: '' });
    const [bulkRows, setBulkRows] = useState([{ material_id: '', cantidad: '', search: '' }]);

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

        // Consolidate duplicate materials into single entries
        const consolidated = {};
        for (const row of validRows) {
            const qty = parseFloat(row.cantidad);
            if (consolidated[row.material_id]) {
                consolidated[row.material_id] += qty;
            } else {
                consolidated[row.material_id] = qty;
            }
        }

        for (const [material_id, qty] of Object.entries(consolidated)) {
            await supabase.from('movimientos_inventario').insert({
                material_id,
                tipo: 'entrada',
                cantidad: qty,
                descripcion: 'Entrada bulk'
            });

            const { data: inv } = await supabase.from('inventario')
                .select('cantidad')
                .eq('material_id', material_id)
                .single();

            if (inv) {
                await supabase.from('inventario')
                    .update({ cantidad: inv.cantidad + qty, updated_at: new Date().toISOString() })
                    .eq('material_id', material_id);
            } else {
                await supabase.from('inventario')
                    .insert({ material_id, cantidad: qty });
            }
        }

        toast(`${validRows.length} materiales actualizados`);
        setBulkRows([{ material_id: '', cantidad: '', search: '' }]);
        setShowBulkEntrada(false);
        loadData();
    }



    function handleExcelFile(e) {
        const file = e.target.files[0];
        if (!file) return;
        setExcelError('');
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const wb = XLSX.read(evt.target.result, { type: 'array' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
                if (rows.length === 0) { setExcelError('El archivo está vacío.'); return; }
                // Normalize column names (case-insensitive, trim)
                const normalized = rows.map(row => {
                    const obj = {};
                    Object.keys(row).forEach(k => { obj[k.trim().toLowerCase()] = row[k]; });
                    return obj;
                });
                // Validate required columns
                const first = normalized[0];
                const hasMaterial = 'material' in first || 'nombre' in first;
                const hasStock = 'stock' in first || 'cantidad' in first;
                if (!hasMaterial || !hasStock) {
                    setExcelError('El Excel debe tener al menos las columnas "Material" y "Stock". Revise el formato de ejemplo.');
                    return;
                }
                const parsed = normalized.map(r => ({
                    codigo: String(r.codigo || r['código'] || '').trim(),
                    nombre: String(r.material || r.nombre || '').trim().toUpperCase(),
                    unidad: String(r.unidad || 'unidad').trim().toLowerCase(),
                    stock: parseFloat(r.stock || r.cantidad || 0) || 0
                })).filter(r => r.nombre && r.stock > 0);
                if (parsed.length === 0) { setExcelError('No se encontraron filas válidas con nombre y stock > 0.'); return; }
                setExcelPreview(parsed);
            } catch (err) {
                setExcelError('Error al leer el archivo: ' + err.message);
            }
        };
        reader.readAsArrayBuffer(file);
    }

    async function handleExcelImport() {
        if (excelPreview.length === 0) return;
        let created = 0, updated = 0;
        for (const row of excelPreview) {
            // Find existing material by name or code
            let mat = materiales.find(m =>
                m.nombre.toUpperCase() === row.nombre ||
                (row.codigo && m.codigo && m.codigo.toUpperCase() === row.codigo.toUpperCase())
            );
            if (!mat) {
                // Create new material
                const { data, error } = await supabase.from('materiales').insert({
                    nombre: row.nombre, codigo: row.codigo || null, unidad: row.unidad
                }).select().single();
                if (error) { toast(`Error creando ${row.nombre}: ${error.message}`, 'error'); continue; }
                mat = data;
                created++;
            }
            // Register entry movement
            await supabase.from('movimientos_inventario').insert({
                material_id: mat.id, tipo: 'entrada', cantidad: row.stock, descripcion: 'Importación desde Excel'
            });
            // Update or create inventory
            const { data: inv } = await supabase.from('inventario').select('cantidad').eq('material_id', mat.id).single();
            if (inv) {
                await supabase.from('inventario').update({ cantidad: inv.cantidad + row.stock, updated_at: new Date().toISOString() }).eq('material_id', mat.id);
            } else {
                await supabase.from('inventario').insert({ material_id: mat.id, cantidad: row.stock });
            }
            updated++;
        }
        toast(`Importación completada: ${created} materiales nuevos, ${updated} entradas registradas`);
        setExcelPreview([]);
        setShowExcelImport(false);
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
                <div className="btn-group" style={{ position: 'relative' }}>
                    <button className="btn btn-primary" onClick={() => setShowAddMaterial(true)}>
                        <Plus size={16} /> Agregar Material
                    </button>
                    <button
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '6px 8px' }}
                        onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                    >
                        <MoreVertical size={16} />
                    </button>

                    {showActionsDropdown && (
                        <>
                            <div className="animated-dropdown-backdrop" onClick={() => setShowActionsDropdown(false)} />
                            <div className="animated-dropdown">
                                <div className="animated-dropdown-label">Acciones</div>
                                <div className="animated-dropdown-separator" />
                                <button
                                    className="animated-dropdown-item"
                                    onClick={() => { setShowActionsDropdown(false); setShowEntrada(true); }}
                                >
                                    <ArrowDownCircle size={14} /> Registrar Entrada
                                </button>
                                <button
                                    className="animated-dropdown-item"
                                    onClick={() => { setShowActionsDropdown(false); setShowBulkEntrada(true); }}
                                >
                                    <Upload size={14} /> Entrada Bulk
                                </button>
                                <button
                                    className="animated-dropdown-item"
                                    onClick={() => { setShowActionsDropdown(false); setShowExcelImport(true); setExcelPreview([]); setExcelError(''); }}
                                >
                                    <FileSpreadsheet size={14} /> Importar desde Excel
                                </button>
                            </div>
                        </>
                    )}
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
                                {bulkRows.map((row, i) => {
                                    const usedIds = bulkRows.filter((_, j) => j !== i).map(r => r.material_id).filter(Boolean);
                                    const available = materiales.filter(m => !usedIds.includes(m.id));
                                    const searchTerm = (row.search || '').toLowerCase();
                                    const filtered = searchTerm
                                        ? available.filter(m => m.nombre.toLowerCase().includes(searchTerm) || (m.codigo && m.codigo.toLowerCase().includes(searchTerm)))
                                        : available;
                                    const selectedMat = materiales.find(m => m.id === row.material_id);

                                    return (
                                        <div className="bulk-row" key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 36px', gap: 8, marginBottom: 8, alignItems: 'start' }}>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    className="form-input"
                                                    placeholder="Buscar por nombre o código..."
                                                    value={row.material_id ? (selectedMat ? `${selectedMat.codigo ? `[${selectedMat.codigo}] ` : ''}${selectedMat.nombre}` : '') : row.search}
                                                    onChange={e => {
                                                        const nr = [...bulkRows];
                                                        nr[i].search = e.target.value;
                                                        nr[i].material_id = '';
                                                        setBulkRows(nr);
                                                    }}
                                                    onFocus={() => {
                                                        if (row.material_id) {
                                                            const nr = [...bulkRows];
                                                            nr[i].search = '';
                                                            nr[i].material_id = '';
                                                            setBulkRows(nr);
                                                        }
                                                    }}
                                                    autoComplete="off"
                                                />
                                                {!row.material_id && (row.search !== undefined) && document.activeElement?.closest('.bulk-row') === document.querySelectorAll('.bulk-row')[i] ? null : null}
                                                {!row.material_id && (
                                                    <div style={{
                                                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                                                        background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                                                        borderRadius: 'var(--radius-sm)', maxHeight: 180, overflowY: 'auto',
                                                        boxShadow: 'var(--shadow-lg)', display: row.search ? 'block' : 'none'
                                                    }}>
                                                        {filtered.length > 0 ? filtered.map(m => (
                                                            <div key={m.id}
                                                                style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, color: 'var(--text-primary)', borderBottom: '1px solid var(--border-light)' }}
                                                                onMouseDown={e => {
                                                                    e.preventDefault();
                                                                    const nr = [...bulkRows];
                                                                    nr[i].material_id = m.id;
                                                                    nr[i].search = '';
                                                                    setBulkRows(nr);
                                                                }}
                                                                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                            >
                                                                {m.codigo ? <span style={{ color: 'var(--accent-blue)', marginRight: 6 }}>[{m.codigo}]</span> : null}
                                                                {m.nombre}
                                                            </div>
                                                        )) : (
                                                            <div style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>Sin resultados</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <input className="form-input" type="number" min="0.01" step="0.01"
                                                placeholder="Cant."
                                                value={row.cantidad}
                                                onChange={e => {
                                                    const nr = [...bulkRows];
                                                    nr[i].cantidad = e.target.value;
                                                    setBulkRows(nr);
                                                }}
                                            />
                                            <button type="button" className="btn btn-secondary btn-sm" style={{ padding: '6px', height: 36 }} onClick={() => {
                                                if (bulkRows.length > 1) setBulkRows(bulkRows.filter((_, j) => j !== i));
                                            }}>
                                                <X size={14} />
                                            </button>
                                        </div>
                                    );
                                })}
                                <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 8 }}
                                    onClick={() => setBulkRows([...bulkRows, { material_id: '', cantidad: '', search: '' }])}>
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

            {/* Modal: Importar Excel */}
            {showExcelImport && (
                <div className="modal-overlay" onClick={() => setShowExcelImport(false)}>
                    <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3><FileSpreadsheet size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />Importar Materiales desde Excel</h3>
                            <button className="modal-close" onClick={() => setShowExcelImport(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            {excelPreview.length === 0 ? (
                                <>
                                    <div style={{ marginBottom: 16 }}>
                                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                                            Suba un archivo Excel (.xlsx) con los materiales a importar. Los materiales existentes se les sumará el stock; los nuevos se crearán automáticamente.
                                        </p>
                                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: 16, marginBottom: 16 }}>
                                            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>📋 Formato requerido del Excel:</p>
                                            <div className="table-container" style={{ marginBottom: 0 }}>
                                                <table style={{ fontSize: 12 }}>
                                                    <thead>
                                                        <tr>
                                                            <th style={{ background: 'var(--accent-blue)', color: '#fff' }}>CÓDIGO</th>
                                                            <th style={{ background: 'var(--accent-blue)', color: '#fff' }}>MATERIAL</th>
                                                            <th style={{ background: 'var(--accent-blue)', color: '#fff' }}>UNIDAD</th>
                                                            <th style={{ background: 'var(--accent-blue)', color: '#fff' }}>STOCK</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        <tr>
                                                            <td style={{ color: 'var(--text-muted)' }}>ABR-001</td>
                                                            <td>ABRAZADERA CRUCE</td>
                                                            <td style={{ color: 'var(--text-muted)' }}>unidad</td>
                                                            <td style={{ fontWeight: 600, color: 'var(--accent-green)' }}>500</td>
                                                        </tr>
                                                        <tr>
                                                            <td style={{ color: 'var(--text-muted)' }}>TUB-002</td>
                                                            <td>TUBO GALVANIZADO 3M</td>
                                                            <td style={{ color: 'var(--text-muted)' }}>unidad</td>
                                                            <td style={{ fontWeight: 600, color: 'var(--accent-green)' }}>120</td>
                                                        </tr>
                                                        <tr>
                                                            <td style={{ color: 'var(--text-muted)' }}>CAB-010</td>
                                                            <td>CABLE FIBRA ÓPTICA</td>
                                                            <td style={{ color: 'var(--text-muted)' }}>metros</td>
                                                            <td style={{ fontWeight: 600, color: 'var(--accent-green)' }}>2000</td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                                                * Las columnas <strong>Material</strong> y <strong>Stock</strong> son obligatorias. Código y Unidad son opcionales (si no se indica unidad, se usará "unidad" por defecto).
                                            </p>
                                        </div>
                                    </div>
                                    <input type="file" accept=".xlsx,.xls" onChange={handleExcelFile} className="form-input" style={{ padding: 8 }} />
                                    {excelError && (
                                        <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--accent-red)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--accent-red)' }}>
                                            ⚠ {excelError}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                                        Se encontraron <strong style={{ color: 'var(--accent-green)' }}>{excelPreview.length}</strong> materiales válidos. Revise antes de confirmar:
                                    </p>
                                    <div className="table-container" style={{ maxHeight: 300, overflowY: 'auto' }}>
                                        <table style={{ fontSize: 12 }}>
                                            <thead>
                                                <tr>
                                                    <th>Código</th>
                                                    <th>Material</th>
                                                    <th>Unidad</th>
                                                    <th style={{ textAlign: 'center' }}>Stock</th>
                                                    <th style={{ textAlign: 'center' }}>Estado</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {excelPreview.map((row, i) => {
                                                    const exists = materiales.some(m =>
                                                        m.nombre.toUpperCase() === row.nombre ||
                                                        (row.codigo && m.codigo && m.codigo.toUpperCase() === row.codigo.toUpperCase())
                                                    );
                                                    return (
                                                        <tr key={i}>
                                                            <td style={{ color: 'var(--text-muted)' }}>{row.codigo || '—'}</td>
                                                            <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{row.nombre}</td>
                                                            <td style={{ color: 'var(--text-muted)' }}>{row.unidad}</td>
                                                            <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--accent-green)' }}>{row.stock}</td>
                                                            <td style={{ textAlign: 'center' }}>
                                                                <span style={{
                                                                    fontSize: 11, padding: '2px 8px', borderRadius: 10,
                                                                    background: exists ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)',
                                                                    color: exists ? 'var(--accent-blue)' : 'var(--accent-green)'
                                                                }}>
                                                                    {exists ? 'Sumar stock' : 'Nuevo'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="form-actions" style={{ marginTop: 16 }}>
                                        <button type="button" className="btn btn-secondary" onClick={() => { setExcelPreview([]); setExcelError(''); }}>
                                            Cambiar archivo
                                        </button>
                                        <button type="button" className="btn btn-success" onClick={handleExcelImport}>
                                            <Upload size={14} /> Confirmar Importación ({excelPreview.length})
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
