import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useRealtime } from '../lib/useRealtime';
import { useToast } from '../components/Toast';
import {
    FolderKanban, Plus, X, ArrowLeft, Search, MapPin, Calendar,
    Users, Package, TrendingDown, Clock, Filter, ExternalLink, Pause, Play, FileText, Download, Edit2, Trash2, MoreVertical, Shield, AlertTriangle, ChevronDown
} from 'lucide-react';
import SearchableSelect from '../components/SearchableSelect';
import CountUp from '../components/CountUp';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Progress } from '../components/animate-ui/components/radix/progress';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    LogarithmicScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    LogarithmicScale,
    PointElement,
    LineElement,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

export default function Proyectos() {
    const toast = useToast();
    const [proyectos, setProyectos] = useState([]);
    const [brigadas, setBrigadas] = useState([]);
    const [materiales, setMateriales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [selectedProyecto, setSelectedProyecto] = useState(null);
    const [activeTab, setActiveTab] = useState('detalle');
    const [consumos, setConsumos] = useState([]);
    const [proyectoBrigadas, setProyectoBrigadas] = useState([]);
    const [cotizacionCatalogo, setCotizacionCatalogo] = useState([]);
    const [cotizacionItems, setCotizacionItems] = useState([]);
    const [showAddConsumo, setShowAddConsumo] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showAddConsumoDiario, setShowAddConsumoDiario] = useState(false);
    const [showAsignarBrigada, setShowAsignarBrigada] = useState(false);
    const [showPausar, setShowPausar] = useState(false);
    const [motivoPausa, setMotivoPausa] = useState('');
    const [showCancelar, setShowCancelar] = useState(false);
    const [motivoCancelar, setMotivoCancelar] = useState('');
    const [proyectoHistorial, setProyectoHistorial] = useState([]);
    const [showEdit, setShowEdit] = useState(false);
    const [editForm, setEditForm] = useState({
        nombre: '', estado: '', fecha_inicio: '', fecha_fin: '', url_carpeta: '', descripcion: '', ubicacion: ''
    });
    const [showActionsDropdown, setShowActionsDropdown] = useState(false);
    const [themeTrigger, setThemeTrigger] = useState(0);

    useEffect(() => {
        const observer = new MutationObserver(() => setThemeTrigger(t => t + 1));
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);

    // Estados para remoción de brigada y recibos
    const [showRemoveBrigadaModal, setShowRemoveBrigadaModal] = useState(false);
    const [brigadaToRemove, setBrigadaToRemove] = useState(null);
    const [removeAction, setRemoveAction] = useState('almacen');
    const [transferTarget, setTransferTarget] = useState('');
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [selectedReceipt, setSelectedReceipt] = useState(null);

    const [consumoDiarioForm, setConsumoDiarioForm] = useState({
        brigada_id: '', fecha: new Date().toISOString().split('T')[0], horas: ''
    });
    const [consumoDiarioRows, setConsumoDiarioRows] = useState([{ material_id: '', cantidad: '' }]);

    // Filters
    const [filterBrigada, setFilterBrigada] = useState('');
    const [filterTipoHistorial, setFilterTipoHistorial] = useState('');

    // Forms
    const [createForm, setCreateForm] = useState({
        nombre: '', descripcion: '', ubicacion: '', fecha_inicio: '', fecha_fin: ''
    });
    const [consumoForm, setConsumoForm] = useState({
        brigada_id: '', fecha: new Date().toISOString().split('T')[0], observaciones: ''
    });
    const [consumoRows, setConsumoRows] = useState([{ material_id: '', cantidad: '' }]);
    const [brigadaToAssign, setBrigadaToAssign] = useState('');

    // Project warehouse, returns, expenses
    const [proyectoInventario, setProyectoInventario] = useState([]);
    const [proyectoDevoluciones, setProyectoDevoluciones] = useState([]);
    const [proyectoGastos, setProyectoGastos] = useState([]);
    const [showAddAlmacen, setShowAddAlmacen] = useState(false);
    const [almacenRows, setAlmacenRows] = useState([{ material_id: '', cantidad: '' }]);
    const [showEntradaDirecta, setShowEntradaDirecta] = useState(false);
    const [entradaDirectaRows, setEntradaDirectaRows] = useState([{ material_id: '', cantidad: '', observaciones: '' }]);
    const [showAlmacenDropdown, setShowAlmacenDropdown] = useState(false);
    const [showDevolucion, setShowDevolucion] = useState(false);
    const [devolucionRows, setDevolucionRows] = useState([{ material_id: '', cantidad: '', observaciones: '' }]);
    const [showAddGasto, setShowAddGasto] = useState(false);
    const [gastoForm, setGastoForm] = useState({ fecha: new Date().toISOString().split('T')[0], categoria: 'combustible', monto: '', titulo: '', comentario: '' });
    const [expandedTotalRows, setExpandedTotalRows] = useState({});

    // Search states for material tables
    const [searchAlmacen, setSearchAlmacen] = useState('');
    const [searchInventarioBrigadas, setSearchInventarioBrigadas] = useState('');
    const [searchEstimado, setSearchEstimado] = useState('');
    const [searchCotizacion, setSearchCotizacion] = useState('');
    const [collapsedSections, setCollapsedSections] = useState({});
    const toggleSection = (key) => setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));

    useEffect(() => { loadData(); }, []);

    useRealtime(
        ['proyectos', 'proyecto_brigada', 'consumo_materiales', 'inventario', 'proyecto_historial', 'cotizacion_catalogo', 'proyecto_cotizacion', 'proyecto_inventario', 'proyecto_devolucion', 'proyecto_gastos'],
        loadData,
        'proyectos-realtime'
    );

    async function loadData() {
        setLoading(true);
        const [projRes, brigRes, matRes, catRes] = await Promise.all([
            supabase.from('proyectos').select('*').order('created_at', { ascending: false }),
            supabase.from('brigadas').select('*').eq('activa', true).order('nombre'),
            supabase.from('materiales').select('*, inventario(cantidad)').order('nombre'),
            supabase.from('cotizacion_catalogo').select('*').order('codigo')
        ]);
        setProyectos(projRes.data || []);
        setBrigadas(brigRes.data || []);
        setMateriales(matRes.data || []);
        setCotizacionCatalogo(catRes.data || []);
        setLoading(false);
    }

    async function loadProyectoDetail(proyecto, preserveTab = false) {
        setSelectedProyecto(proyecto);
        if (!preserveTab) setActiveTab('detalle');
        const [consRes, brigRes, histRes, cotizRes, pInvRes, pDevRes, pGastRes] = await Promise.all([
            supabase.from('consumo_materiales')
                .select('*, materiales(nombre), brigadas(nombre)')
                .eq('proyecto_id', proyecto.id)
                .order('fecha', { ascending: false }),
            supabase.from('proyecto_brigada')
                .select('*, brigadas(nombre)')
                .eq('proyecto_id', proyecto.id),
            supabase.from('proyecto_historial')
                .select('*')
                .eq('proyecto_id', proyecto.id)
                .order('created_at', { ascending: false }),
            supabase.from('proyecto_cotizacion')
                .select('*')
                .eq('proyecto_id', proyecto.id)
                .order('created_at', { ascending: true }),
            supabase.from('proyecto_inventario')
                .select('*, materiales(nombre, unidad)')
                .eq('proyecto_id', proyecto.id)
                .order('created_at', { ascending: true }),
            supabase.from('proyecto_devolucion')
                .select('*, materiales(nombre, unidad)')
                .eq('proyecto_id', proyecto.id)
                .order('created_at', { ascending: false }),
            supabase.from('proyecto_gastos')
                .select('*')
                .eq('proyecto_id', proyecto.id)
                .order('fecha', { ascending: false })
        ]);
        setConsumos(consRes.data || []);
        setProyectoBrigadas(brigRes.data || []);
        setProyectoHistorial(histRes.data || []);
        setCotizacionItems(cotizRes.data || []);
        setProyectoInventario(pInvRes.data || []);
        setProyectoDevoluciones(pDevRes.data || []);
        setProyectoGastos(pGastRes.data || []);
    }

    async function handleCreate(e) {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            // Validate end date not before start date
            if (createForm.fecha_inicio && createForm.fecha_fin && createForm.fecha_fin < createForm.fecha_inicio) {
                toast('La fecha de fin no puede ser anterior a la fecha de inicio', 'error');
                return;
            }
            // Validate unique project name
            const { data: existing } = await supabase.from('proyectos')
                .select('id')
                .ilike('nombre', createForm.nombre.trim())
                .limit(1);
            if (existing && existing.length > 0) {
                toast('Ya existe un proyecto con ese nombre', 'error');
                return;
            }
            const { error } = await supabase.from('proyectos').insert({ ...createForm, nombre: createForm.nombre.trim() });
            if (error) { toast(error.message, 'error'); return; }
            toast('Proyecto creado correctamente');
            setCreateForm({ nombre: '', descripcion: '', ubicacion: '', fecha_inicio: '', fecha_fin: '' });
            setShowCreate(false);
            loadData();
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleEdit(e) {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            if (editForm.fecha_inicio && editForm.fecha_fin && editForm.fecha_fin < editForm.fecha_inicio) {
                toast('La fecha de fin no puede ser anterior a la fecha de inicio', 'error');
                return;
            }

            if (editForm.nombre.trim() !== selectedProyecto.nombre) {
                const { data: existing } = await supabase.from('proyectos')
                    .select('id')
                    .ilike('nombre', editForm.nombre.trim())
                    .neq('id', selectedProyecto.id)
                    .limit(1);
                if (existing && existing.length > 0) {
                    toast('Ya existe un proyecto con ese nombre', 'error');
                    return;
                }
            }

            const dataToUpdate = {
                ...editForm,
                nombre: editForm.nombre.trim()
            };

            const { data, error } = await supabase.from('proyectos')
                .update(dataToUpdate)
                .eq('id', selectedProyecto.id)
                .select('*')
                .single();
            if (error) { toast(error.message, 'error'); return; }
            toast('Proyecto actualizado');
            setEditForm({
                nombre: '', estado: '', fecha_inicio: '', fecha_fin: '', url_carpeta: '', descripcion: '', ubicacion: ''
            });
            setShowEdit(false);
            loadData();
            loadProyectoDetail(data, true);
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleAsignarBrigada(e) {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            if (!brigadaToAssign) return;
            const exists = proyectoBrigadas.find(pb => pb.brigada_id === brigadaToAssign);
            if (exists) { toast('Esta brigada ya está asignada', 'error'); return; }
            const { error } = await supabase.from('proyecto_brigada').insert({
                proyecto_id: selectedProyecto.id,
                brigada_id: brigadaToAssign
            });
            if (error) { toast(error.message, 'error'); return; }
            toast('Brigada asignada al proyecto');
            setBrigadaToAssign('');
            setShowAsignarBrigada(false);
            loadProyectoDetail(selectedProyecto);
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleRemoveBrigada(pb) {
        try {
            // Calcular inventario dinámico para esta brigada
            const inv = {};
            const brigadaConsumos = consumos.filter(c => c.brigada_id === pb.brigada_id);
            brigadaConsumos.forEach(c => {
                const key = c.material_id;
                if (!inv[key]) inv[key] = { material_id: c.material_id, nombre: c.materiales?.nombre, asignado: 0, consumido: 0 };
                const qty = Number(c.cantidad) || 0;
                if (!c.tipo || c.tipo === 'asignacion') inv[key].asignado += qty;
                else if (c.tipo === 'consumo') inv[key].consumido += qty;
            });

            const availableItems = Object.values(inv).filter(i => (i.asignado - i.consumido) > 0);

            if (availableItems.length > 0) {
                setBrigadaToRemove({ ...pb, inventory: availableItems });
                setRemoveAction('almacen');
                setTransferTarget('');
                setShowRemoveBrigadaModal(true);
            } else {
                if (!window.confirm('¿Desasignar esta brigada del proyecto?')) return;
                await executeRemoveBrigada(pb.id);
            }
        } catch (error) {
            console.error('Error in handleRemoveBrigada:', error);
            window.alert('Error: ' + error.message);
        }
    }

    async function executeRemoveBrigada(pbId) {
        await supabase.from('proyecto_brigada').delete().eq('id', pbId);
        toast('Brigada desasignada');
        loadProyectoDetail(selectedProyecto);
    }

    async function handleConfirmRemove(e) {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            if (!brigadaToRemove) return;

            const pbId = brigadaToRemove.id;
            const bId = brigadaToRemove.brigada_id;
            const inventory = brigadaToRemove.inventory;
            const bName = brigadas.find(b => b.id === bId)?.nombre || '';

            if (removeAction === 'transferir' && !transferTarget) {
                toast('Seleccione una brigada destino', 'error');
                return;
            }

            const targetName = removeAction === 'transferir' ? (brigadas.find(b => b.id === transferTarget)?.nombre || '') : 'Almacén';

            const receiptData = {
                fecha: new Date().toISOString(),
                brigada_origen: bName,
                accion: removeAction === 'almacen' ? 'Devolución a almacén' : 'Transferencia a otra brigada',
                brigada_destino: targetName,
                materiales: []
            };

            for (const item of inventory) {
                const qty = item.asignado - item.consumido;
                receiptData.materiales.push({ material: item.nombre, cantidad: qty });

                // 1. Log a negative assignment to the source brigade to zero out its inventory
                await supabase.from('consumo_materiales').insert({
                    proyecto_id: selectedProyecto.id,
                    brigada_id: bId,
                    material_id: item.material_id,
                    cantidad: -qty,
                    fecha: new Date().toISOString().split('T')[0],
                    observaciones: `Cierre de brigada: ${receiptData.accion}`,
                    tipo: 'asignacion'
                });

                if (removeAction === 'almacen') {
                    // Return to warehouse
                    const { data: invData } = await supabase.from('inventario')
                        .select('cantidad')
                        .eq('material_id', item.material_id)
                        .single();
                    const stock = invData?.cantidad ?? 0;

                    await supabase.from('inventario')
                        .update({ cantidad: stock + qty, updated_at: new Date().toISOString() })
                        .eq('material_id', item.material_id);

                    await supabase.from('movimientos_inventario').insert({
                        material_id: item.material_id,
                        tipo: 'entrada',
                        cantidad: qty,
                        descripcion: `Devolución por desasignación de brigada: ${selectedProyecto.nombre} - ${bName}`,
                        proyecto_id: selectedProyecto.id,
                        brigada_id: bId
                    });
                } else if (removeAction === 'transferir') {
                    // Transfer to another brigade
                    await supabase.from('consumo_materiales').insert({
                        proyecto_id: selectedProyecto.id,
                        brigada_id: transferTarget,
                        material_id: item.material_id,
                        cantidad: qty,
                        fecha: new Date().toISOString().split('T')[0],
                        observaciones: `Transferencia desde brigada ${bName} removida`,
                        tipo: 'asignacion'
                    });
                }
            }

            // Log project history with receipt metadata
            const { error: histError } = await supabase.from('proyecto_historial').insert({
                proyecto_id: selectedProyecto.id,
                estado_anterior: selectedProyecto.estado,
                estado_nuevo: selectedProyecto.estado,
                motivo: `Traspaso de inventario por salida de brigada: ${bName} -> ${targetName}`,
                metadata: receiptData
            });

            if (histError) {
                console.error('Error guardando historial:', histError);
                toast(`Error guardando recibo: ${histError.message}`, 'error');
            }

            // Finally remove the brigade
            await executeRemoveBrigada(pbId);
            setShowRemoveBrigadaModal(false);
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleAddConsumo(e) {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        if (proyectoBrigadas.length === 0) { toast('Debe asignar al menos una brigada antes de realizar acciones en el proyecto', 'error'); return; }
        const validRows = consumoRows.filter(r => r.material_id && parseInt(r.cantidad, 10) > 0);
        if (validRows.length === 0) { toast('Agregue al menos un material con cantidad válida', 'error'); return; }

        try {
            // Validate from project warehouse
            for (const row of validRows) {
                const qty = parseInt(row.cantidad, 10);
                const pInv = proyectoInventario.find(pi => pi.material_id === row.material_id);
                const stock = pInv?.cantidad ?? 0;
                const matName = materialesMap.get(row.material_id)?.nombre || '';
                if (qty > stock) { toast(`Stock insuficiente en almacén del proyecto para ${matName}. Disponible: ${stock}`, 'error'); return; }
            }

            for (const row of validRows) {
                const qty = parseInt(row.cantidad, 10);
                await supabase.from('consumo_materiales').insert({
                    proyecto_id: selectedProyecto.id, brigada_id: consumoForm.brigada_id,
                    material_id: row.material_id, cantidad: qty, fecha: consumoForm.fecha,
                    observaciones: consumoForm.observaciones, tipo: 'asignacion'
                });
                const pInv = proyectoInventario.find(pi => pi.material_id === row.material_id);
                if (pInv) {
                    await supabase.from('proyecto_inventario').update({ cantidad: Math.max(0, pInv.cantidad - qty) }).eq('id', pInv.id);
                }
                await supabase.from('movimientos_inventario').insert({
                    material_id: row.material_id, tipo: 'salida', cantidad: qty,
                    descripcion: `Asignación a brigada desde almacén: ${selectedProyecto.nombre}`,
                    proyecto_id: selectedProyecto.id, brigada_id: consumoForm.brigada_id
                });
            }

            const brigadaNombre = brigadas.find(bg => bg.id === consumoForm.brigada_id)?.nombre || '';
            const materialesDesc = validRows.map(r => { const mat = materiales.find(m => m.id === r.material_id); return `${mat?.nombre || 'Material'}: ${r.cantidad}`; }).join(', ');
            await supabase.from('proyecto_historial').insert({
                proyecto_id: selectedProyecto.id, estado_anterior: selectedProyecto.estado, estado_nuevo: selectedProyecto.estado,
                motivo: `Asignación de materiales — Brigada: ${brigadaNombre}. Materiales: ${materialesDesc}`
            });

            toast(`${validRows.length} material(es) asignado(s) a la brigada`);
            setConsumoForm({ brigada_id: '', fecha: new Date().toISOString().split('T')[0], observaciones: '' });
            setConsumoRows([{ material_id: '', cantidad: '' }]);
            setShowAddConsumo(false);
            loadProyectoDetail(selectedProyecto, true);
            const { data: matData } = await supabase.from('materiales').select('*, inventario(cantidad)').order('nombre');
            setMateriales(matData || []);
        } catch (err) {
            console.error("Error al asignar materiales:", err);
            toast(`Error al asignar: ${err.message || 'Error inesperado'}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    }

    // ========== ALMACÉN DEL PROYECTO ==========
    async function handleAddAlmacen(e) {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const validRows = almacenRows.filter(r => r.material_id && parseInt(r.cantidad, 10) > 0);
            if (validRows.length === 0) { toast('Agregue al menos un material con cantidad válida', 'error'); return; }
            for (const row of validRows) {
                const qty = parseInt(row.cantidad, 10);
                const { data: invData } = await supabase.from('inventario').select('cantidad').eq('material_id', row.material_id).single();
                const stock = invData?.cantidad ?? 0;
                const matName = materialesMap.get(row.material_id)?.nombre || '';
                if (qty > stock) { toast(`Stock insuficiente para ${matName}. Disponible: ${stock}`, 'error'); return; }
            }
            for (const row of validRows) {
                const qty = parseInt(row.cantidad, 10);
                const { data: invData } = await supabase.from('inventario').select('cantidad').eq('material_id', row.material_id).single();
                await supabase.from('inventario').update({ cantidad: (invData?.cantidad ?? 0) - qty, updated_at: new Date().toISOString() }).eq('material_id', row.material_id);
                const existing = proyectoInventario.find(pi => pi.material_id === row.material_id);
                if (existing) {
                    await supabase.from('proyecto_inventario').update({ cantidad: existing.cantidad + qty }).eq('id', existing.id);
                } else {
                    await supabase.from('proyecto_inventario').insert({ proyecto_id: selectedProyecto.id, material_id: row.material_id, cantidad: qty });
                }
                await supabase.from('movimientos_inventario').insert({ material_id: row.material_id, tipo: 'salida', cantidad: qty, descripcion: `Enviado al almacén del proyecto: ${selectedProyecto.nombre}`, proyecto_id: selectedProyecto.id });
            }
            const desc = validRows.map(r => `${materialesMap.get(r.material_id)?.nombre}: ${r.cantidad}`).join(', ');
            await supabase.from('proyecto_historial').insert({ proyecto_id: selectedProyecto.id, estado_anterior: selectedProyecto.estado, estado_nuevo: selectedProyecto.estado, motivo: `Material agregado al almacén: ${desc}` });
            toast(`${validRows.length} material(es) agregado(s) al almacén`);
            setAlmacenRows([{ material_id: '', cantidad: '' }]); setShowAddAlmacen(false);
            loadProyectoDetail(selectedProyecto, true);
            const { data: matData } = await supabase.from('materiales').select('*, inventario(cantidad)').order('nombre'); setMateriales(matData || []);
        } finally {
            setIsSubmitting(false);
        }
    }

    // ========== ENTRADA DIRECTA AL PROYECTO ==========
    async function handleEntradaDirecta(e) {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const validRows = entradaDirectaRows.filter(r => r.material_id && parseInt(r.cantidad, 10) > 0);
            if (validRows.length === 0) { toast('Agregue al menos un material con cantidad válida', 'error'); return; }

            for (const row of validRows) {
                const qty = parseInt(row.cantidad, 10);
                const obs = row.observaciones?.trim() || '';

                // Update proyecto_inventario (create or increment)
                const existing = proyectoInventario.find(pi => pi.material_id === row.material_id);
                if (existing) {
                    await supabase.from('proyecto_inventario').update({ cantidad: existing.cantidad + qty }).eq('id', existing.id);
                } else {
                    await supabase.from('proyecto_inventario').insert({ proyecto_id: selectedProyecto.id, material_id: row.material_id, cantidad: qty });
                }

                // Log in movimientos_inventario as 'entrada' so it appears in Inventario > Historial
                await supabase.from('movimientos_inventario').insert({
                    material_id: row.material_id,
                    tipo: 'entrada',
                    cantidad: qty,
                    descripcion: `Entrada directa al proyecto: ${selectedProyecto.nombre}${obs ? ` — ${obs}` : ''}`,
                    proyecto_id: selectedProyecto.id
                });
            }

            const desc = validRows.map(r => {
                const m = materiales.find(m => m.id === r.material_id);
                return `${m?.nombre || 'Material'}: ${r.cantidad}`;
            }).join(', ');

            await supabase.from('proyecto_historial').insert({
                proyecto_id: selectedProyecto.id,
                estado_anterior: selectedProyecto.estado,
                estado_nuevo: selectedProyecto.estado,
                motivo: `Entrada directa de materiales al proyecto: ${desc}`
            });

            toast(`${validRows.length} material(es) ingresado(s) directamente al proyecto`);
            setEntradaDirectaRows([{ material_id: '', cantidad: '', observaciones: '' }]);
            setShowEntradaDirecta(false);
            loadProyectoDetail(selectedProyecto, true);
        } finally {
            setIsSubmitting(false);
        }
    }

    // ========== DEVOLUCIÓN ==========
    async function handleDevolucion(e) {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const validRows = devolucionRows.filter(r => r.material_id && parseInt(r.cantidad, 10) > 0);
            if (validRows.length === 0) { toast('Agregue al menos un material', 'error'); return; }
            for (const row of validRows) {
                const qty = parseInt(row.cantidad, 10);
                const pInv = proyectoInventario.find(pi => pi.material_id === row.material_id);
                const matName = materialesMap.get(row.material_id)?.nombre || '';
                if (qty > (pInv?.cantidad ?? 0)) { toast(`Solo hay ${pInv?.cantidad ?? 0} de ${matName} en el almacén`, 'error'); return; }
            }
            for (const row of validRows) {
                const qty = parseInt(row.cantidad, 10);
                const pInv = proyectoInventario.find(pi => pi.material_id === row.material_id);
                if (pInv) await supabase.from('proyecto_inventario').update({ cantidad: Math.max(0, pInv.cantidad - qty) }).eq('id', pInv.id);
                const { data: invData } = await supabase.from('inventario').select('cantidad').eq('material_id', row.material_id).single();
                if (invData) await supabase.from('inventario').update({ cantidad: invData.cantidad + qty, updated_at: new Date().toISOString() }).eq('material_id', row.material_id);
                await supabase.from('proyecto_devolucion').insert({ proyecto_id: selectedProyecto.id, material_id: row.material_id, cantidad: qty, observaciones: row.observaciones || '' });
                await supabase.from('movimientos_inventario').insert({ material_id: row.material_id, tipo: 'entrada', cantidad: qty, descripcion: `Devolución desde proyecto: ${selectedProyecto.nombre}`, proyecto_id: selectedProyecto.id });
            }
            const desc = validRows.map(r => `${materialesMap.get(r.material_id)?.nombre}: ${r.cantidad}`).join(', ');
            await supabase.from('proyecto_historial').insert({ proyecto_id: selectedProyecto.id, estado_anterior: selectedProyecto.estado, estado_nuevo: selectedProyecto.estado, motivo: `Devolución de materiales: ${desc}` });
            toast('Materiales devueltos al inventario');
            setDevolucionRows([{ material_id: '', cantidad: '', observaciones: '' }]); setShowDevolucion(false);
            loadProyectoDetail(selectedProyecto, true);
            const { data: matData } = await supabase.from('materiales').select('*, inventario(cantidad)').order('nombre'); setMateriales(matData || []);
        } finally {
            setIsSubmitting(false);
        }
    }

    // ========== GASTOS ==========
    async function handleAddGasto(e) {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const monto = parseFloat(gastoForm.monto);
            if (!monto || monto <= 0) { toast('Monto debe ser mayor a 0', 'error'); return; }
            if (gastoForm.categoria === 'otros' && !gastoForm.titulo) { toast('Ingrese un título para el gasto', 'error'); return; }
            await supabase.from('proyecto_gastos').insert({ proyecto_id: selectedProyecto.id, fecha: gastoForm.fecha, categoria: gastoForm.categoria, monto, titulo: gastoForm.titulo || null, comentario: gastoForm.comentario || null });
            toast('Gasto registrado');
            setGastoForm({ fecha: new Date().toISOString().split('T')[0], categoria: 'combustible', monto: '', titulo: '', comentario: '' }); setShowAddGasto(false);
            loadProyectoDetail(selectedProyecto, true);
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDeleteGasto(id) {
        if (!confirm('¿Eliminar este gasto?')) return;
        await supabase.from('proyecto_gastos').delete().eq('id', id);
        toast('Gasto eliminado');
        loadProyectoDetail(selectedProyecto, true);
    }

    async function handleAddConsumoDiario(e) {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            if (proyectoBrigadas.length === 0) { toast('Debe asignar al menos una brigada antes de realizar acciones en el proyecto', 'error'); return; }
            const validRows = consumoDiarioRows.filter(r => r.material_id && parseInt(r.cantidad, 10) > 0);
            if (validRows.length === 0) { toast('Agregue al menos un material con cantidad válida', 'error'); return; }
            const horas = parseFloat(consumoDiarioForm.horas);
            if (!horas || horas <= 0) { toast('Ingrese las horas trabajadas', 'error'); return; }

            // Validate brigade has enough inventory
            const asignaciones = consumos.filter(c => (!c.tipo || c.tipo === 'asignacion') && c.brigada_id === consumoDiarioForm.brigada_id);
            const consumosPrevios = consumos.filter(c => c.tipo === 'consumo' && c.brigada_id === consumoDiarioForm.brigada_id);

            for (const row of validRows) {
                const qty = parseInt(row.cantidad, 10);
                const totalAsignado = asignaciones.filter(a => a.material_id === row.material_id).reduce((s, a) => s + a.cantidad, 0);
                const totalConsumido = consumosPrevios.filter(c => c.material_id === row.material_id).reduce((s, c) => s + c.cantidad, 0);
                const disponible = totalAsignado - totalConsumido;
                const matName = materialesMap.get(row.material_id)?.nombre || '';
                if (qty > disponible) {
                    toast(`Inventario insuficiente para ${matName}. Disponible: ${disponible}`, 'error');
                    return;
                }
            }

            for (const row of validRows) {
                await supabase.from('consumo_materiales').insert({
                    proyecto_id: selectedProyecto.id,
                    brigada_id: consumoDiarioForm.brigada_id,
                    material_id: row.material_id,
                    cantidad: parseInt(row.cantidad, 10),
                    fecha: consumoDiarioForm.fecha,
                    tipo: 'consumo',
                    horas
                });
            }

            const brigadaNombre = brigadas.find(bg => bg.id === consumoDiarioForm.brigada_id)?.nombre || '';
            const materialesDesc = validRows.map(r => {
                const mat = materiales.find(m => m.id === r.material_id);
                return `${mat?.nombre || 'Material'}: ${r.cantidad}`;
            }).join(', ');
            await supabase.from('proyecto_historial').insert({
                proyecto_id: selectedProyecto.id,
                estado_anterior: selectedProyecto.estado,
                estado_nuevo: selectedProyecto.estado,
                motivo: `Consumo diario (${horas}h) — Brigada: ${brigadaNombre}. Materiales: ${materialesDesc}`
            });

            toast(`Consumo diario registrado (${horas}h)`);
            setConsumoDiarioForm({ brigada_id: '', fecha: new Date().toISOString().split('T')[0], horas: '' });
            setConsumoDiarioRows([{ material_id: '', cantidad: '' }]);
            setShowAddConsumoDiario(false);
            loadProyectoDetail(selectedProyecto);
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handlePausar(e) {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            if (!motivoPausa.trim()) { toast('Ingrese un motivo de pausa', 'error'); return; }
            const estadoAnterior = selectedProyecto.estado;
            await supabase.from('proyectos')
                .update({ estado: 'pausado', motivo_pausa: motivoPausa.trim() })
                .eq('id', selectedProyecto.id);
            await supabase.from('proyecto_historial').insert({
                proyecto_id: selectedProyecto.id,
                estado_anterior: estadoAnterior,
                estado_nuevo: 'pausado',
                motivo: motivoPausa.trim()
            });
            toast('Proyecto pausado');
            setMotivoPausa('');
            setShowPausar(false);
            const updated = { ...selectedProyecto, estado: 'pausado', motivo_pausa: motivoPausa.trim() };
            setSelectedProyecto(updated);
            loadData();
            loadProyectoDetail(updated);
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleCancelar(e) {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            if (!motivoCancelar.trim()) { toast('Ingrese un motivo de cancelación', 'error'); return; }
            const estadoAnterior = selectedProyecto.estado;

            await supabase.from('proyectos')
                .update({ estado: 'cancelado' })
                .eq('id', selectedProyecto.id);

            await supabase.from('proyecto_historial').insert({
                proyecto_id: selectedProyecto.id,
                estado_anterior: estadoAnterior,
                estado_nuevo: 'cancelado',
                motivo: motivoCancelar.trim()
            });

            toast('Proyecto cancelado correctamente');
            setMotivoCancelar('');
            setShowCancelar(false);

            const updated = { ...selectedProyecto, estado: 'cancelado' };
            setSelectedProyecto(updated);
            loadData();
            loadProyectoDetail(updated);
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleReanudar() {
        await supabase.from('proyectos')
            .update({ estado: 'activo', motivo_pausa: null })
            .eq('id', selectedProyecto.id);
        await supabase.from('proyecto_historial').insert({
            proyecto_id: selectedProyecto.id,
            estado_anterior: 'pausado',
            estado_nuevo: 'activo',
            motivo: 'Proyecto reanudado'
        });
        toast('Proyecto reanudado');
        const updated = { ...selectedProyecto, estado: 'activo', motivo_pausa: null };
        setSelectedProyecto(updated);
        loadData();
        loadProyectoDetail(updated);
    }

    // Funciones de Cotización
    async function handleAddQuoteItem(catalogoItem) {
        if (!catalogoItem) return;
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            if (proyectoBrigadas.length === 0) { toast('Debe asignar al menos una brigada antes de realizar acciones en el proyecto', 'error'); return; }
            // Verify it's not already added
            if (cotizacionItems.some(item => item.catalogo_id === catalogoItem.id)) {
                toast('El ítem ya está en la cotización', 'error');
                return;
            }
            const buildItem = {
                proyecto_id: selectedProyecto.id,
                catalogo_id: catalogoItem.id,
                codigo: catalogoItem.codigo,
                descripcion: catalogoItem.descripcion,
                unidad: catalogoItem.unidad,
                precio_unitario: catalogoItem.precio_unitario,
                cantidad: 1
            };
            const { error } = await supabase.from('proyecto_cotizacion').insert(buildItem);
            if (error) { toast(error.message, 'error'); return; }
            toast('Ítem agregado a la cotización');
            loadProyectoDetail(selectedProyecto, true);
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleRemoveQuoteItem(itemId) {
        const { error } = await supabase.from('proyecto_cotizacion').delete().eq('id', itemId);
        if (error) { toast(error.message, 'error'); return; }
        toast('Ítem eliminado');
        loadProyectoDetail(selectedProyecto, true);
    }

    async function handleUpdateQuoteQuantity(itemId, newQty) {
        const qty = parseFloat(newQty);
        if (isNaN(qty) || qty < 0) return;
        const { error } = await supabase.from('proyecto_cotizacion').update({ cantidad: qty }).eq('id', itemId);
        if (error) { toast(error.message, 'error'); return; }
        // We do not call loadProyectoDetail here to avoid losing focus if it's onBlur, realtime will pick it up or we just silently update.
        // But realtime does trigger loadData, NOT loadProyectoDetail. So we manually update local state.
        setCotizacionItems(prev => prev.map(item => item.id === itemId ? { ...item, cantidad: qty } : item));
    }

    function generateQuotePDF() {
        const doc = new jsPDF();
        const pageW = doc.internal.pageSize.getWidth();
        const blue = [33, 63, 115];
        const today = new Date().toLocaleDateString('es-ES');

        // ===== LOGO / COMPANY HEADER =====
        // Blue vertical bar (like the "J" icon frame)
        doc.setFillColor(...blue);
        doc.rect(14, 10, 4, 22, 'F');
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...blue);
        doc.text("J G S, SRL", 22, 18);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50, 50, 50);
        doc.text("Josegabrielsiergar, SRL,  RNC 132552261", 22, 24);
        doc.text("Telecomunicaciones y Servicios", 22, 29);

        // ===== COTIZACIÓN BANNER =====
        doc.setFillColor(...blue);
        doc.rect(14, 35, pageW - 28, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text("COTIZACIÓN", pageW / 2, 42, { align: 'center' });

        // ===== CLIENT DATA =====
        const clientY = 52;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);

        // Left column - Client info
        doc.setFont('helvetica', 'bold');
        doc.text("Cliente", 14, clientY);
        doc.setFont('helvetica', 'normal');

        const labelX = 18;
        const valueX = 45;

        doc.setFont('helvetica', 'bold');
        doc.text("RNC:", labelX, clientY + 6);
        doc.setFont('helvetica', 'normal');
        doc.text("1-23-00159-2", valueX, clientY + 6);

        doc.setFont('helvetica', 'bold');
        doc.text("Nombre:", labelX, clientY + 11);
        doc.setFont('helvetica', 'normal');
        doc.text("Camusat Dominicana", valueX, clientY + 11);

        doc.setFont('helvetica', 'bold');
        doc.text("Dirección:", labelX, clientY + 16);
        doc.setFont('helvetica', 'normal');
        // Split long address over two lines
        const direccionText = "Carretera Duarte Vieja N° 110, Santo Domingo, República Dominicana";
        const splitDireccion = doc.splitTextToSize(direccionText, 80);
        doc.text(splitDireccion, valueX, clientY + 16);

        doc.setFont('helvetica', 'bold');
        doc.text("Asignado por:", labelX, clientY + 25);
        doc.setFont('helvetica', 'normal');
        doc.text("Sr. Ramón Ruiz", valueX, clientY + 25);

        // Right column - Dates
        const rightAlignX = pageW - 14;
        doc.setFont('helvetica', 'bold');
        doc.text("Cubicación del cliente de fecha:", rightAlignX - 22, clientY + 6, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.text(today, rightAlignX, clientY + 6, { align: 'right' });

        doc.setFont('helvetica', 'bold');
        doc.text("Fecha cotización:", rightAlignX - 22, clientY + 11, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.text(today, rightAlignX, clientY + 11, { align: 'right' });

        // Tipo trabajo
        doc.setFont('helvetica', 'bold');
        doc.text("Tipo trabajo:", labelX, clientY + 30);
        doc.setFont('helvetica', 'italic');
        doc.text("Fibra óptica", valueX, clientY + 30);

        // Separator line
        doc.setDrawColor(...blue);
        doc.setLineWidth(0.5);
        doc.line(14, clientY + 33, pageW - 14, clientY + 33);

        // ===== PROJECT NAME BANNER =====
        const projY = clientY + 37;
        doc.setFillColor(...blue);
        doc.rect(14, projY, pageW - 28, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bolditalic');
        doc.text(`TRABAJO O PROYECTO: ${selectedProyecto?.nombre?.toUpperCase() || ''}`, pageW / 2, projY + 5.5, { align: 'center' });

        // ===== TABLE =====
        let totalGeneral = 0;
        const body = cotizacionItems.map((item, index) => {
            const totalFila = Number(item.cantidad) * Number(item.precio_unitario);
            totalGeneral += totalFila;
            return [
                index + 1,
                item.codigo,
                item.descripcion,
                item.unidad,
                Number(item.precio_unitario).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
                item.cantidad,
                totalFila.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            ];
        });

        // Total row
        body.push([
            "", "", "", "", "", "TOTAL RD$",
            totalGeneral.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        ]);

        autoTable(doc, {
            startY: projY + 10,
            head: [['ITEM', 'CODIGO', 'DESCRIPCION', 'UNIDAD', 'PRECIO UNITARIO', 'CANTIDAD', 'TOTAL RD$']],
            body: body,
            theme: 'grid',
            headStyles: {
                fillColor: blue,
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'center',
                fontSize: 7,
                cellPadding: 2
            },
            bodyStyles: { fontSize: 7, cellPadding: 1.5 },
            alternateRowStyles: { fillColor: [235, 240, 250] },
            columnStyles: {
                0: { halign: 'center', cellWidth: 12 },
                1: { halign: 'center', cellWidth: 22 },
                2: { cellWidth: 65 },
                3: { halign: 'center', cellWidth: 16 },
                4: { halign: 'right', cellWidth: 24 },
                5: { halign: 'center', cellWidth: 18 },
                6: { halign: 'right' }
            },
            didParseCell: function (data) {
                // Style the last row (TOTAL)
                if (data.row.index === body.length - 1) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [220, 230, 245];
                    if (data.column.index === 6) {
                        data.cell.styles.textColor = blue;
                    }
                }
            }
        });

        doc.save(`Cotizacion_${selectedProyecto?.nombre?.replace(/\\s+/g, '_')}_${new Date().getTime()}.pdf`);
        toast('Cotización PDF generada');
    }

    function exportDevolucionesPDF() {
        if (!selectedProyecto || !proyectoDevoluciones.length) return;

        const doc = new jsPDF();
        const pageW = doc.internal.pageSize.getWidth();
        const blue = [30, 58, 138];

        // Header
        doc.setFillColor(...blue);
        doc.rect(0, 0, pageW, 25, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('REPORTE DE DEVOLUCIONES DE MATERIALES', 14, 16);

        // Project Info
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.text(`Proyecto: ${selectedProyecto.nombre}`, 14, 35);
        doc.text(`Fecha del Reporte: ${new Date().toLocaleDateString('es-ES')}`, 14, 42);

        // Table
        const tableData = proyectoDevoluciones.map(d => [
            new Date(d.created_at).toLocaleDateString('es-ES'),
            d.materiales?.nombre || '—',
            d.cantidad.toString(),
            d.observaciones || '—'
        ]);

        autoTable(doc, {
            startY: 50,
            head: [['Fecha', 'Material', 'Cantidad', 'Observaciones']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: blue, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10 },
            bodyStyles: { fontSize: 9, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 30 },
                2: { cellWidth: 25, halign: 'center' }
            }
        });

        doc.save(`Devoluciones_${selectedProyecto.nombre.replace(/\\s+/g, '_')}_${new Date().getTime()}.pdf`);
        toast('Reporte PDF descargado');
    }

    function exportReportePDF() {
        const doc = new jsPDF();
        const pageW = doc.internal.pageSize.getWidth();
        const blue = [30, 64, 175];
        const today = new Date().toLocaleDateString('es-ES');

        // Title
        doc.setFillColor(...blue);
        doc.rect(0, 0, pageW, 28, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('REPORTE DE PROGRESO', pageW / 2, 12, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`${selectedProyecto?.nombre || ''} — ${today}`, pageW / 2, 20, { align: 'center' });

        // Project info
        let y = 36;
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Proyecto:', 14, y);
        doc.setFont('helvetica', 'normal');
        doc.text(selectedProyecto?.nombre || '', 45, y);
        y += 6;
        doc.setFont('helvetica', 'bold');
        doc.text('Estado:', 14, y);
        doc.setFont('helvetica', 'normal');
        doc.text(selectedProyecto?.estado || '', 45, y);
        y += 6;
        doc.setFont('helvetica', 'bold');
        doc.text('Ubicación:', 14, y);
        doc.setFont('helvetica', 'normal');
        doc.text(selectedProyecto?.ubicacion || '—', 45, y);
        y += 6;
        doc.setFont('helvetica', 'bold');
        doc.text('Período:', 14, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`${selectedProyecto?.fecha_inicio || '—'} al ${selectedProyecto?.fecha_fin || '—'}`, 45, y);
        y += 10;

        // Summary metrics
        const consumosDiarios = consumos.filter(c => c.tipo === 'consumo');
        // Deduplicate by fecha only: same date = same work session regardless of how many brigades
        const _dateHorasPDF = consumosDiarios.reduce((map, c) => {
            const h = Number(c.horas) || 0;
            if (!map[c.fecha] || h > map[c.fecha]) map[c.fecha] = h;
            return map;
        }, {});
        const totalHoras = Object.values(_dateHorasPDF).reduce((s, h) => s + h, 0);
        const diasTrabajados = new Set(consumosDiarios.map(c => c.fecha)).size;
        const totalGastos = proyectoGastos.reduce((s, g) => s + (Number(g.monto) || 0), 0);

        doc.setFillColor(240, 240, 250);
        doc.rect(14, y, pageW - 28, 20, 'F');
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        const metricsY = y + 8;
        const col = (pageW - 28) / 4;
        [
            [`Horas: ${totalHoras}h`, 0],
            [`Días trabajados: ${diasTrabajados}`, 1],
            [`Brigadas: ${proyectoBrigadas.length}`, 2],
            [`Gastos: RD$${totalGastos.toLocaleString()}`, 3]
        ].forEach(([text, i]) => {
            doc.setFont('helvetica', 'bold');
            doc.text(text, 14 + col * i + col / 2, metricsY, { align: 'center' });
        });

        y += 28;

        // Material usage table
        const matMap = {};
        const histAsignaciones = proyectoHistorial.filter(h => h.motivo && h.motivo.startsWith('Material agregado al almacén: '));
        histAsignaciones.forEach(h => {
            const text = h.motivo.substring('Material agregado al almacén: '.length);
            materiales.forEach(m => {
                if (!m.nombre) return;
                const escapedName = m.nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`${escapedName}:\\s*(\\d+)`, 'g');
                let match;
                while ((match = regex.exec(text)) !== null) {
                    if (!matMap[m.id]) matMap[m.id] = { nombre: m.nombre, unidad: m.unidad || 'unidad', asignado: 0, consumido: 0 };
                    matMap[m.id].asignado += parseInt(match[1], 10);
                }
            });
        });
        proyectoInventario.forEach(pi => {
            if (!matMap[pi.material_id]) {
                matMap[pi.material_id] = { nombre: pi.materiales?.nombre || 'Desconocido', unidad: pi.materiales?.unidad || 'unidad', asignado: pi.cantidad, consumido: 0 };
            }
            if (matMap[pi.material_id].asignado < pi.cantidad) matMap[pi.material_id].asignado = pi.cantidad;
        });
        consumosDiarios.forEach(c => {
            if (matMap[c.material_id]) matMap[c.material_id].consumido += Number(c.cantidad || 0);
        });

        const matList = Object.values(matMap).filter(m => m.asignado > 0 || m.consumido > 0).sort((a, b) => a.nombre.localeCompare(b.nombre));
        const totalAsignado = matList.reduce((s, m) => s + m.asignado, 0);
        const totalConsumido = matList.reduce((s, m) => s + m.consumido, 0);
        const progreso = totalAsignado > 0 ? Math.round((totalConsumido / totalAsignado) * 100) : 0;

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(`Progreso General de Materiales: ${progreso}%`, 14, y);
        y += 4;

        if (matList.length > 0) {
            const body = matList.map(m => {
                const disponible = m.asignado - m.consumido;
                const pct = m.asignado > 0 ? Math.round((m.consumido / m.asignado) * 100) : 0;
                return [m.nombre, m.unidad, m.asignado, m.consumido, disponible, `${pct}%`];
            });

            body.push(['', '', totalAsignado, totalConsumido, totalAsignado - totalConsumido, `${progreso}%`]);

            autoTable(doc, {
                startY: y,
                head: [['Material', 'Unidad', 'Asignado', 'Consumido', 'Disponible', '% Uso']],
                body,
                theme: 'grid',
                headStyles: { fillColor: blue, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', fontSize: 8 },
                bodyStyles: { fontSize: 8, cellPadding: 2 },
                alternateRowStyles: { fillColor: [245, 247, 255] },
                columnStyles: {
                    0: { cellWidth: 55 },
                    1: { halign: 'center', cellWidth: 20 },
                    2: { halign: 'center', cellWidth: 22 },
                    3: { halign: 'center', cellWidth: 22 },
                    4: { halign: 'center', cellWidth: 22 },
                    5: { halign: 'center', cellWidth: 18 }
                },
                didParseCell: function (data) {
                    if (data.row.index === body.length - 1) {
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.fillColor = [220, 230, 245];
                    }
                }
            });
        }

        // Expenses by category
        if (proyectoGastos.length > 0) {
            const finalY = doc.lastAutoTable?.finalY || y + 10;
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('Resumen de Gastos', 14, finalY + 10);

            const gastosCategoria = {};
            proyectoGastos.forEach(g => {
                const cat = g.categoria || 'otros';
                if (!gastosCategoria[cat]) gastosCategoria[cat] = 0;
                gastosCategoria[cat] += Number(g.monto || 0);
            });
            const gastosBody = Object.entries(gastosCategoria).map(([cat, monto]) => [
                cat.charAt(0).toUpperCase() + cat.slice(1),
                `RD$${monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            ]);
            gastosBody.push(['TOTAL', `RD$${totalGastos.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]);

            autoTable(doc, {
                startY: finalY + 14,
                head: [['Categoría', 'Monto']],
                body: gastosBody,
                theme: 'grid',
                headStyles: { fillColor: blue, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
                bodyStyles: { fontSize: 8, cellPadding: 2 },
                columnStyles: { 1: { halign: 'right' } },
                didParseCell: function (data) {
                    if (data.row.index === gastosBody.length - 1) {
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.fillColor = [220, 230, 245];
                    }
                }
            });
        }

        // Charts — capture canvas elements as images
        let chartsY = doc.lastAutoTable?.finalY || y + 10;

        // Chart 1: Consumo de Materiales por Día (Line chart)
        const chartConsumoContainer = document.getElementById('chart-consumo-diario');
        if (chartConsumoContainer) {
            const canvas1 = chartConsumoContainer.querySelector('canvas');
            if (canvas1) {
                chartsY += 12;
                // Check if we need a new page
                if (chartsY + 90 > doc.internal.pageSize.getHeight() - 10) {
                    doc.addPage();
                    chartsY = 20;
                }
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0, 0, 0);
                doc.text('Consumo de Materiales por Día', 14, chartsY);
                chartsY += 4;

                const img1 = canvas1.toDataURL('image/png');
                const imgW = pageW - 28;
                const imgH = (canvas1.height / canvas1.width) * imgW;
                doc.addImage(img1, 'PNG', 14, chartsY, imgW, imgH);
                chartsY += imgH;
            }
        }

        // Chart 2: Inventario vs Consumo (Bar chart)
        const chartInvContainer = document.getElementById('chart-inventario-consumo');
        if (chartInvContainer) {
            const canvas2 = chartInvContainer.querySelector('canvas');
            if (canvas2) {
                chartsY += 12;
                if (chartsY + 90 > doc.internal.pageSize.getHeight() - 10) {
                    doc.addPage();
                    chartsY = 20;
                }
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0, 0, 0);
                doc.text('Inventario vs Consumo de Brigadas', 14, chartsY);
                chartsY += 4;

                const img2 = canvas2.toDataURL('image/png');
                const imgW = pageW - 28;
                const imgH = (canvas2.height / canvas2.width) * imgW;
                doc.addImage(img2, 'PNG', 14, chartsY, imgW, imgH);
            }
        }

        doc.save(`Reporte_${selectedProyecto?.nombre?.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`);
        toast('Reporte PDF generado');
    }

    // Apply filters to consumos
    const filteredConsumos = useMemo(() =>
        consumos.filter(c => !filterBrigada || c.brigada_id === filterBrigada),
        [consumos, filterBrigada]);

    // Calculate brigade inventory (asignado - consumido)
    const brigadeInventory = useMemo(() => {
        const inv = {};
        const filtered = filterBrigada ? consumos.filter(c => c.brigada_id === filterBrigada) : consumos;
        filtered.forEach(c => {
            const key = `${c.brigada_id}_${c.material_id}`;
            if (!inv[key]) inv[key] = { brigada: c.brigadas?.nombre || '—', material: c.materiales?.nombre || '—', material_id: c.material_id, brigada_id: c.brigada_id, asignado: 0, consumido: 0 };
            if (!c.tipo || c.tipo === 'asignacion') inv[key].asignado += c.cantidad;
            else if (c.tipo === 'consumo') inv[key].consumido += c.cantidad;
        });
        return Object.values(inv).filter(i => i.asignado > 0);
    }, [consumos, filterBrigada]);

    // Calculate per-hour estimates from daily consumption records with real hours (Not grouped)
    const perHourEstimates = useMemo(() => {
        return filteredConsumos.filter(c => c.tipo === 'consumo').map(c => ({
            id: c.id,
            name: c.materiales?.nombre || 'Desconocido',
            date: c.fecha || c.created_at?.split('T')[0],
            total: c.cantidad,
            hours: c.horas || 0,
            perHour: c.horas > 0 ? (c.cantidad / c.horas).toFixed(2) : '—'
        }));
    }, [filteredConsumos]);

    // Legacy wrappers kept for any remaining call-sites
    function calcBrigadeInventory() { return brigadeInventory; }
    function calcPerHourEstimates() { return perHourEstimates;
    }

    const estadoColor = { activo: 'badge-green', completado: 'badge-blue', cancelado: 'badge-red', pausado: 'badge-orange' };
    const estadoDot = { activo: 'active', completado: 'completed', cancelado: 'cancelled', pausado: 'paused' };

    function isRetrasado(p) {
        return p.estado === 'activo' && p.fecha_fin && p.fecha_fin < new Date().toISOString().split('T')[0];
    }

    async function toggleEstado(proyecto, newEstado) {
        await supabase.from('proyectos').update({ estado: newEstado }).eq('id', proyecto.id);
        toast(`Proyecto marcado como ${newEstado}`);
        loadData();
        if (selectedProyecto?.id === proyecto.id) {
            setSelectedProyecto({ ...proyecto, estado: newEstado });
        }
    }

    // O(1) material lookup — replaces repeated .find() in handlers
    const materialesMap = useMemo(() => new Map(materiales.map(m => [m.id, m])), [materiales]);
    // Available brigadas for assignment modal (O(n) instead of O(n²))
    const assignedBrigadaIds = useMemo(() => new Set(proyectoBrigadas.map(pb => pb.brigada_id)), [proyectoBrigadas]);
    const availableBrigadasOptions = useMemo(
        () => brigadas.filter(b => !assignedBrigadaIds.has(b.id)).map(b => ({ value: b.id, label: b.nombre })),
        [brigadas, assignedBrigadaIds]
    );

    if (loading) return <div className="loading-spinner" />;

    // DETAIL VIEW
    if (selectedProyecto) {
        const estimates = perHourEstimates;
        return (
            <div>
                <div className="detail-header">
                    <button className="detail-back-btn" onClick={() => setSelectedProyecto(null)}>
                        <ArrowLeft size={18} />
                    </button>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <h2 style={{ margin: 0 }}>{selectedProyecto.nombre}</h2>
                            <button
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '4px', height: 'auto', background: 'transparent', border: 'none', color: 'var(--text-secondary)' }}
                                title="Editar Proyecto"
                                onClick={() => {
                                    setEditForm({
                                        nombre: selectedProyecto.nombre || '',
                                        descripcion: selectedProyecto.descripcion || '',
                                        ubicacion: selectedProyecto.ubicacion || '',
                                        fecha_inicio: selectedProyecto.fecha_inicio || '',
                                        fecha_fin: selectedProyecto.fecha_fin || ''
                                    });
                                    setShowEdit(true);
                                }}
                            >
                                <Edit2 size={16} />
                            </button>
                        </div>
                        <p className="page-header-subtitle" style={{ margin: 0 }}>
                            {selectedProyecto.ubicacion && <><MapPin size={14} style={{ verticalAlign: 'middle' }} /> {selectedProyecto.ubicacion}
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedProyecto.ubicacion)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    style={{ marginLeft: 8, color: 'var(--accent-blue)', textDecoration: 'none', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4, verticalAlign: 'middle' }}
                                >
                                    <ExternalLink size={12} /> Ver en Mapa
                                </a>
                                · </>}
                            <span className={`badge ${estadoColor[selectedProyecto.estado]}`} style={{ marginLeft: 4 }}>
                                {selectedProyecto.estado}
                            </span>
                            {isRetrasado(selectedProyecto) && (
                                <span className="badge badge-orange" style={{ marginLeft: 6 }}>
                                    ⚠ Retrasado
                                </span>
                            )}
                        </p>
                    </div>
                    <div className="btn-group" style={{ position: 'relative' }}>
                        {(selectedProyecto.estado === 'activo' || selectedProyecto.estado === 'pausado') && (
                            <button
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '6px 8px' }}
                                onClick={() => setShowActionsDropdown(!showActionsDropdown)}
                            >
                                <MoreVertical size={16} />
                            </button>
                        )}

                        {showActionsDropdown && (
                            <>
                                <div className="animated-dropdown-backdrop" onClick={() => setShowActionsDropdown(false)} />
                                <div className="animated-dropdown">
                                    <div className="animated-dropdown-label">Acciones</div>
                                    <div className="animated-dropdown-separator" />
                                    {selectedProyecto.estado === 'activo' && (
                                        <>
                                            <button
                                                className="animated-dropdown-item item-complete"
                                                onClick={() => { setShowActionsDropdown(false); if (confirm('¿Estás seguro de completar este proyecto? No se podrán realizar más modificaciones.')) toggleEstado(selectedProyecto, 'completado'); }}
                                            >
                                                Completar
                                            </button>
                                            <button
                                                className="animated-dropdown-item item-pause"
                                                onClick={() => { setShowActionsDropdown(false); if (confirm('¿Estás seguro de pausar este proyecto?')) setShowPausar(true); }}
                                            >
                                                <Pause size={14} /> Pausar
                                            </button>

                                            <div className="animated-dropdown-separator" />

                                            <button
                                                className="animated-dropdown-item"
                                                style={{ color: 'var(--accent-red)' }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                                                    e.currentTarget.style.transform = 'translateX(2px)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                    e.currentTarget.style.transform = 'none';
                                                }}
                                                onClick={() => {
                                                    setShowActionsDropdown(false);
                                                    setShowCancelar(true);
                                                }}
                                            >
                                                Cancelar
                                            </button>
                                        </>
                                    )}
                                    {selectedProyecto.estado === 'pausado' && (
                                        <button
                                            className="animated-dropdown-item item-resume"
                                            onClick={() => { setShowActionsDropdown(false); handleReanudar(); }}
                                        >
                                            <Play size={14} /> Reanudar
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="tabs">
                    <button className={`tab ${activeTab === 'detalle' ? 'active' : ''}`} onClick={() => setActiveTab('detalle')} title="Información general, brigadas asignadas y progreso del proyecto">
                        Detalle
                    </button>
                    <button className={`tab ${activeTab === 'almacen' ? 'active' : ''}`} onClick={() => setActiveTab('almacen')} title="Materiales ingresados al proyecto y su existencia disponible">
                        Almacén de Proyecto
                    </button>
                    <button className={`tab ${activeTab === 'consumos' ? 'active' : ''}`} onClick={() => setActiveTab('consumos')} title="Materiales asignados a cada brigada y su disponibilidad">
                        Inventario de Brigadas
                    </button>
                    <button className={`tab ${activeTab === 'estimado' ? 'active' : ''}`} onClick={() => setActiveTab('estimado')} title="Registro diario de consumo de materiales por brigada y horas trabajadas">
                        Consumo de Materiales
                    </button>
                    <button className={`tab ${activeTab === 'gastos' ? 'active' : ''}`} onClick={() => setActiveTab('gastos')} title="Registro de gastos adicionales del proyecto (transporte, comida, etc.)">
                        Gastos
                    </button>
                    <button className={`tab ${activeTab === 'cotizacion' ? 'active' : ''}`} onClick={() => setActiveTab('cotizacion')} title="Cotización de materiales del catálogo con precios y totales">
                        Cotización
                    </button>
                    <button className={`tab ${activeTab === 'historial' ? 'active' : ''}`} onClick={() => setActiveTab('historial')} title="Registro de todos los cambios de estado y movimientos del proyecto">
                        Historial
                    </button>
                </div>

                {selectedProyecto.estado === 'pausado' && (
                    <div style={{ padding: '12px 16px', background: 'var(--accent-orange-bg)', border: '1px solid var(--accent-orange)', borderRadius: 'var(--radius-sm)', marginBottom: 20, fontSize: 13, color: 'var(--accent-orange)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        ⏸ Proyecto en pausa{selectedProyecto.motivo_pausa ? `: ${selectedProyecto.motivo_pausa}` : ''}
                    </div>
                )}
                {(selectedProyecto.estado === 'completado' || selectedProyecto.estado === 'cancelado') && (
                    <div style={{ padding: '12px 16px', background: 'var(--accent-orange-bg)', border: '1px solid var(--accent-orange)', borderRadius: 'var(--radius-sm)', marginBottom: 20, fontSize: 13, color: 'var(--accent-orange)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        🔒 Este proyecto está <strong>{selectedProyecto.estado}</strong> y no permite modificaciones.
                    </div>
                )}

                {activeTab === 'detalle' && (
                    <div>
                        {selectedProyecto.descripcion && (
                            <div className="card" style={{ marginBottom: 16 }}>
                                <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{selectedProyecto.descripcion}</p>
                            </div>
                        )}
                        <div className="proyecto-stats-grid">
                            <div className="stat-card">
                                <div className="stat-icon blue"><Calendar size={20} /></div>
                                <div className="stat-info">
                                    <h4 style={{ fontSize: 16 }}>{selectedProyecto.fecha_inicio || '—'}</h4>
                                    <p>Fecha inicio</p>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon orange"><Calendar size={20} /></div>
                                <div className="stat-info">
                                    <h4 style={{ fontSize: 16 }}>{selectedProyecto.fecha_fin || '—'}</h4>
                                    <p>Fecha fin</p>
                                </div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon purple"><Package size={20} /></div>
                                <div className="stat-info">
                                    <h4><CountUp from={0} to={consumos.length} duration={1} separator="," /></h4>
                                    <p>Consumos registrados</p>
                                </div>
                            </div>
                            <div className="stat-card" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div className="stat-icon green"><Users size={20} /></div>
                                        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>Brigadas Asignadas</span>
                                    </div>
                                    {selectedProyecto.estado === 'activo' && (
                                        <button className="btn btn-secondary btn-sm" style={{ padding: '4px 8px', fontSize: 12 }} onClick={() => setShowAsignarBrigada(true)}>
                                            <Plus size={12} /> Asignar
                                        </button>
                                    )}
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, flex: 1, alignContent: 'flex-start' }}>
                                    {proyectoBrigadas.length > 0 ? proyectoBrigadas.map(pb => (
                                        <div key={pb.id} className="personnel-chip" style={{ fontSize: 12, padding: '4px 10px' }}>
                                            <Users size={12} />
                                            {pb.brigadas?.nombre}
                                            {selectedProyecto.estado === 'activo' && (
                                                <span className="remove" onClick={(e) => { e.stopPropagation(); handleRemoveBrigada(pb); }}>
                                                    <X size={12} />
                                                </span>
                                            )}
                                        </div>
                                    )) : (
                                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Sin brigadas asignadas</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ===== REPORTE DE PROGRESO DEL PROYECTO ===== */}
                        <div className="card" style={{ marginTop: 16 }}>
                            <div className="card-header">
                                <h3>Reporte de Progreso</h3>
                                <button className="btn btn-secondary btn-sm" onClick={() => exportReportePDF()}>
                                    <Download size={14} /> Exportar PDF
                                </button>
                            </div>
                            {(() => {
                                // ---- Compute all report data ----
                                const consumosAsignacion = consumos.filter(c => !c.tipo || c.tipo === 'asignacion');
                                const consumosDiarios = consumos.filter(c => c.tipo === 'consumo');

                                // Total hours — deduplicate by fecha only: same date = same work session
                                // regardless of how many brigades or materials were recorded that day
                                const _dateHorasReport = consumosDiarios.reduce((map, c) => {
                                    const h = Number(c.horas) || 0;
                                    if (!map[c.fecha] || h > map[c.fecha]) map[c.fecha] = h;
                                    return map;
                                }, {});
                                const totalHoras = Object.values(_dateHorasReport).reduce((s, h) => s + h, 0);

                                // Unique work days
                                const diasTrabajados = new Set(consumosDiarios.map(c => c.fecha)).size;

                                // Total expenses
                                const totalGastos = proyectoGastos.reduce((s, g) => s + (Number(g.monto) || 0), 0);

                                // Material breakdown: inventario original + consumido
                                const matMap = {};
                                // Parse historical totals (same logic as almacen tab)
                                const histAsignaciones = proyectoHistorial.filter(h => h.motivo && h.motivo.startsWith('Material agregado al almacén: '));
                                histAsignaciones.forEach(h => {
                                    const text = h.motivo.substring('Material agregado al almacén: '.length);
                                    materiales.forEach(m => {
                                        if (!m.nombre) return;
                                        const escapedName = m.nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                        const regex = new RegExp(`${escapedName}:\\s*(\\d+)`, 'g');
                                        let match;
                                        while ((match = regex.exec(text)) !== null) {
                                            if (!matMap[m.id]) matMap[m.id] = { nombre: m.nombre, unidad: m.unidad || 'unidad', asignado: 0, consumido: 0 };
                                            matMap[m.id].asignado += parseInt(match[1], 10);
                                        }
                                    });
                                });
                                // Fallback: use current inventory
                                proyectoInventario.forEach(pi => {
                                    if (!matMap[pi.material_id]) {
                                        matMap[pi.material_id] = { nombre: pi.materiales?.nombre || 'Desconocido', unidad: pi.materiales?.unidad || 'unidad', asignado: pi.cantidad, consumido: 0 };
                                    }
                                    if (matMap[pi.material_id].asignado < pi.cantidad) matMap[pi.material_id].asignado = pi.cantidad;
                                });
                                // Add consumption
                                consumosDiarios.forEach(c => {
                                    if (matMap[c.material_id]) {
                                        matMap[c.material_id].consumido += Number(c.cantidad || 0);
                                    }
                                });
                                // Also count brigade-level assignments as consumed from project warehouse
                                consumosAsignacion.forEach(c => {
                                    if (matMap[c.material_id]) {
                                        // already accounted in asignado via project inventory
                                    }
                                });

                                const matList = Object.values(matMap).filter(m => m.asignado > 0 || m.consumido > 0).sort((a, b) => a.nombre.localeCompare(b.nombre));
                                const totalAsignado = matList.reduce((s, m) => s + m.asignado, 0);
                                const totalConsumido = matList.reduce((s, m) => s + m.consumido, 0);
                                const progreso = totalAsignado > 0 ? Math.round((totalConsumido / totalAsignado) * 100) : 0;

                                // Date calculations
                                const fechaInicio = selectedProyecto.fecha_inicio ? new Date(selectedProyecto.fecha_inicio + 'T00:00:00') : null;
                                const fechaFin = selectedProyecto.fecha_fin ? new Date(selectedProyecto.fecha_fin + 'T00:00:00') : null;
                                const hoy = new Date();
                                let diasTranscurridos = 0;
                                let diasTotalesProyecto = 0;
                                let progresoTemporal = 0;
                                if (fechaInicio) {
                                    diasTranscurridos = Math.max(0, Math.ceil((hoy - fechaInicio) / (1000 * 60 * 60 * 24)));
                                    if (fechaFin) {
                                        diasTotalesProyecto = Math.max(1, Math.ceil((fechaFin - fechaInicio) / (1000 * 60 * 60 * 24)));
                                        progresoTemporal = Math.min(100, Math.round((diasTranscurridos / diasTotalesProyecto) * 100));
                                    }
                                }

                                return (
                                    <div style={{ padding: '0 4px' }}>
                                        {/* Summary metrics */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
                                            <div style={{ padding: '14px 16px', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Progreso Material</div>
                                                <div style={{ fontSize: 22, fontWeight: 700, color: progreso >= 80 ? 'var(--accent-red)' : progreso >= 50 ? 'var(--accent-orange)' : 'var(--accent-green)' }}>{progreso}%</div>
                                            </div>
                                            <div style={{ padding: '14px 16px', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Horas Trabajadas</div>
                                                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-blue)' }}>{totalHoras}h</div>
                                            </div>
                                            <div style={{ padding: '14px 16px', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Días Trabajados</div>
                                                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{diasTrabajados}</div>
                                            </div>
                                            <div style={{ padding: '14px 16px', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Brigadas</div>
                                                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-purple)' }}>{proyectoBrigadas.length}</div>
                                            </div>
                                            <div style={{ padding: '14px 16px', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>Gastos Totales</div>
                                                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent-orange)' }}>RD${totalGastos.toLocaleString()}</div>
                                            </div>
                                        </div>

                                        {/* Time progress bar */}
                                        {fechaInicio && fechaFin && (
                                            <div style={{ marginBottom: 20, padding: '14px 16px', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Progreso Temporal</span>
                                                    <span style={{ fontSize: 12, fontWeight: 600, color: progresoTemporal > 100 ? 'var(--accent-red)' : 'var(--text-secondary)' }}>{diasTranscurridos} / {diasTotalesProyecto} días ({progresoTemporal}%)</span>
                                                </div>
                                                <Progress
                                                    value={Math.min(progresoTemporal, 100)}
                                                    indicatorClassName={progresoTemporal > 100 ? 'red' : 'blue'}
                                                />
                                            </div>
                                        )}

                                        {/* Material usage table — top 5 most used */}
                                        {matList.length > 0 && (
                                            <div className="table-container">
                                                <table>
                                                    <thead>
                                                        <tr>
                                                            <th>Top 5 Materiales más usados</th>
                                                            <th style={{ textAlign: 'center' }}>Asignado</th>
                                                            <th style={{ textAlign: 'center' }}>Consumido</th>
                                                            <th style={{ textAlign: 'center' }}>Disponible</th>
                                                            <th style={{ width: '25%' }}>Uso</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {[...matList].sort((a, b) => b.consumido - a.consumido).slice(0, 5).map((m, idx) => {
                                                            const disponible = m.asignado - m.consumido;
                                                            const pct = m.asignado > 0 ? Math.round((m.consumido / m.asignado) * 100) : 0;
                                                            return (
                                                                <tr key={idx}>
                                                                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{m.nombre}</td>
                                                                    <td style={{ textAlign: 'center', color: 'var(--accent-blue)', fontWeight: 600 }}>{m.asignado}</td>
                                                                    <td style={{ textAlign: 'center', color: 'var(--accent-orange)', fontWeight: 600 }}>{m.consumido}</td>
                                                                    <td style={{ textAlign: 'center', color: disponible > 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>{disponible}</td>
                                                                    <td>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                            <Progress
                                                                                value={Math.min(pct, 100)}
                                                                                style={{ flex: 1 }}
                                                                                indicatorClassName={pct >= 90 ? 'red' : pct >= 60 ? 'orange' : 'green'}
                                                                            />
                                                                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', minWidth: 32, textAlign: 'right' }}>{pct}%</span>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Material Consumption Chart */}
                        {consumos.filter(c => c.tipo === 'consumo').length > 0 && (
                            <div className="card" style={{ marginTop: 16 }}>
                                <div className="card-header">
                                    <h3>Consumo de Materiales por Día</h3>
                                </div>
                                <div id="chart-consumo-diario" style={{ position: 'relative', height: 350 }}>
                                    {(() => {
                                        const consumosDiarios = consumos.filter(c => c.tipo === 'consumo');

                                        // Get all unique dates sorted
                                        const allDates = [...new Set(consumosDiarios.map(c => c.fecha))].sort();

                                        // Group by material
                                        const materialMap = {};
                                        consumosDiarios.forEach(c => {
                                            const name = c.materiales?.nombre || 'Desconocido';
                                            if (!materialMap[name]) materialMap[name] = {};
                                            if (!materialMap[name][c.fecha]) materialMap[name][c.fecha] = 0;
                                            materialMap[name][c.fecha] += Number(c.cantidad);
                                        });

                                        const chartColors = [
                                            '#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#a855f7',
                                            '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#6366f1',
                                        ];

                                        const truncate = (str, n = 22) => str.length > n ? str.slice(0, n) + '…' : str;

                                        const top10Materials = Object.keys(materialMap)
                                            .map(name => ({ name, total: Object.values(materialMap[name]).reduce((a, b) => a + b, 0) }))
                                            .sort((a, b) => b.total - a.total)
                                            .slice(0, 10)
                                            .map(m => m.name);

                                        const datasets = top10Materials.map((materialName, idx) => {
                                            const color = chartColors[idx % chartColors.length];
                                            return {
                                                label: materialName,          // full name — used in tooltips
                                                shortLabel: truncate(materialName), // truncated — used in legend
                                                data: allDates.map(d => materialMap[materialName][d] || null),
                                                borderColor: color,
                                                backgroundColor: color + '20',
                                                tension: 0.4,
                                                pointRadius: 4,
                                                pointHoverRadius: 7,
                                                pointBackgroundColor: color,
                                                pointBorderColor: '#fff',
                                                pointBorderWidth: 2,
                                                borderWidth: 2.5,
                                                fill: false,
                                                spanGaps: true
                                            };
                                        });

                                        const data = {
                                            labels: allDates.map(d => {
                                                const parts = d.split('-');
                                                return `${parts[2]}/${parts[1]}`;
                                            }),
                                            datasets
                                        };

                                        const options = {
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            animation: {
                                                duration: 1500,
                                                easing: 'easeInOutQuart',
                                                delay: (ctx) => ctx.dataIndex * 80 + ctx.datasetIndex * 150
                                            },
                                            interaction: {
                                                mode: 'nearest',
                                                intersect: true
                                            },
                                            plugins: {
                                                legend: {
                                                    position: 'bottom',
                                                    labels: {
                                                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#cbd5e1',
                                                        padding: 16,
                                                        usePointStyle: true,
                                                        pointStyle: 'circle',
                                                        font: { size: 12, family: 'Inter' },
                                                        generateLabels: (chart) => {
                                                            const labelColor = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#cbd5e1';
                                                            return chart.data.datasets.map((ds, i) => ({
                                                                text: ds.shortLabel || ds.label,
                                                                fillStyle: ds.borderColor,
                                                                strokeStyle: ds.borderColor,
                                                                fontColor: labelColor,
                                                                lineWidth: 2,
                                                                hidden: !chart.isDatasetVisible(i),
                                                                datasetIndex: i,
                                                                pointStyle: 'circle'
                                                            }));
                                                        }
                                                    }
                                                },
                                                tooltip: {
                                                    backgroundColor: 'rgba(0,0,0,0.85)',
                                                    titleFont: { size: 13, family: 'Inter' },
                                                    bodyFont: { size: 12, family: 'Inter' },
                                                    padding: 12,
                                                    cornerRadius: 8,
                                                    displayColors: true,
                                                    callbacks: {
                                                        // Show full material name in tooltip body
                                                        label: (ctx) => {
                                                            const fullName = ctx.dataset.label;
                                                            const val = ctx.parsed?.y;
                                                            return ` ${fullName}: ${val != null ? val.toLocaleString() : '0'}`;
                                                        }
                                                    }
                                                },
                                                title: { display: false }
                                            },
                                            scales: {
                                                x: {
                                                    grid: {
                                                        color: getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim() || 'rgba(255,255,255,0.06)',
                                                        drawBorder: false
                                                    },
                                                    ticks: {
                                                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#94a3b8',
                                                        font: { size: 11, family: 'Inter' }
                                                    }
                                                },
                                                y: {
                                                    type: 'logarithmic',
                                                    grid: {
                                                        color: getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim() || 'rgba(255,255,255,0.06)',
                                                        drawBorder: false
                                                    },
                                                    ticks: {
                                                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#94a3b8',
                                                        font: { size: 11, family: 'Inter' },
                                                        callback: (value) => {
                                                            // Only show clean round numbers to avoid clutter
                                                            const log = Math.log10(value);
                                                            if (Number.isInteger(log) || [2, 5].includes(value / Math.pow(10, Math.floor(log)))) {
                                                                return value.toLocaleString();
                                                            }
                                                            return '';
                                                        }
                                                    }
                                                }
                                            }
                                        };

                                        return <Line key={themeTrigger} data={data} options={options} />;
                                    })()}
                                </div>
                            </div>
                        )}

                        {/* Material Usage Chart — Doughnut */}
                        {proyectoInventario.length > 0 && (
                            <div className="card" style={{ marginTop: 16 }}>
                                <div className="card-header">
                                    <h3>Inventario vs Consumo de Brigadas</h3>
                                </div>
                                {(() => {
                                    const materialMap = {};
                                    proyectoInventario.forEach(pi => {
                                        if (!materialMap[pi.material_id]) {
                                            materialMap[pi.material_id] = {
                                                nombre: pi.materiales?.nombre || 'Desconocido',
                                                inventario: 0,
                                                consumido: 0
                                            };
                                        }
                                        materialMap[pi.material_id].inventario += Number(pi.cantidad || 0);
                                    });
                                    consumos.filter(c => c.tipo === 'consumo').forEach(c => {
                                        if (materialMap[c.material_id]) {
                                            materialMap[c.material_id].consumido += Number(c.cantidad || 0);
                                        } else {
                                            materialMap[c.material_id] = {
                                                nombre: c.materiales?.nombre || 'Desconocido',
                                                inventario: 0,
                                                consumido: Number(c.cantidad || 0)
                                            };
                                        }
                                    });

                                    // Top 8 by inventario for readability
                                    const materialsList = Object.values(materialMap)
                                        .filter(m => m.inventario > 0 || m.consumido > 0)
                                        .sort((a, b) => b.inventario - a.inventario)
                                        .slice(0, 8);

                                    if (materialsList.length === 0) return <div className="empty-state"><p>No hay datos de inventario o consumo.</p></div>;

                                    const palette = [
                                        '#38bdf8','#f97316','#34d399','#a78bfa',
                                        '#fb7185','#fbbf24','#60a5fa','#4ade80'
                                    ];
                                    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#cbd5e1';
                                    const mutedColor = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#94a3b8';

                                    const sharedOptions = {
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        cutout: '62%',
                                        plugins: {
                                            legend: {
                                                position: 'right',
                                                labels: {
                                                    color: textColor,
                                                    usePointStyle: true,
                                                    pointStyle: 'circle',
                                                    font: { size: 11, family: 'Inter' },
                                                    padding: 10,
                                                    boxWidth: 8,
                                                    formatter: (label) => label.length > 22 ? label.slice(0, 22) + '…' : label
                                                }
                                            },
                                            tooltip: {
                                                backgroundColor: 'rgba(0,0,0,0.85)',
                                                titleFont: { size: 12, family: 'Inter' },
                                                bodyFont: { size: 11, family: 'Inter' },
                                                padding: 10,
                                                cornerRadius: 8,
                                                callbacks: {
                                                    label: (ctx) => ` ${ctx.label}: ${ctx.parsed.toLocaleString()}`
                                                }
                                            }
                                        }
                                    };

                                    const inventarioData = {
                                        labels: materialsList.map(m => m.nombre),
                                        datasets: [{
                                            data: materialsList.map(m => m.inventario),
                                            backgroundColor: palette,
                                            borderWidth: 2,
                                            borderColor: 'transparent',
                                            hoverOffset: 6
                                        }]
                                    };

                                    const consumoData = {
                                        labels: materialsList.map(m => m.nombre),
                                        datasets: [{
                                            data: materialsList.map(m => m.consumido),
                                            backgroundColor: palette,
                                            borderWidth: 2,
                                            borderColor: 'transparent',
                                            hoverOffset: 6
                                        }]
                                    };

                                    return (
                                        <div id="chart-inventario-consumo" className="chart-donut-grid">
                                            <div>
                                                <p style={{ textAlign: 'center', fontSize: 12, color: mutedColor, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>En Inventario</p>
                                                <div style={{ height: 220 }}>
                                                    <Doughnut key={`inv-${themeTrigger}`} data={inventarioData} options={sharedOptions} />
                                                </div>
                                            </div>
                                            <div>
                                                <p style={{ textAlign: 'center', fontSize: 12, color: mutedColor, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Consumido por Brigadas</p>
                                                <div style={{ height: 220 }}>
                                                    <Doughnut key={`con-${themeTrigger}`} data={consumoData} options={sharedOptions} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                    </div>
                )}

                {activeTab === 'consumos' && (
                    <div>
                        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Inventario de Brigadas</h2>
                        {/* Search + button on same row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                            <div className="search-bar" style={{ flex: 1, marginBottom: 0 }}>
                                <Search size={16} />
                                <input
                                    type="text"
                                    placeholder="Buscar material..."
                                    value={searchInventarioBrigadas}
                                    onChange={e => setSearchInventarioBrigadas(e.target.value)}
                                />
                            </div>
                            {selectedProyecto.estado === 'activo' && (() => {
                                const hasWarehouseStock = proyectoInventario.some(pi => pi.cantidad > 0);
                                return (
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={() => setShowAddConsumo(true)}
                                        disabled={!hasWarehouseStock}
                                        title={!hasWarehouseStock ? "Primero agregue materiales en Almacén" : ""}
                                        style={{ opacity: !hasWarehouseStock ? 0.6 : 1, cursor: !hasWarehouseStock ? 'not-allowed' : 'pointer', flexShrink: 0 }}
                                    >
                                        <Plus size={14} /> Asignar Material
                                    </button>
                                );
                            })()}
                        </div>
                        {(() => {
                            const inv = calcBrigadeInventory().filter(item => item.material?.toLowerCase().includes(searchInventarioBrigadas.toLowerCase()));
                            if (inv.length === 0) return (
                                <div className="table-container">
                                    <table><tbody>
                                        <tr><td colSpan="4">
                                            <div className="empty-state">
                                                <Package size={32} />
                                                <h4>Sin materiales asignados</h4>
                                                <p>Asigne materiales a una brigada para verlos aquí.</p>
                                            </div>
                                        </td></tr>
                                    </tbody></table>
                                </div>
                            );
                            const groups = inv.reduce((acc, item) => {
                                if (!acc[item.brigada_id]) acc[item.brigada_id] = { nombre: item.brigada, items: [] };
                                acc[item.brigada_id].items.push(item);
                                return acc;
                            }, {});
                            return Object.entries(groups).map(([brigId, group]) => {
                                const sectionKey = `brigInv_${brigId}`;
                                return (
                                    <div key={brigId} style={{ marginBottom: 24 }}>
                                        <div
                                            onClick={() => toggleSection(sectionKey)}
                                            style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer', userSelect: 'none' }}
                                        >
                                            <ChevronDown size={15} style={{ color: 'var(--accent-green)', transition: 'transform 0.25s ease', transform: collapsedSections[sectionKey] ? 'rotate(-90deg)' : 'rotate(0deg)', flexShrink: 0 }} />
                                            <Users size={15} style={{ color: 'var(--accent-green)' }} />
                                            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{group.nombre}</span>
                                        </div>
                                        {!collapsedSections[sectionKey] && (
                                            <div className="table-container" style={{ marginBottom: 0 }}>
                                                <table>
                                                    <thead>
                                                        <tr>
                                                            <th>Material</th>
                                                            <th style={{ textAlign: 'center' }}>Asignado</th>
                                                            <th style={{ textAlign: 'center' }}>Consumido</th>
                                                            <th style={{ textAlign: 'center' }}>Disponible</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {group.items.map((item, i) => (
                                                            <tr key={i}>
                                                                <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{item.material}</td>
                                                                <td style={{ fontWeight: 600, color: 'var(--accent-blue)', textAlign: 'center' }}>{item.asignado}</td>
                                                                <td style={{ fontWeight: 600, color: 'var(--accent-orange)', textAlign: 'center' }}>{item.consumido}</td>
                                                                <td style={{ fontWeight: 600, color: (item.asignado - item.consumido) > 0 ? 'var(--accent-green)' : 'var(--accent-red)', textAlign: 'center' }}>
                                                                    {item.asignado - item.consumido}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                );
                            });
                        })()}
                    </div>
                )}

                {activeTab === 'estimado' && (
                    <div>
                        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Consumo de Materiales</h2>
                        {/* Filter + search + button all on one row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                            <div style={{ width: 200, flexShrink: 0 }}>
                                <SearchableSelect
                                    value={filterBrigada}
                                    onChange={val => setFilterBrigada(val)}
                                    placeholder="Todas las brigadas"
                                    searchPlaceholder="Buscar brigada..."
                                    options={[
                                        { value: '', label: 'Todas las brigadas' },
                                        ...proyectoBrigadas.map(pb => ({ value: pb.brigada_id, label: pb.brigadas?.nombre || '' }))
                                    ]}
                                />
                            </div>
                            <div className="search-bar" style={{ flex: 1, marginBottom: 0 }}>
                                <Search size={16} />
                                <input
                                    type="text"
                                    placeholder="Buscar material..."
                                    value={searchEstimado}
                                    onChange={e => setSearchEstimado(e.target.value)}
                                />
                            </div>
                            {selectedProyecto.estado === 'activo' && (() => {
                                const hasAssignedMaterials = calcBrigadeInventory().some(item => (item.asignado - item.consumido) > 0);
                                return (
                                    <button
                                        className="btn btn-primary btn-sm"
                                        onClick={() => setShowAddConsumoDiario(true)}
                                        disabled={!hasAssignedMaterials}
                                        title={!hasAssignedMaterials ? "Primero asigne materiales en Inventario de Brigadas" : ""}
                                        style={{ opacity: !hasAssignedMaterials ? 0.6 : 1, cursor: !hasAssignedMaterials ? 'not-allowed' : 'pointer', flexShrink: 0 }}
                                    >
                                        <Plus size={14} /> Registrar Consumo Diario
                                    </button>
                                );
                            })()}
                        </div>
                        <div style={{ marginBottom: 24 }}>
                            <div
                                onClick={() => toggleSection('totalGeneral')}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 12, userSelect: 'none' }}
                            >
                                <ChevronDown size={15} style={{ color: 'var(--text-muted)', transition: 'transform 0.25s ease', transform: collapsedSections['totalGeneral'] ? 'rotate(-90deg)' : 'rotate(0deg)', flexShrink: 0 }} />
                                <h3 style={{ fontSize: 16, margin: 0, color: 'var(--text-primary)' }}>Total General del Proyecto</h3>
                            </div>
                            {!collapsedSections['totalGeneral'] && <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Material</th>
                                            <th style={{ textAlign: 'center' }}>Fechas Implicadas</th>
                                            <th style={{ textAlign: 'center' }}>Total Consumido</th>
                                            <th style={{ textAlign: 'center' }}>Días Trabajados</th>
                                            <th style={{ textAlign: 'center' }}>Horas Totales</th>
                                            <th style={{ textAlign: 'center' }}>Estimado / Hora</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            // Calculate global estimates by grouping all consumos for this project
                                            const globalAggregated = consumos
                                                .filter(c => c.tipo === 'consumo')
                                                .reduce((acc, c) => {
                                                    const mName = c.materiales?.nombre;
                                                    if (!mName) return acc;
                                                    if (!acc[mName]) {
                                                        acc[mName] = { total: 0, dates: new Set(), hours: 0, name: mName, dateHorasMap: {} };
                                                    }
                                                    acc[mName].total += Number(c.cantidad) || 0;
                                                    const fecha = c.fecha || c.created_at?.split('T')[0];
                                                    acc[mName].dates.add(fecha);
                                                    // Count max hours per date: same date = same work session
                                                    const h = Number(c.horas) || 0;
                                                    if (!acc[mName].dateHorasMap[fecha] || h > acc[mName].dateHorasMap[fecha]) {
                                                        acc[mName].dateHorasMap[fecha] = h;
                                                    }
                                                    return acc;
                                                }, {});

                                            const globalEstimates = Object.values(globalAggregated).map(e => {
                                                const hours = Object.values(e.dateHorasMap).reduce((s, h) => s + h, 0);
                                                const perHour = hours > 0 ? (e.total / hours).toFixed(2) : '—';
                                                return {
                                                    ...e,
                                                    hours,
                                                    days: e.dates.size,
                                                    perHour
                                                };
                                            }).filter(e => e.total > 0).filter(e => e.name?.toLowerCase().includes(searchEstimado.toLowerCase()));

                                            return globalEstimates.length > 0 ? globalEstimates.map((e, i) => (
                                                <tr key={i} onClick={() => setExpandedTotalRows(prev => ({ ...prev, [i]: !prev[i] }))} style={{ cursor: 'pointer' }}>
                                                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{e.name}</td>
                                                    <td style={{ color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                                            <ChevronDown
                                                                size={14}
                                                                style={{
                                                                    color: 'var(--text-muted)',
                                                                    transition: 'transform 0.3s ease',
                                                                    transform: expandedTotalRows[i] ? 'rotate(180deg)' : 'rotate(0deg)',
                                                                    flexShrink: 0
                                                                }}
                                                            />
                                                            <span style={{ color: 'var(--accent-cyan)', fontWeight: 500 }}>
                                                                {e.dates.size} {e.dates.size === 1 ? 'fecha' : 'fechas'}
                                                            </span>
                                                        </div>
                                                        {expandedTotalRows[i] && (
                                                            <div style={{
                                                                marginTop: 8,
                                                                display: 'flex',
                                                                flexWrap: 'wrap',
                                                                gap: 4,
                                                                justifyContent: 'center',
                                                                animation: 'fadeIn 0.3s ease'
                                                            }}>
                                                                {Array.from(e.dates).sort().reverse().map((d, di) => (
                                                                    <span key={di} style={{
                                                                        fontSize: 11,
                                                                        padding: '2px 8px',
                                                                        borderRadius: 'var(--radius-sm)',
                                                                        background: 'rgba(255,255,255,0.06)',
                                                                        color: 'var(--text-secondary)',
                                                                        border: '1px solid var(--border-color)'
                                                                    }}>
                                                                        {d.split('-').reverse().join('/')}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ fontWeight: 600, textAlign: 'center' }}>{e.total}</td>
                                                    <td style={{ textAlign: 'center' }}>{e.days}</td>
                                                    <td style={{ textAlign: 'center' }}>{e.hours > 0 ? e.hours : '—'}</td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        {e.perHour !== '—' ?
                                                            <span className="badge badge-orange"><Clock size={12} style={{ marginRight: 4 }} /> {e.perHour} / hora</span> :
                                                            <span style={{ color: 'var(--text-muted)' }}>Sin datos</span>
                                                        }
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr>
                                                    <td colSpan="6">
                                                        <div className="empty-state" style={{ padding: '24px 0' }}>
                                                            <p style={{ color: 'var(--text-muted)' }}>No hay consumos registrados en este proyecto.</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })()}
                                    </tbody>
                                </table>
                            </div>}
                        </div>

                        {/* Detalle por brigada */}
                        <div style={{ marginTop: 24 }}>
                            <div
                                onClick={() => toggleSection('detalleBrigada')}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 12, userSelect: 'none' }}
                            >
                                <ChevronDown size={15} style={{ color: 'var(--text-muted)', transition: 'transform 0.25s ease', transform: collapsedSections['detalleBrigada'] ? 'rotate(-90deg)' : 'rotate(0deg)', flexShrink: 0 }} />
                                <h3 style={{ fontSize: 16, margin: 0, color: 'var(--text-primary)' }}>Detalle por Brigada</h3>
                            </div>
                            {!collapsedSections['detalleBrigada'] && <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Material</th>
                                            <th style={{ textAlign: 'center' }}>Fechas Implicadas</th>
                                            <th style={{ textAlign: 'center' }}>Total Consumido</th>
                                            <th style={{ textAlign: 'center' }}>Días Trabajados</th>
                                            <th style={{ textAlign: 'center' }}>Horas Totales</th>
                                            <th style={{ textAlign: 'center' }}>Estimado / Hora</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {estimates.filter(e => e.name?.toLowerCase().includes(searchEstimado.toLowerCase())).length > 0 ? estimates.filter(e => e.name?.toLowerCase().includes(searchEstimado.toLowerCase())).map((e, i) => (
                                            <tr key={e.id || i}>
                                                <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{e.name}</td>
                                                <td style={{ color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center' }}>{
                                                    e.date
                                                        ? e.date.split('-').reverse().join('/')
                                                        : '—'
                                                }</td>
                                                <td style={{ fontWeight: 600, textAlign: 'center' }}>{e.total}</td>
                                                <td style={{ textAlign: 'center' }}>1</td>
                                                <td style={{ textAlign: 'center' }}>{e.hours > 0 ? e.hours : '—'}</td>
                                                <td style={{ textAlign: 'center' }}>
                                                    {e.perHour !== '—' ?
                                                        <span className="badge badge-orange"><Clock size={12} style={{ marginRight: 4 }} /> {e.perHour} / hora</span> :
                                                        <span style={{ color: 'var(--text-muted)' }}>Sin datos</span>
                                                    }
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan="6">
                                                <div className="empty-state">
                                                    <Clock size={32} />
                                                    <h4>Sin datos para calcular</h4>
                                                    <p>Registre consumos diarios para obtener estimados basados en horas reales.</p>
                                                </div>
                                            </td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>}
                        </div>
                    </div>
                )}

                {activeTab === 'cotizacion' && (
                    <div>
                        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Cotización</h2>
                        <div className="card" style={{ marginBottom: 20 }}>
                            <div className="cotizacion-header">
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <h3 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>Cabecera de Cotización</h3>
                                    <div className="cotizacion-info-grid">
                                        <div><strong>Cliente:</strong> Camusat Dominicana</div>
                                        <div><strong>RNC:</strong> 1-23-00159-2</div>
                                        <div style={{ gridColumn: '1 / -1' }}><strong>Dirección:</strong> Carretera Duarte Vieja N° 110, Santo Domingo, Rep. Dom.</div>
                                        <div><strong>Asignado por:</strong> Sr. Ramón Ruiz</div>
                                        <div><strong>Tipo trabajo:</strong> Fibra óptica</div>
                                    </div>
                                </div>
                                <button className="btn btn-primary" style={{ flexShrink: 0 }} onClick={generateQuotePDF}>
                                    <Download size={16} /> Exportar PDF
                                </button>
                            </div>
                        </div>

                        <div className="card">
                            <div className="card-header" style={{ marginBottom: 16 }}>
                                <h3>Ítems de Cotización</h3>
                                <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                                    <input
                                        list="cotizacion-opciones"
                                        className="form-input"
                                        placeholder="+ Buscar en catálogo..."
                                        style={{ flex: 1, minWidth: 0 }}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const item = cotizacionCatalogo.find(c => `${c.codigo} - ${c.descripcion}` === val);
                                            if (item) {
                                                handleAddQuoteItem(item);
                                                e.target.value = ''; // Reset
                                            }
                                        }}
                                        disabled={selectedProyecto.estado !== 'activo'}
                                    />
                                    <datalist id="cotizacion-opciones">
                                        {cotizacionCatalogo.filter(c => !cotizacionItems.some(item => item.catalogo_id === c.id)).map(c => (
                                            <option key={c.id} value={`${c.codigo} - ${c.descripcion}`} />
                                        ))}
                                    </datalist>
                                </div>
                            </div>

                            <div className="search-bar" style={{ marginBottom: 12 }}>
                                <Search size={16} />
                                <input
                                    type="text"
                                    placeholder="Buscar material..."
                                    value={searchCotizacion}
                                    onChange={e => setSearchCotizacion(e.target.value)}
                                />
                            </div>

                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th style={{ width: 60, textAlign: 'center' }}>Item</th>
                                            <th style={{ width: 100 }}>Código</th>
                                            <th>Descripción</th>
                                            <th style={{ width: 80, textAlign: 'center' }}>Unidad</th>
                                            <th style={{ width: 120, textAlign: 'right' }}>P.U. (RD$)</th>
                                            <th style={{ width: 100, textAlign: 'center' }}>Cantidad</th>
                                            <th style={{ width: 120, textAlign: 'right' }}>Total (RD$)</th>
                                            {selectedProyecto.estado === 'activo' && <th style={{ width: 50 }}></th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cotizacionItems.filter(item => item.descripcion?.toLowerCase().includes(searchCotizacion.toLowerCase()) || item.codigo?.toLowerCase().includes(searchCotizacion.toLowerCase())).length > 0 ? cotizacionItems.filter(item => item.descripcion?.toLowerCase().includes(searchCotizacion.toLowerCase()) || item.codigo?.toLowerCase().includes(searchCotizacion.toLowerCase())).map((item, index) => {
                                            const itemTotal = Number(item.cantidad) * Number(item.precio_unitario);
                                            return (
                                                <tr key={item.id}>
                                                    <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{index + 1}</td>
                                                    <td style={{ fontWeight: 500 }}>{item.codigo}</td>
                                                    <td>{item.descripcion}</td>
                                                    <td style={{ textAlign: 'center' }}>{item.unidad}</td>
                                                    <td style={{ textAlign: 'right' }}>{Number(item.precio_unitario).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            className="form-input"
                                                            style={{ width: 80, padding: '4px 8px', textAlign: 'center' }}
                                                            value={item.cantidad}
                                                            onChange={(e) => setCotizacionItems(prev => prev.map(p => p.id === item.id ? { ...p, cantidad: e.target.value } : p))}
                                                            onBlur={(e) => handleUpdateQuoteQuantity(item.id, e.target.value)}
                                                            disabled={selectedProyecto.estado !== 'activo'}
                                                        />
                                                    </td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>
                                                        {itemTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </td>
                                                    {selectedProyecto.estado === 'activo' && (
                                                        <td style={{ textAlign: 'center' }}>
                                                            <button
                                                                className="btn btn-sm"
                                                                style={{ color: 'var(--accent-red)', background: 'transparent', padding: 4 }}
                                                                onClick={() => handleRemoveQuoteItem(item.id)}
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        }) : (
                                            <tr>
                                                <td colSpan={selectedProyecto.estado === 'activo' ? 8 : 7}>
                                                    <div className="empty-state" style={{ padding: '24px 0' }}>
                                                        <FileText size={32} />
                                                        <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>No hay ítems en esta cotización.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    {cotizacionItems.length > 0 && (
                                        <tfoot>
                                            <tr>
                                                <td colSpan="6" style={{ textAlign: 'right', fontWeight: 'bold' }}>TOTAL GRAL. RD$</td>
                                                <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: 15, color: 'var(--accent-blue)' }}>
                                                    {cotizacionItems.reduce((acc, item) => acc + (Number(item.cantidad) * Number(item.precio_unitario)), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </td>
                                                {selectedProyecto.estado === 'activo' && <td></td>}
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'historial' && (
                    <div>
                        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Historial del Proyecto</h2>
                        <div className="filter-bar" style={{ gap: 12 }}>
                            <SearchableSelect
                                value={filterBrigada}
                                onChange={val => setFilterBrigada(val)}
                                placeholder="Todas las brigadas"
                                searchPlaceholder="Buscar brigada..."
                                options={[
                                    { value: '', label: 'Todas las brigadas' },
                                    ...proyectoBrigadas.map(pb => ({ value: pb.brigada_id, label: pb.brigadas?.nombre || '' }))
                                ]}
                            />
                            <SearchableSelect
                                value={filterTipoHistorial}
                                onChange={val => setFilterTipoHistorial(val)}
                                placeholder="Todos los tipos"
                                searchPlaceholder="Buscar tipo..."
                                options={[
                                    { value: '', label: 'Todos los tipos' },
                                    { value: 'consumo', label: 'Consumo diario' },
                                    { value: 'asignacion', label: 'Asignación de materiales' },
                                    { value: 'traspaso', label: 'Traspaso de inventario' },
                                    { value: 'estado', label: 'Cambios de estado' }
                                ]}
                            />
                        </div>
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Estado Anterior</th>
                                        <th>Estado Nuevo</th>
                                        <th>Motivo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        const bNameFilter = filterBrigada ? (brigadas.find(b => b.id === filterBrigada)?.nombre || '___') : null;
                                        let filtered = filterBrigada
                                            ? proyectoHistorial.filter(h => h.motivo && (h.motivo.includes(bNameFilter) || h.motivo.includes('Traspaso')))
                                            : proyectoHistorial;
                                        // Filter by type
                                        if (filterTipoHistorial === 'consumo') {
                                            filtered = filtered.filter(h => h.motivo && h.motivo.startsWith('Consumo diario'));
                                        } else if (filterTipoHistorial === 'asignacion') {
                                            filtered = filtered.filter(h => h.motivo && h.motivo.startsWith('Asignación de materiales'));
                                        } else if (filterTipoHistorial === 'traspaso') {
                                            filtered = filtered.filter(h => h.motivo && h.motivo.startsWith('Traspaso'));
                                        } else if (filterTipoHistorial === 'estado') {
                                            filtered = filtered.filter(h => !h.motivo || (!h.motivo.startsWith('Consumo diario') && !h.motivo.startsWith('Asignación de materiales') && !h.motivo.startsWith('Traspaso')));
                                        }
                                        return filtered.length > 0 ? filtered.map(h => (
                                            <tr key={h.id}>
                                                <td>{new Date(h.created_at).toLocaleString('es-ES')}</td>
                                                <td><span className={`badge ${estadoColor[h.estado_anterior] || ''}`}>{h.estado_anterior}</span></td>
                                                <td><span className={`badge ${estadoColor[h.estado_nuevo] || ''}`}>{h.estado_nuevo}</span></td>
                                                <td>
                                                    {h.motivo || '—'}
                                                    {h.metadata && (
                                                        <button
                                                            className="btn btn-secondary btn-sm"
                                                            style={{ marginLeft: 8, padding: '2px 6px', fontSize: 11 }}
                                                            onClick={() => {
                                                                setSelectedReceipt(h.metadata);
                                                                setShowReceiptModal(true);
                                                            }}
                                                        >
                                                            <FileText size={12} style={{ marginRight: 4 }} /> Ver Recibo
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan="4">
                                                <div className="empty-state">
                                                    <Clock size={32} />
                                                    <h4>Sin historial de cambios</h4>
                                                </div>
                                            </td></tr>
                                        );
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ===== TAB: ALMACÉN DEL PROYECTO ===== */}
                {activeTab === 'almacen' && (
                    <div>
                        <div style={{ marginBottom: 16 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px 0' }}>Almacén del Proyecto</h2>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div className="search-bar" style={{ flex: 1, marginBottom: 0 }}>
                                <Search size={16} />
                                <input
                                    type="text"
                                    placeholder="Buscar material..."
                                    value={searchAlmacen}
                                    onChange={e => setSearchAlmacen(e.target.value)}
                                />
                            </div>
                            {selectedProyecto.estado === 'activo' && (
                                <div style={{ position: 'relative', flexShrink: 0 }}>
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => setShowAlmacenDropdown(!showAlmacenDropdown)}
                                    >
                                        <Plus size={16} /> Agregar Material
                                        <ChevronDown size={14} style={{ marginLeft: 4, transition: 'transform 0.2s', transform: showAlmacenDropdown ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                                    </button>
                                    {showAlmacenDropdown && (
                                        <>
                                            <div className="animated-dropdown-backdrop" onClick={() => setShowAlmacenDropdown(false)} />
                                            <div className="animated-dropdown">
                                                <div className="animated-dropdown-label">Tipo de entrada</div>
                                                <div className="animated-dropdown-separator" />
                                                <button className="animated-dropdown-item" onClick={() => { setShowAlmacenDropdown(false); setShowAddAlmacen(true); }}>
                                                    <Package size={14} /> Desde almacén general
                                                </button>
                                                <button className="animated-dropdown-item" onClick={() => { setShowAlmacenDropdown(false); setShowEntradaDirecta(true); }}>
                                                    <Plus size={14} /> Entrada directa al proyecto
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                            </div>
                        </div>

                        <div style={{ marginBottom: 24 }}>
                            <div
                                onClick={() => toggleSection('almacenHistorico')}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8, userSelect: 'none' }}
                            >
                                <ChevronDown size={15} style={{ color: 'var(--text-muted)', transition: 'transform 0.25s ease', transform: collapsedSections['almacenHistorico'] ? 'rotate(-90deg)' : 'rotate(0deg)', flexShrink: 0 }} />
                                <h4 style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>Total Histórico Asignado al Proyecto</h4>
                            </div>
                            {!collapsedSections['almacenHistorico'] && <div className="table-container">
                                {(() => {
                                    const asignaciones = proyectoHistorial.filter(h => h.motivo && h.motivo.startsWith('Material agregado al almacén: '));

                                    const totalAsignadoMap = {};

                                    // Parse values from text-based history records using exact string matching per material
                                    asignaciones.forEach(h => {
                                        const text = h.motivo.substring('Material agregado al almacén: '.length);

                                        // Match against global materiales list to be bulletproof against commas in names
                                        materiales.forEach(m => {
                                            if (!m.nombre) return;
                                            // Escape specials and mandate the colon exactly after the name to avoid substring collisions
                                            const escapedName = m.nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                            const regex = new RegExp(`${escapedName}:\\s*(\\d+)`, 'g');

                                            let match;
                                            while ((match = regex.exec(text)) !== null) {
                                                const qty = parseInt(match[1], 10);
                                                if (!totalAsignadoMap[m.id]) {
                                                    totalAsignadoMap[m.id] = {
                                                        nombre: m.nombre,
                                                        unidad: m.unidad || 'unidad',
                                                        total: 0
                                                    };
                                                }
                                                totalAsignadoMap[m.id].total += qty;
                                            }
                                        });
                                    });

                                    // As a fallback for older materials that don't have history, ensure we at least show their CURRENT warehouse quantity
                                    proyectoInventario.forEach(pi => {
                                        if (pi.cantidad > 0) {
                                            if (!totalAsignadoMap[pi.material_id]) {
                                                totalAsignadoMap[pi.material_id] = {
                                                    nombre: pi.materiales?.nombre || 'Desconocido',
                                                    unidad: pi.materiales?.unidad || 'unidad',
                                                    total: 0
                                                };
                                            }
                                            // Ensure the historical total is AT LEAST what's physically sitting in the warehouse right now
                                            if (totalAsignadoMap[pi.material_id].total < pi.cantidad) {
                                                totalAsignadoMap[pi.material_id].total = pi.cantidad;
                                            }
                                        }
                                    });

                                    const asignadosList = Object.values(totalAsignadoMap).filter(item => item.total > 0).sort((a, b) => a.nombre.localeCompare(b.nombre)).filter(item => item.nombre?.toLowerCase().includes(searchAlmacen.toLowerCase()));

                                    if (asignadosList.length === 0) {
                                        return <p style={{ padding: '12px 16px', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: 13 }}>No hay histórico de asignaciones registradas.</p>;
                                    }

                                    return (
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Material</th>
                                                    <th>Unidad</th>
                                                    <th style={{ textAlign: 'center' }}>Total Asignado al Proyecto</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {asignadosList.map((item, idx) => (
                                                    <tr key={idx}>
                                                        <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{item.nombre}</td>
                                                        <td style={{ color: 'var(--text-secondary)' }}>{item.unidad}</td>
                                                        <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--accent-blue)' }}>{item.total}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    );
                                })()}
                            </div>}
                        </div>

                        {(() => {
                            const isCompleted = selectedProyecto.estado === 'completado';
                            const itemsConStock = proyectoInventario.filter(pi => pi.cantidad > 0).filter(pi => pi.materiales?.nombre?.toLowerCase().includes(searchAlmacen.toLowerCase()));
                            const title = isCompleted ? 'Materiales a Devolver al Cliente' : 'Existencia Actual';
                            const columnTitle = isCompleted ? 'Cantidad a Devolver' : 'Cantidad Disponible';
                            const color = isCompleted ? 'var(--accent-orange)' : 'var(--accent-green)';
                            const sectionKey = isCompleted ? 'almacenDevolver' : 'almacenExistencia';

                            return (
                                <>
                                    <div
                                        onClick={() => toggleSection(sectionKey)}
                                        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8, marginTop: 16, userSelect: 'none' }}
                                    >
                                        <ChevronDown size={15} style={{ color: 'var(--text-muted)', transition: 'transform 0.25s ease', transform: collapsedSections[sectionKey] ? 'rotate(-90deg)' : 'rotate(0deg)', flexShrink: 0 }} />
                                        <h4 style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
                                            {title}
                                        </h4>
                                    </div>
                                    {!collapsedSections[sectionKey] && (<>
                                    {isCompleted && itemsConStock.length > 0 && (
                                        <div style={{ padding: '10px 14px', background: 'var(--accent-orange-bg)', border: '1px solid var(--accent-orange)', borderRadius: 'var(--radius-sm)', marginBottom: 12, fontSize: 13, color: 'var(--accent-orange)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                            📦 Proyecto completado — estos materiales sobrantes deben ser devueltos al cliente.
                                        </div>
                                    )}
                                    {itemsConStock.length > 0 ? (
                                        <div className="table-container">
                                            <table>
                                                <thead><tr><th>Material</th><th>Unidad</th><th style={{ textAlign: 'center' }}>{columnTitle}</th></tr></thead>
                                                <tbody>
                                                    {itemsConStock.map(pi => (
                                                        <tr key={pi.id}>
                                                            <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{pi.materiales?.nombre || '—'}</td>
                                                            <td>{pi.materiales?.unidad || '—'}</td>
                                                            <td style={{ textAlign: 'center', fontWeight: 600, color }}>{pi.cantidad}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="empty-state"><Package size={32} /><h4>{isCompleted ? 'Sin materiales sobrantes' : 'Almacén vacío'}</h4><p>{isCompleted ? 'No quedan materiales por devolver.' : 'Agregue materiales desde el inventario global'}</p></div>
                                    )}
                                    </>)}
                                </>
                            );
                        })()}
                    </div>
                )}

                {/* ===== TAB: DEVOLUCIÓN DE MATERIALES ===== */}
                {activeTab === 'devolucion' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Devolución de Materiales</h3>
                            <div style={{ display: 'flex', gap: 12 }}>
                                {proyectoDevoluciones.length > 0 && (
                                    <button className="btn btn-secondary" onClick={exportDevolucionesPDF} title="Exportar reporte de devoluciones">
                                        <Download size={16} /> Exportar PDF
                                    </button>
                                )}
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setShowDevolucion(true)}
                                    disabled={selectedProyecto.estado !== 'completado'}
                                    title={selectedProyecto.estado !== 'completado' ? "El proyecto debe estar completado para hacer devoluciones" : ""}
                                    style={{ opacity: selectedProyecto.estado !== 'completado' ? 0.6 : 1, cursor: selectedProyecto.estado !== 'completado' ? 'not-allowed' : 'pointer' }}
                                >
                                    <ArrowLeft size={16} /> Devolver Materiales
                                </button>
                            </div>
                        </div>
                        {proyectoDevoluciones.length > 0 ? (
                            <div className="table-container">
                                <table>
                                    <thead><tr><th>Fecha</th><th>Material</th><th style={{ textAlign: 'center' }}>Cantidad</th><th>Observaciones</th></tr></thead>
                                    <tbody>
                                        {proyectoDevoluciones.map(d => (
                                            <tr key={d.id}>
                                                <td>{new Date(d.created_at).toLocaleDateString('es-ES')}</td>
                                                <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{d.materiales?.nombre || '—'}</td>
                                                <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--accent-blue)' }}>{d.cantidad}</td>
                                                <td>{d.observaciones || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="empty-state"><ArrowLeft size={32} /><h4>Sin devoluciones registradas</h4></div>
                        )}
                    </div>
                )}

                {/* ===== TAB: GASTOS ===== */}
                {activeTab === 'gastos' && (() => {
                    const categoriaLabels = { brigadas: 'Brigadas Asignadas', combustible: 'Combustible', dieta: 'Dieta', mantenimiento_vehiculo: 'Mant. Vehículo', estadia: 'Estadía', otros: 'Otros' };
                    const categoriaColors = { brigadas: '#3b82f6', combustible: '#f59e0b', dieta: '#10b981', mantenimiento_vehiculo: '#8b5cf6', estadia: '#ec4899', otros: '#6b7280' };
                    const totalesPorCategoria = {};
                    let totalGeneral = 0;
                    proyectoGastos.forEach(g => {
                        totalesPorCategoria[g.categoria] = (totalesPorCategoria[g.categoria] || 0) + Number(g.monto);
                        totalGeneral += Number(g.monto);
                    });
                    return (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Gastos del Proyecto</h2>
                                <button className="btn btn-primary" onClick={() => setShowAddGasto(true)}>
                                    <Plus size={16} /> Registrar Gasto
                                </button>
                            </div>
                            {/* Resumen de gastos */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
                                {Object.entries(categoriaLabels).map(([key, label]) => (
                                    <div key={key} className="card" style={{ padding: 14 }}>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
                                        <div style={{ fontSize: 18, fontWeight: 700, color: categoriaColors[key] }}>RD$ {(totalesPorCategoria[key] || 0).toLocaleString()}</div>
                                    </div>
                                ))}
                                <div className="card" style={{ padding: 14, border: '1px solid var(--accent-blue)' }}>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Total General</div>
                                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-blue)' }}>RD$ {totalGeneral.toLocaleString()}</div>
                                </div>
                            </div>
                            {proyectoGastos.length > 0 ? (
                                <div className="table-container">
                                    <table>
                                        <thead><tr><th>Fecha</th><th>Categoría</th><th>Título</th><th style={{ textAlign: 'right' }}>Monto</th><th>Comentario</th><th></th></tr></thead>
                                        <tbody>
                                            {proyectoGastos.map(g => (
                                                <tr key={g.id}>
                                                    <td>{new Date(g.fecha).toLocaleDateString('es-ES')}</td>
                                                    <td><span className="badge" style={{ background: categoriaColors[g.categoria] + '20', color: categoriaColors[g.categoria] }}>{categoriaLabels[g.categoria]}</span></td>
                                                    <td>{g.titulo || '—'}</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 600 }}>RD$ {Number(g.monto).toLocaleString()}</td>
                                                    <td>{g.comentario || '—'}</td>
                                                    <td><button className="btn-ghost" onClick={() => handleDeleteGasto(g.id)}><Trash2 size={14} /></button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="empty-state"><h4>Sin gastos registrados</h4></div>
                            )}
                        </div>
                    );
                })()}

                {/* Modal: Entrada Directa al Proyecto */}
                {showEntradaDirecta && (
                    <div className="modal-overlay" onClick={() => setShowEntradaDirecta(false)}>
                        <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Entrada Directa de Materiales al Proyecto</h3>
                                <button className="modal-close" onClick={() => setShowEntradaDirecta(false)}><X size={18} /></button>
                            </div>
                            <div className="modal-body">
                                <div style={{
                                    background: 'rgba(251,191,36,0.08)',
                                    border: '1px solid rgba(251,191,36,0.3)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '10px 14px',
                                    marginBottom: 16,
                                    fontSize: 13,
                                    color: 'var(--text-secondary)',
                                    display: 'flex',
                                    gap: 8,
                                    alignItems: 'flex-start'
                                }}>
                                    <AlertTriangle size={15} style={{ color: '#fbbf24', marginTop: 1, flexShrink: 0 }} />
                                    <span>
                                        Estos materiales <strong>no provienen del almacén general</strong> — son materiales recibidos directamente en el proyecto (compra directa, entrega de proveedor en sitio, etc.).
                                        El stock del almacén general no se verá afectado.
                                    </span>
                                </div>
                                <form onSubmit={handleEntradaDirecta}>
                                    {entradaDirectaRows.map((row, i) => (
                                        <div key={i} style={{ marginBottom: 12 }}>
                                            <div className="bulk-row">
                                                <SearchableSelect
                                                    value={row.material_id}
                                                    onChange={val => setEntradaDirectaRows(entradaDirectaRows.map((r, idx) => idx === i ? { ...r, material_id: val } : r))}
                                                    placeholder="Seleccionar material..."
                                                    searchPlaceholder="Buscar material..."
                                                    options={materiales.map(m => ({ value: m.id, label: `${m.codigo ? `[${m.codigo}] ` : ''}${m.nombre}`, sublabel: m.unidad }))}
                                                />
                                                <input
                                                    className="form-input"
                                                    type="number" min="1" step="1"
                                                    placeholder="Cantidad"
                                                    value={row.cantidad}
                                                    onChange={e => {
                                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                                        setEntradaDirectaRows(entradaDirectaRows.map((r, idx) => idx === i ? { ...r, cantidad: val } : r));
                                                    }}
                                                />
                                                <button type="button" className="remove-btn" onClick={() => { if (entradaDirectaRows.length > 1) setEntradaDirectaRows(entradaDirectaRows.filter((_, j) => j !== i)); }}>
                                                    <X size={16} />
                                                </button>
                                            </div>
                                            <input
                                                className="form-input"
                                                type="text"
                                                placeholder="Observaciones (opcional)"
                                                value={row.observaciones}
                                                onChange={e => setEntradaDirectaRows(entradaDirectaRows.map((r, idx) => idx === i ? { ...r, observaciones: e.target.value } : r))}
                                                style={{ marginTop: 6, fontSize: 13 }}
                                            />
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        style={{ marginTop: 4 }}
                                        onClick={() => setEntradaDirectaRows([...entradaDirectaRows, { material_id: '', cantidad: '', observaciones: '' }])}
                                    >
                                        + Agregar fila
                                    </button>
                                    <div className="form-actions">
                                        <button type="button" className="btn btn-secondary" onClick={() => setShowEntradaDirecta(false)}>Cancelar</button>
                                        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                                            {isSubmitting ? 'Guardando...' : 'Registrar Entrada'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal: Agregar al Almacén */}
                {showAddAlmacen && (
                    <div className="modal-overlay" onClick={() => setShowAddAlmacen(false)}>
                        <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Agregar Material al Almacén del Proyecto</h3>
                                <button className="modal-close" onClick={() => setShowAddAlmacen(false)}><X size={18} /></button>
                            </div>
                            <div className="modal-body">
                                <form onSubmit={handleAddAlmacen}>
                                    {almacenRows.map((row, i) => (
                                        <div className="bulk-row" key={i}>
                                            <SearchableSelect
                                                value={row.material_id}
                                                onChange={val => setAlmacenRows(almacenRows.map((r, idx) => idx === i ? { ...r, material_id: val } : r))}
                                                placeholder="Seleccionar material..."
                                                searchPlaceholder="Buscar material..."
                                                options={materiales.map(m => { const inv = Array.isArray(m.inventario) ? m.inventario[0] : m.inventario; return { value: m.id, label: `${m.codigo ? `[${m.codigo}] ` : ''}${m.nombre}`, sublabel: `Stock: ${inv?.cantidad ?? 0}` }; })}
                                            />
                                            <input className="form-input" type="number" min="1" step="1" placeholder="Cantidad" value={row.cantidad} onChange={e => {
                                                const val = e.target.value.replace(/[^0-9]/g, '');
                                                setAlmacenRows(almacenRows.map((r, idx) => idx === i ? { ...r, cantidad: val } : r));
                                            }} />
                                            <button type="button" className="remove-btn" onClick={() => { if (almacenRows.length > 1) setAlmacenRows(almacenRows.filter((_, j) => j !== i)); }}><X size={16} /></button>
                                        </div>
                                    ))}
                                    <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={() => setAlmacenRows([...almacenRows, { material_id: '', cantidad: '' }])}>+ Agregar fila</button>
                                    <div className="form-actions">
                                        <button type="button" className="btn btn-secondary" onClick={() => setShowAddAlmacen(false)}>Cancelar</button>
                                        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                                            {isSubmitting ? 'Guardando...' : 'Agregar al Almacén'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal: Devolución de Materiales */}
                {showDevolucion && (
                    <div className="modal-overlay" onClick={() => setShowDevolucion(false)}>
                        <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Devolver Materiales al Inventario Global</h3>
                                <button className="modal-close" onClick={() => setShowDevolucion(false)}><X size={18} /></button>
                            </div>
                            <div className="modal-body">
                                <form onSubmit={handleDevolucion}>
                                    {devolucionRows.map((row, i) => (
                                        <div key={i} style={{ marginBottom: 12 }}>
                                            <div className="bulk-row">
                                                <SearchableSelect
                                                    value={row.material_id}
                                                    onChange={val => setDevolucionRows(devolucionRows.map((r, idx) => idx === i ? { ...r, material_id: val } : r))}
                                                    placeholder="Seleccionar material..."
                                                    searchPlaceholder="Buscar material..."
                                                    options={proyectoInventario.filter(pi => pi.cantidad > 0).map(pi => ({ value: pi.material_id, label: pi.materiales?.nombre || '', sublabel: `Disponible: ${pi.cantidad}` }))}
                                                />
                                                <input className="form-input" type="number" min="1" step="1" placeholder="Cantidad" value={row.cantidad} onChange={e => {
                                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                                    setDevolucionRows(devolucionRows.map((r, idx) => idx === i ? { ...r, cantidad: val } : r));
                                                }} />
                                                <button type="button" className="remove-btn" onClick={() => { if (devolucionRows.length > 1) setDevolucionRows(devolucionRows.filter((_, j) => j !== i)); }}><X size={16} /></button>
                                            </div>
                                            <input className="form-input" style={{ marginTop: 4 }} placeholder="Observaciones (opcional)" value={row.observaciones} onChange={e => setDevolucionRows(devolucionRows.map((r, idx) => idx === i ? { ...r, observaciones: e.target.value } : r))} />
                                        </div>
                                    ))}
                                    <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={() => setDevolucionRows([...devolucionRows, { material_id: '', cantidad: '', observaciones: '' }])}>+ Agregar fila</button>
                                    <div className="form-actions">
                                        <button type="button" className="btn btn-secondary" onClick={() => setShowDevolucion(false)}>Cancelar</button>
                                        <button type="submit" className="btn btn-success" disabled={isSubmitting}>
                                            {isSubmitting ? 'Procesando...' : 'Devolver al Inventario'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal: Registrar Gasto */}
                {showAddGasto && (
                    <div className="modal-overlay" onClick={() => setShowAddGasto(false)}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Registrar Gasto</h3>
                                <button className="modal-close" onClick={() => setShowAddGasto(false)}><X size={18} /></button>
                            </div>
                            <div className="modal-body">
                                <form onSubmit={handleAddGasto}>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Fecha</label>
                                            <input className="form-input" type="date" value={gastoForm.fecha} onChange={e => setGastoForm({ ...gastoForm, fecha: e.target.value })} required />
                                        </div>
                                        <div className="form-group">
                                            <label>Categoría</label>
                                            <SearchableSelect
                                                value={gastoForm.categoria}
                                                onChange={val => setGastoForm({ ...gastoForm, categoria: val })}
                                                placeholder="Seleccionar categoría..."
                                                searchPlaceholder="Buscar categoría..."
                                                options={[
                                                    { value: 'combustible', label: 'Combustible' },
                                                    { value: 'dieta', label: 'Dieta' },
                                                    { value: 'mantenimiento_vehiculo', label: 'Mantenimiento Vehículo' },
                                                    { value: 'estadia', label: 'Estadía' },
                                                    { value: 'otros', label: 'Otros' }
                                                ]}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Monto (RD$)</label>
                                        <input className="form-input" type="number" min="0.01" step="0.01" required value={gastoForm.monto} onChange={e => setGastoForm({ ...gastoForm, monto: e.target.value })} placeholder="0.00" />
                                    </div>
                                    {gastoForm.categoria === 'otros' && (
                                        <div className="form-group">
                                            <label>Título del gasto *</label>
                                            <input className="form-input" value={gastoForm.titulo} onChange={e => setGastoForm({ ...gastoForm, titulo: e.target.value })} placeholder="Ej: Compra de herramientas" />
                                        </div>
                                    )}
                                    <div className="form-group">
                                        <label>Comentario</label>
                                        <textarea className="form-textarea" value={gastoForm.comentario} onChange={e => setGastoForm({ ...gastoForm, comentario: e.target.value })} placeholder="Detalles del gasto..." />
                                    </div>
                                    <div className="form-actions">
                                        <button type="button" className="btn btn-secondary" onClick={() => setShowAddGasto(false)}>Cancelar</button>
                                        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                                            {isSubmitting ? 'Registrando...' : 'Registrar'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {showAsignarBrigada && (
                    <div className="modal-overlay" onClick={() => setShowAsignarBrigada(false)}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Asignar Brigada al Proyecto</h3>
                                <button className="modal-close" onClick={() => setShowAsignarBrigada(false)}><X size={18} /></button>
                            </div>
                            <div className="modal-body">
                                <form onSubmit={handleAsignarBrigada}>
                                    <div className="form-group">
                                        <label>Brigada</label>
                                        <SearchableSelect
                                            value={brigadaToAssign}
                                            onChange={val => setBrigadaToAssign(val)}
                                            placeholder="Seleccionar brigada..."
                                            searchPlaceholder="Buscar brigada..."
                                            required
                                            options={availableBrigadasOptions}
                                        />
                                    </div>
                                    <div className="form-actions">
                                        <button type="button" className="btn btn-secondary" onClick={() => setShowAsignarBrigada(false)}>Cancelar</button>
                                        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                                            {isSubmitting ? 'Asignando...' : 'Asignar'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal: Asignar Material a Brigada */}
                {showAddConsumo && (
                    <div className="modal-overlay" onClick={() => setShowAddConsumo(false)}>
                        <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Asignar Material a Brigada</h3>
                                <button className="modal-close" onClick={() => setShowAddConsumo(false)}><X size={18} /></button>
                            </div>
                            <div className="modal-body">
                                <form onSubmit={handleAddConsumo}>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Brigada *</label>
                                            <SearchableSelect
                                                value={consumoForm.brigada_id}
                                                onChange={val => setConsumoForm({ ...consumoForm, brigada_id: val })}
                                                placeholder="Seleccionar brigada..."
                                                searchPlaceholder="Buscar brigada..."
                                                required
                                                options={proyectoBrigadas.map(pb => ({ value: pb.brigada_id, label: pb.brigadas?.nombre || '' }))}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Fecha *</label>
                                            <input className="form-input" type="date" required value={consumoForm.fecha}
                                                onChange={e => setConsumoForm({ ...consumoForm, fecha: e.target.value })} />
                                        </div>
                                    </div>

                                    <div style={{ marginTop: 12, marginBottom: 8 }}>
                                        <label style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>Materiales</label>
                                    </div>
                                    {consumoRows.map((row, i) => (
                                        <div className="bulk-row" key={i}>
                                            <SearchableSelect
                                                value={row.material_id}
                                                onChange={val => {
                                                    setConsumoRows(consumoRows.map((r, idx) =>
                                                        idx === i ? { ...r, material_id: val } : r
                                                    ));
                                                }}
                                                placeholder="Seleccionar material..."
                                                searchPlaceholder="Buscar material..."
                                                options={proyectoInventario.filter(pi => pi.cantidad > 0).map(pi => ({ value: pi.material_id, label: pi.materiales?.nombre || '', sublabel: `Almacén: ${pi.cantidad}` }))}
                                            />
                                            <input className="form-input" type="number" min="1" step="1"
                                                placeholder="Cantidad"
                                                value={row.cantidad}
                                                onChange={e => {
                                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                                    setConsumoRows(consumoRows.map((r, idx) =>
                                                        idx === i ? { ...r, cantidad: val } : r
                                                    ));
                                                }}
                                            />
                                            <button type="button" className="remove-btn" onClick={() => {
                                                if (consumoRows.length > 1) setConsumoRows(consumoRows.filter((_, j) => j !== i));
                                            }}>
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))}
                                    <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 8 }}
                                        onClick={() => setConsumoRows([...consumoRows, { material_id: '', cantidad: '' }])}>
                                        <Plus size={14} /> Agregar material
                                    </button>

                                    <div className="form-group" style={{ marginTop: 16 }}>
                                        <label>Observaciones</label>
                                        <textarea className="form-textarea" value={consumoForm.observaciones}
                                            onChange={e => setConsumoForm({ ...consumoForm, observaciones: e.target.value })}
                                            placeholder="Notas adicionales..." />
                                    </div>
                                    <div className="form-actions">
                                        <button type="button" className="btn btn-secondary" onClick={() => setShowAddConsumo(false)}>Cancelar</button>
                                        <button type="submit" className="btn btn-success" disabled={isSubmitting}>
                                            {isSubmitting ? 'Asignando...' : 'Asignar Material'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal: Registrar Consumo Diario */}
                {showAddConsumoDiario && (
                    <div className="modal-overlay" onClick={() => setShowAddConsumoDiario(false)}>
                        <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Registrar Consumo Diario</h3>
                                <button className="modal-close" onClick={() => setShowAddConsumoDiario(false)}><X size={18} /></button>
                            </div>
                            <div className="modal-body">
                                <form onSubmit={handleAddConsumoDiario}>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Brigada *</label>
                                            <SearchableSelect
                                                value={consumoDiarioForm.brigada_id}
                                                onChange={val => setConsumoDiarioForm({ ...consumoDiarioForm, brigada_id: val })}
                                                placeholder="Seleccionar brigada..."
                                                searchPlaceholder="Buscar brigada..."
                                                required
                                                options={proyectoBrigadas.map(pb => ({ value: pb.brigada_id, label: pb.brigadas?.nombre || '' }))}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Fecha *</label>
                                            <input className="form-input" type="date" required value={consumoDiarioForm.fecha}
                                                onChange={e => setConsumoDiarioForm({ ...consumoDiarioForm, fecha: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label>Horas Trabajadas *</label>
                                            <input className="form-input" type="number" min="0.5" step="0.5" required
                                                placeholder="Ej: 8" value={consumoDiarioForm.horas}
                                                onChange={e => setConsumoDiarioForm({ ...consumoDiarioForm, horas: e.target.value })} />
                                        </div>
                                    </div>

                                    <div style={{ marginTop: 12, marginBottom: 8 }}>
                                        <label style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>Materiales Consumidos</label>
                                    </div>
                                    {consumoDiarioRows.map((row, i) => {
                                        // Show materials that the brigade has in inventory
                                        const brigadaId = consumoDiarioForm.brigada_id;
                                        const asig = consumos.filter(c => (!c.tipo || c.tipo === 'asignacion') && c.brigada_id === brigadaId);
                                        const cons = consumos.filter(c => c.tipo === 'consumo' && c.brigada_id === brigadaId);
                                        const availableMats = materiales.filter(m => {
                                            const totalA = asig.filter(a => a.material_id === m.id).reduce((s, a) => s + a.cantidad, 0);
                                            const totalC = cons.filter(c => c.material_id === m.id).reduce((s, c) => s + c.cantidad, 0);
                                            return (totalA - totalC) > 0;
                                        });
                                        return (
                                            <div className="bulk-row" key={i}>
                                                <SearchableSelect
                                                    value={row.material_id}
                                                    onChange={val => {
                                                        setConsumoDiarioRows(consumoDiarioRows.map((r, idx) =>
                                                            idx === i ? { ...r, material_id: val } : r
                                                        ));
                                                    }}
                                                    placeholder="Seleccionar material..."
                                                    searchPlaceholder="Buscar material..."
                                                    options={availableMats.map(m => {
                                                        const totalA = asig.filter(a => a.material_id === m.id).reduce((s, a) => s + a.cantidad, 0);
                                                        const totalC = cons.filter(c => c.material_id === m.id).reduce((s, c) => s + c.cantidad, 0);
                                                        return { value: m.id, label: m.nombre, sublabel: `Disponible: ${totalA - totalC}` };
                                                    })}
                                                />
                                                <input className="form-input" type="number" min="1" step="1"
                                                    placeholder="Cantidad"
                                                    value={row.cantidad}
                                                    onChange={e => {
                                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                                        setConsumoDiarioRows(consumoDiarioRows.map((r, idx) =>
                                                            idx === i ? { ...r, cantidad: val } : r
                                                        ));
                                                    }}
                                                />
                                                <button type="button" className="remove-btn" onClick={() => {
                                                    if (consumoDiarioRows.length > 1) setConsumoDiarioRows(consumoDiarioRows.filter((_, j) => j !== i));
                                                }}>
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                    <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 8 }}
                                        onClick={() => setConsumoDiarioRows([...consumoDiarioRows, { material_id: '', cantidad: '' }])}>
                                        <Plus size={14} /> Agregar material
                                    </button>

                                    <div className="form-actions">
                                        <button type="button" className="btn btn-secondary" onClick={() => setShowAddConsumoDiario(false)}>Cancelar</button>
                                        <button type="submit" className="btn btn-success" disabled={isSubmitting}>
                                            {isSubmitting ? 'Registrando...' : 'Registrar Consumo'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div >
                )
                }

                {/* Modal: Pausar Proyecto */}
                {
                    showPausar && (
                        <div className="modal-overlay" onClick={() => setShowPausar(false)}>
                            <div className="modal" onClick={e => e.stopPropagation()}>
                                <div className="modal-header">
                                    <h3>Pausar Proyecto</h3>
                                    <button className="modal-close" onClick={() => setShowPausar(false)}><X size={18} /></button>
                                </div>
                                <div className="modal-body">
                                    <form onSubmit={handlePausar}>
                                        <div className="form-group">
                                            <label>Motivo de la pausa *</label>
                                            <textarea className="form-textarea" required value={motivoPausa}
                                                onChange={e => setMotivoPausa(e.target.value)}
                                                placeholder="Ej: Esperando materiales, condiciones climáticas, revisión de permisos..." />
                                        </div>
                                        <div className="form-actions">
                                            <button type="button" className="btn btn-secondary" onClick={() => setShowPausar(false)}>Cancelar</button>
                                            <button type="submit" className="btn" style={{ background: 'var(--accent-orange)', color: '#fff' }} disabled={isSubmitting}>
                                                <Pause size={14} /> {isSubmitting ? 'Procesando...' : 'Confirmar Pausa'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Modal: Cancelar Proyecto */}
                {
                    showCancelar && (
                        <div className="modal-overlay" onClick={() => setShowCancelar(false)}>
                            <div className="modal" onClick={e => e.stopPropagation()} style={{ borderTop: '4px solid var(--accent-red)' }}>
                                <div className="modal-header">
                                    <h3 style={{ color: 'var(--accent-red)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <AlertTriangle size={20} /> Cancelar Proyecto
                                    </h3>
                                    <button className="modal-close" onClick={() => setShowCancelar(false)}><X size={18} /></button>
                                </div>
                                <div className="modal-body">
                                    <div className="alert fade-in" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '16px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                        <AlertTriangle size={24} style={{ flexShrink: 0, marginTop: '2px' }} />
                                        <div>
                                            <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600 }}>Acción Peligrosa e Irreversible</h4>
                                            <p style={{ margin: 0, fontSize: '13px', opacity: 0.9 }}>
                                                Estás a punto de cancelar este proyecto. Ya no se podrán realizar más gastos, asignar personal, ni gestionar inventario. Esta acción no se puede deshacer.
                                            </p>
                                        </div>
                                    </div>
                                    <form onSubmit={handleCancelar}>
                                        <div className="form-group">
                                            <label>Motivo de la cancelación *</label>
                                            <textarea className="form-textarea" required value={motivoCancelar}
                                                onChange={e => setMotivoCancelar(e.target.value)}
                                                placeholder="Ej: Proyecto descartado por el cliente, falta de presupuesto, cambio de planes..." />
                                        </div>
                                        <div className="form-actions">
                                            <button type="button" className="btn btn-secondary" onClick={() => setShowCancelar(false)}>Atrás</button>
                                            <button type="submit" className="btn" style={{ background: 'var(--accent-red)', color: '#fff' }} disabled={isSubmitting}>
                                                <Trash2 size={14} /> {isSubmitting ? 'Procesando...' : 'Confirmar Cancelación'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Modal: Remover Brigada con Inventario */}
                {
                    showRemoveBrigadaModal && brigadaToRemove && (
                        <div className="modal-overlay" onClick={() => setShowRemoveBrigadaModal(false)}>
                            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                                <div className="modal-header">
                                    <h3>Retirar Brigada del Proyecto</h3>
                                    <button className="modal-close" onClick={() => setShowRemoveBrigadaModal(false)}><X size={18} /></button>
                                </div>
                                <div className="modal-body">
                                    <p style={{ marginBottom: 16 }}>
                                        La brigada <strong>{brigadas.find(b => b.id === brigadaToRemove.brigada_id)?.nombre}</strong> tiene materiales asignados en este proyecto. ¿Qué ciclo desea darles?
                                    </p>

                                    <form onSubmit={handleConfirmRemove}>
                                        <div className="form-group">
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 }}>
                                                <input
                                                    type="radio"
                                                    name="removeAction"
                                                    value="almacen"
                                                    checked={removeAction === 'almacen'}
                                                    onChange={() => setRemoveAction('almacen')}
                                                />
                                                Devolver materiales al almacén principal
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                                <input
                                                    type="radio"
                                                    name="removeAction"
                                                    value="transferir"
                                                    checked={removeAction === 'transferir'}
                                                    onChange={() => setRemoveAction('transferir')}
                                                    disabled={proyectoBrigadas.length <= 1}
                                                />
                                                Transferir a otra brigada en este proyecto
                                            </label>
                                        </div>

                                        {removeAction === 'transferir' && (
                                            <div className="form-group" style={{ marginTop: 12, paddingLeft: 24 }}>
                                                <label>Seleccione brigada destino:</label>
                                                <SearchableSelect
                                                    value={transferTarget}
                                                    onChange={val => setTransferTarget(val)}
                                                    placeholder="Seleccionar brigada..."
                                                    searchPlaceholder="Buscar brigada..."
                                                    required
                                                    options={proyectoBrigadas
                                                        .filter(pb => pb.brigada_id !== brigadaToRemove.brigada_id)
                                                        .map(pb => ({ value: pb.brigada_id, label: pb.brigadas?.nombre || '' }))
                                                    }
                                                />
                                            </div>
                                        )}

                                        <div className="form-group" style={{ marginTop: 16 }}>
                                            <label>Materiales a transferir / devolver:</label>
                                            <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 6, padding: 8 }}>
                                                {brigadaToRemove.inventory.map(item => (
                                                    <div key={item.material_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border-color)' }}>
                                                        <span>{item.nombre}</span>
                                                        <span style={{ fontWeight: 600 }}>{item.asignado - item.consumido}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="form-actions" style={{ marginTop: 24 }}>
                                            <button type="button" className="btn btn-secondary" onClick={() => setShowRemoveBrigadaModal(false)}>Cancelar</button>
                                            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                                                {isSubmitting ? 'Procesando...' : 'Confirmar y Desasignar'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Modal: Ver Recibo */}
                {
                    showReceiptModal && selectedReceipt && (
                        <div className="modal-overlay" onClick={() => setShowReceiptModal(false)}>
                            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                                <div className="modal-header">
                                    <h3>Recibo de Traspaso</h3>
                                    <button className="modal-close" onClick={() => setShowReceiptModal(false)}><X size={18} /></button>
                                </div>
                                <div className="modal-body">
                                    <div style={{ marginBottom: 16, border: '1px solid var(--border-color)', padding: 16, borderRadius: 8, background: 'var(--bg-secondary)' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, fontSize: 13 }}>
                                            <div><span style={{ color: 'var(--text-secondary)' }}>Fecha:</span> <br />{new Date(selectedReceipt.fecha).toLocaleString('es-ES')}</div>
                                            <div><span style={{ color: 'var(--text-secondary)' }}>Acción:</span> <br />{selectedReceipt.accion}</div>
                                            <div><span style={{ color: 'var(--text-secondary)' }}>Origen:</span> <br />{selectedReceipt.brigada_origen}</div>
                                            <div><span style={{ color: 'var(--text-secondary)' }}>Destino:</span> <br />{selectedReceipt.brigada_destino}</div>
                                        </div>
                                        <h4 style={{ marginBottom: 8, fontSize: 13, color: 'var(--text-secondary)' }}>Materiales Traspasados</h4>
                                        <table style={{ width: '100%', fontSize: 13 }}>
                                            <thead>
                                                <tr>
                                                    <th style={{ textAlign: 'left', paddingBottom: 8 }}>Material</th>
                                                    <th style={{ textAlign: 'right', paddingBottom: 8 }}>Cantidad</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedReceipt.materiales.map((m, i) => (
                                                    <tr key={i}>
                                                        <td style={{ padding: '4px 0', borderTop: '1px solid var(--border-color)' }}>{m.material}</td>
                                                        <td style={{ padding: '4px 0', borderTop: '1px solid var(--border-color)', textAlign: 'right', fontWeight: 600 }}>{m.cantidad}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="form-actions">
                                        <button className="btn btn-secondary" onClick={() => setShowReceiptModal(false)}>Cerrar</button>
                                        <button className="btn btn-primary" onClick={() => {
                                            const doc = new jsPDF();
                                            doc.setFontSize(16);
                                            doc.text('Recibo de Traspaso de Materiales', 14, 20);

                                            doc.setFontSize(10);
                                            doc.text(`Proyecto: ${selectedProyecto?.nombre || ''}`, 14, 30);
                                            doc.text(`Fecha: ${new Date(selectedReceipt.fecha).toLocaleString('es-ES')}`, 14, 36);
                                            doc.text(`Acción: ${selectedReceipt.accion}`, 14, 42);
                                            doc.text(`Origen: ${selectedReceipt.brigada_origen}`, 14, 48);
                                            doc.text(`Destino: ${selectedReceipt.brigada_destino}`, 14, 54);

                                            autoTable(doc, {
                                                startY: 62,
                                                head: [['Material', 'Cantidad']],
                                                body: selectedReceipt.materiales.map(m => [m.material, m.cantidad]),
                                                theme: 'grid',
                                                headStyles: { fillColor: [99, 102, 241] }
                                            });

                                            doc.save(`recibo_traspaso_${new Date().getTime()}.pdf`);
                                            toast('PDF exportado correctamente');
                                        }}>
                                            <Download size={16} style={{ marginRight: 6 }} /> Descargar PDF
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }
                {/* Modal: Editar Proyecto */}
                {
                    showEdit && (
                        <div className="modal-overlay" onClick={() => setShowEdit(false)}>
                            <div className="modal" onClick={e => e.stopPropagation()}>
                                <div className="modal-header">
                                    <h3>Editar Proyecto</h3>
                                    <button className="modal-close" onClick={() => setShowEdit(false)}><X size={18} /></button>
                                </div>
                                <div className="modal-body">
                                    <form onSubmit={handleEdit}>
                                        <div className="form-group">
                                            <label>Nombre del proyecto *</label>
                                            <input className="form-input" required value={editForm.nombre}
                                                onChange={e => setEditForm({ ...editForm, nombre: e.target.value })}
                                                placeholder="Ej: Tendido Fibra Óptica Sector Norte" />
                                        </div>
                                        <div className="form-group">
                                            <label>Descripción</label>
                                            <textarea className="form-textarea" value={editForm.descripcion}
                                                onChange={e => setEditForm({ ...editForm, descripcion: e.target.value })}
                                                placeholder="Descripción del proyecto..." />
                                        </div>
                                        <div className="form-group">
                                            <label>Ubicación</label>
                                            <input className="form-input" value={editForm.ubicacion}
                                                onChange={e => setEditForm({ ...editForm, ubicacion: e.target.value })}
                                                placeholder="Ej: Zona Industrial, Calle Principal" />
                                        </div>
                                        <div className="form-row">
                                            <div className="form-group">
                                                <label>Fecha inicio</label>
                                                <input className="form-input" type="date" value={editForm.fecha_inicio}
                                                    onChange={e => setEditForm({ ...editForm, fecha_inicio: e.target.value })} />
                                            </div>
                                            <div className="form-group">
                                                <label>Fecha fin</label>
                                                <input className="form-input" type="date" value={editForm.fecha_fin}
                                                    onChange={e => setEditForm({ ...editForm, fecha_fin: e.target.value })} />
                                            </div>
                                        </div>
                                        <div className="form-actions">
                                            <button type="button" className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancelar</button>
                                            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                                                {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    )
                }
            </div >
        );
    }

    // PROJECT LIST VIEW
    const filteredProjects = proyectos.filter(p =>
        p.nombre.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div>
            <div className="page-header">
                <div>
                    <h2>Proyectos</h2>
                    <p className="page-header-subtitle">Gestión de proyectos y consumo de materiales</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
                    <Plus size={16} /> Nuevo Proyecto
                </button>
            </div>

            <div className="search-bar">
                <Search />
                <input type="text" placeholder="Buscar proyecto..." value={search}
                    onChange={e => setSearch(e.target.value)} />
            </div>

            <div className="card-grid">
                {filteredProjects.length > 0 ? filteredProjects.map((p, i) => (
                    <div key={p.id} className="proyecto-card" style={{ animationDelay: `${i * 0.06}s` }} onClick={() => loadProyectoDetail(p)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <h4 style={{ color: 'var(--text-primary)' }}>{p.nombre}</h4>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                {isRetrasado(p) && (
                                    <span className="badge badge-orange" style={{ animation: 'none' }}>
                                        ⚠ Retrasado
                                    </span>
                                )}
                                <span className={`badge ${estadoColor[p.estado]}`}>
                                    <span className={`status-dot ${estadoDot[p.estado]}`} />{p.estado}
                                </span>
                            </div>
                        </div>
                        {p.descripcion && <p>{p.descripcion}</p>}
                        <div className="proyecto-card-meta">
                            {p.ubicacion && <span>
                                <MapPin size={12} /> {p.ubicacion}
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.ubicacion)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    style={{ marginLeft: 6, color: 'var(--accent-blue)', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                                    title="Ver en Google Maps"
                                >
                                    <ExternalLink size={11} />
                                </a>
                            </span>}
                            {p.fecha_inicio && <span><Calendar size={12} /> {p.fecha_inicio}</span>}
                        </div>
                    </div>
                )) : (
                    <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                        <FolderKanban size={40} />
                        <h4>No hay proyectos</h4>
                        <p>Crea tu primer proyecto para comenzar a gestionar materiales.</p>
                    </div>
                )}
            </div>

            {/* Modal: Crear Proyecto */}
            {showCreate && (
                <div className="modal-overlay" onClick={() => setShowCreate(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Nuevo Proyecto</h3>
                            <button className="modal-close" onClick={() => setShowCreate(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleCreate}>
                                <div className="form-group">
                                    <label>Nombre del proyecto *</label>
                                    <input className="form-input" required value={createForm.nombre}
                                        onChange={e => setCreateForm({ ...createForm, nombre: e.target.value })}
                                        placeholder="Ej: Tendido Fibra Óptica Sector Norte" />
                                </div>
                                <div className="form-group">
                                    <label>Descripción</label>
                                    <textarea className="form-textarea" value={createForm.descripcion}
                                        onChange={e => setCreateForm({ ...createForm, descripcion: e.target.value })}
                                        placeholder="Descripción del proyecto..." />
                                </div>
                                <div className="form-group">
                                    <label>Ubicación</label>
                                    <input className="form-input" value={createForm.ubicacion}
                                        onChange={e => setCreateForm({ ...createForm, ubicacion: e.target.value })}
                                        placeholder="Ej: Zona Industrial, Calle Principal" />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Fecha inicio</label>
                                        <input className="form-input" type="date" value={createForm.fecha_inicio}
                                            onChange={e => setCreateForm({ ...createForm, fecha_inicio: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Fecha fin</label>
                                        <input className="form-input" type="date" value={createForm.fecha_fin}
                                            onChange={e => setCreateForm({ ...createForm, fecha_fin: e.target.value })} />
                                    </div>
                                </div>
                                <div className="form-actions">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancelar</button>
                                    <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                                        {isSubmitting ? 'Guardando...' : 'Crear Proyecto'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Modals removidos del render de Lista de Proyectos */}
        </div>
    );
}

