import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRealtime } from '../lib/useRealtime';
import { useToast } from '../components/Toast';
import {
    Users, Plus, X, ArrowLeft, Search, UserPlus, UserMinus, History, Shield, Trash2, Edit2, Star, Calendar, Download, MoreVertical
} from 'lucide-react';
import CountUp from '../components/CountUp';
import AnimatedCheckbox from '../components/AnimatedCheckbox';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Brigadas() {
    const toast = useToast();
    const [brigadas, setBrigadas] = useState([]);
    const [personal, setPersonal] = useState([]);
    const [brigadaMembers, setBrigadaMembers] = useState({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showCreateBrigada, setShowCreateBrigada] = useState(false);
    const [showCreatePersonal, setShowCreatePersonal] = useState(false);
    const [selectedBrigada, setSelectedBrigada] = useState(null);
    const [brigadaPersonal, setBrigadaPersonal] = useState([]);
    const [historial, setHistorial] = useState([]);
    const [activeTab, setActiveTab] = useState('miembros');
    const [showAsignarPersonal, setShowAsignarPersonal] = useState(false);
    const [showRemovePersonal, setShowRemovePersonal] = useState(null);
    const [showEditPersonal, setShowEditPersonal] = useState(null);
    const [showActionsDropdown, setShowActionsDropdown] = useState(false);

    // Asistencia states
    const [asistenciaDate, setAsistenciaDate] = useState(new Date().toISOString().split('T')[0]);
    const [asistenciaRecords, setAsistenciaRecords] = useState([]);
    const [asistenciaHistory, setAsistenciaHistory] = useState([]);
    const [isSavingAsistencia, setIsSavingAsistencia] = useState(false);

    // Payroll Date Filters
    const [filterAsistenciaDesde, setFilterAsistenciaDesde] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return d.toISOString().split('T')[0];
    });
    const [filterAsistenciaHasta, setFilterAsistenciaHasta] = useState(new Date().toISOString().split('T')[0]);

    // Forms
    const [brigForm, setBrigForm] = useState({ nombre: '', descripcion: '' });
    const [persForm, setPersForm] = useState({ nombre: '', cedula: '', cargo: '', telefono: '' });
    const [editPersForm, setEditPersForm] = useState({ nombre: '', cedula: '', cargo: '', telefono: '' });
    const [asignarPersonalId, setAsignarPersonalId] = useState('');
    const [motivoSalida, setMotivoSalida] = useState('');

    useEffect(() => { loadData(); }, []);

    useRealtime(
        ['brigadas', 'personal', 'brigada_personal'],
        loadData,
        'brigadas-realtime'
    );

    async function loadData() {
        setLoading(true);
        const [brigRes, persRes, membersRes] = await Promise.all([
            supabase.from('brigadas').select('*').order('nombre'),
            supabase.from('personal').select('*').order('nombre'),
            supabase.from('brigada_personal')
                .select('brigada_id, es_lider, personal(nombre, cargo)')
                .eq('activo', true)
                .order('es_lider', { ascending: false })
        ]);
        setBrigadas(brigRes.data || []);
        setPersonal(persRes.data || []);
        // Group members by brigade
        const grouped = {};
        (membersRes.data || []).forEach(m => {
            if (!grouped[m.brigada_id]) grouped[m.brigada_id] = [];
            grouped[m.brigada_id].push({ ...m.personal, es_lider: m.es_lider });
        });
        setBrigadaMembers(grouped);
        setLoading(false);
    }

    async function handleDeleteBrigada(brigada) {
        if (!confirm(`¿Estás seguro de eliminar la brigada "${brigada.nombre}"? Se eliminará todo el personal asignado.`)) return;
        // Remove all personnel assignments first
        await supabase.from('brigada_personal').delete().eq('brigada_id', brigada.id);
        // Remove brigade from projects
        await supabase.from('proyecto_brigada').delete().eq('brigada_id', brigada.id);
        // Delete the brigade
        const { error } = await supabase.from('brigadas').delete().eq('id', brigada.id);
        if (error) { toast(error.message, 'error'); return; }
        toast('Brigada eliminada correctamente');
        setSelectedBrigada(null);
        loadData();
    }

    async function loadBrigadaDetail(brigada) {
        setSelectedBrigada(brigada);
        setActiveTab('miembros');
        const [memberRes, histRes] = await Promise.all([
            supabase.from('brigada_personal')
                .select('*, personal(nombre, cedula, cargo, telefono)')
                .eq('brigada_id', brigada.id)
                .eq('activo', true)
                .order('es_lider', { ascending: false })
                .order('fecha_ingreso', { ascending: false }),
            supabase.from('brigada_personal')
                .select('*, personal(nombre, cedula, cargo), brigadas(nombre)')
                .eq('brigada_id', brigada.id)
                .order('created_at', { ascending: false })
        ]);
        setBrigadaPersonal(memberRes.data || []);
        setHistorial(histRes.data || []);
    }

    useEffect(() => {
        if (selectedBrigada && activeTab === 'asistencia') {
            loadAsistencia(selectedBrigada.id, asistenciaDate);
            loadAsistenciaHistory(selectedBrigada.id, filterAsistenciaDesde, filterAsistenciaHasta);
        }
    }, [selectedBrigada, activeTab, asistenciaDate, brigadaPersonal, filterAsistenciaDesde, filterAsistenciaHasta]);

    async function loadAsistencia(brigadaId, date) {
        const { data } = await supabase.from('brigada_asistencia')
            .select('*')
            .eq('brigada_id', brigadaId)
            .eq('fecha', date);

        const records = brigadaPersonal.map(bp => {
            const saved = data?.find(d => d.personal_id === bp.personal_id);
            return {
                personal_id: bp.personal_id,
                nombre: bp.personal.personal?.nombre || bp.personal?.nombre, // handle mapping structures safely
                cargo: bp.personal.personal?.cargo || bp.personal?.cargo,
                asistio: saved ? saved.asistio : false
            };
        });
        setAsistenciaRecords(records);
    }

    async function loadAsistenciaHistory(brigadaId, desde, hasta) {
        if (!desde || !hasta) return;

        // Cargar todo el historial del periodo
        const { data } = await supabase.from('brigada_asistencia')
            .select('fecha, asistio, personal_id, personal(nombre, cargo)')
            .eq('brigada_id', brigadaId)
            .gte('fecha', desde)
            .lte('fecha', hasta)
            .order('fecha', { ascending: true });

        if (!data) return;

        // Group by personal
        const summary = data.reduce((acc, curr) => {
            const pId = curr.personal_id;
            if (!acc[pId]) {
                acc[pId] = {
                    nombre: curr.personal?.nombre || 'Desconocido',
                    cargo: curr.personal?.cargo || 'Sin Cargo',
                    asistencias: 0,
                    ausencias: 0,
                    total: 0,
                    fechasAsistidas: [],
                    fechasAusentes: []
                };
            }

            // Format fecha from YYYY-MM-DD to DD/MM
            const parts = curr.fecha.split('-');
            const formatDia = `${parts[2]}/${parts[1]}`;

            acc[pId].total += 1;
            if (curr.asistio) {
                acc[pId].asistencias += 1;
                acc[pId].fechasAsistidas.push(formatDia);
            } else {
                acc[pId].ausencias += 1;
                acc[pId].fechasAusentes.push(formatDia);
            }
            return acc;
        }, {});

        const historyList = Object.values(summary).sort((a, b) => a.nombre.localeCompare(b.nombre));
        setAsistenciaHistory(historyList);
    }

    async function handleSaveAsistencia() {
        if (!selectedBrigada) return;
        setIsSavingAsistencia(true);
        try {
            const upserts = asistenciaRecords.map(r => ({
                brigada_id: selectedBrigada.id,
                personal_id: r.personal_id,
                fecha: asistenciaDate,
                asistio: r.asistio
            }));

            const { error } = await supabase.from('brigada_asistencia').upsert(upserts, { onConflict: 'brigada_id,personal_id,fecha' });
            if (error) { toast(error.message, 'error'); return; }
            toast('Asistencia guardada correctamente');
            loadAsistenciaHistory(selectedBrigada.id, filterAsistenciaDesde, filterAsistenciaHasta);
        } finally {
            setIsSavingAsistencia(false);
        }
    }

    function exportAsistenciaToPDF() {
        if (!selectedBrigada) return;
        const doc = new jsPDF();
        const blue = [33, 63, 115];

        doc.setFontSize(20);
        doc.setTextColor(...blue);
        doc.text(`Reporte de Nómina / Asistencia`, 14, 22);

        doc.setFontSize(12);
        doc.setTextColor(60, 60, 60);
        doc.text(`Brigada: ${selectedBrigada.nombre}`, 14, 30);
        doc.text(`Desde: ${filterAsistenciaDesde.split('-').reverse().join('/')}  -  Hasta: ${filterAsistenciaHasta.split('-').reverse().join('/')}`, 14, 38);

        const tableData = asistenciaHistory.map(h => {
            const diasAsistidos = h.asistencias > 0 ? `${h.asistencias} días\n(${h.fechasAsistidas.join(', ')})` : '0 días';
            const diasAusentes = h.ausencias > 0 ? `${h.ausencias} días\n(${h.fechasAusentes.join(', ')})` : '0 días';

            return [
                h.nombre,
                h.cargo,
                diasAsistidos,
                diasAusentes,
                `${Math.round((h.asistencias / h.total) * 100)}%`
            ];
        });

        autoTable(doc, {
            startY: 46,
            head: [['Personal', 'Cargo', 'Días Asistidos', 'Días Ausentes', 'Asistencia']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: blue, textColor: [255, 255, 255] },
            styles: { cellPadding: 4, valign: 'middle' },
            columnStyles: {
                0: { cellWidth: 35 },
                1: { cellWidth: 30 },
                2: { cellWidth: 50 },
                3: { cellWidth: 50 },
                4: { cellWidth: 20, halign: 'center' }
            }
        });

        doc.save(`Nomina_${selectedBrigada.nombre.replace(/\s+/g, '_')}_${filterAsistenciaDesde}_al_${filterAsistenciaHasta}.pdf`);
    }

    async function handleCreateBrigada(e) {
        e.preventDefault();
        const { error } = await supabase.from('brigadas').insert(brigForm);
        if (error) { toast(error.message, 'error'); return; }
        toast('Brigada creada correctamente');
        setBrigForm({ nombre: '', descripcion: '' });
        setShowCreateBrigada(false);
        loadData();
    }

    async function handleCreatePersonal(e) {
        e.preventDefault();
        const { error } = await supabase.from('personal').insert(persForm);
        if (error) { toast(error.message, 'error'); return; }
        toast('Personal registrado correctamente');
        setPersForm({ nombre: '', cedula: '', cargo: '', telefono: '' });
        setShowCreatePersonal(false);
        loadData();
    }

    async function handleAsignarPersonal(e) {
        e.preventDefault();
        if (!asignarPersonalId) return;
        // Check if already in this brigade
        const exists = brigadaPersonal.find(bp => bp.personal_id === asignarPersonalId);
        if (exists) { toast('Esta persona ya está en la brigada', 'error'); return; }

        // Check if person is active in another brigade
        const { data: activeBp } = await supabase.from('brigada_personal')
            .select('*, brigadas(nombre)')
            .eq('personal_id', asignarPersonalId)
            .eq('activo', true)
            .limit(1);
        if (activeBp && activeBp.length > 0) {
            const brigadaNombre = activeBp[0].brigadas?.nombre || 'otra brigada';
            toast(`Esta persona ya está asignada a "${brigadaNombre}". Debe removerla primero antes de reasignarla.`, 'error');
            return;
        }

        // Assign to this brigade
        const { error } = await supabase.from('brigada_personal').insert({
            brigada_id: selectedBrigada.id,
            personal_id: asignarPersonalId
        });
        if (error) { toast(error.message, 'error'); return; }
        toast('Personal asignado a la brigada');
        setAsignarPersonalId('');
        setShowAsignarPersonal(false);
        loadBrigadaDetail(selectedBrigada);
    }

    async function handleRemovePersonal(bpId) {
        await supabase.from('brigada_personal')
            .update({
                activo: false,
                fecha_salida: new Date().toISOString().split('T')[0],
                motivo_cambio: motivoSalida || 'Removido de la brigada'
            })
            .eq('id', bpId);
        toast('Personal removido de la brigada');
        setShowRemovePersonal(null);
        setMotivoSalida('');
        loadBrigadaDetail(selectedBrigada);
    }


    async function handleEditPersonalDetails(e) {
        e.preventDefault();
        const { error } = await supabase.from('personal').update(editPersForm).eq('id', showEditPersonal);
        if (error) { toast(error.message, 'error'); return; }
        toast('Personal actualizado correctamente');
        setShowEditPersonal(null);
        loadData();
        if (selectedBrigada) {
            loadBrigadaDetail(selectedBrigada);
        }
    }

    async function handleSetLider(bpId, brigadaId) {
        // First remove lider status from everyone in this brigade
        await supabase.from('brigada_personal')
            .update({ es_lider: false })
            .eq('brigada_id', brigadaId)
            .eq('activo', true);

        // Then set the new leader
        const { error } = await supabase.from('brigada_personal')
            .update({ es_lider: true })
            .eq('id', bpId);

        if (error) { toast(error.message, 'error'); return; }
        toast('Líder de brigada actualizado');
        loadBrigadaDetail(selectedBrigada);
    }

    if (loading) return <div className="loading-spinner" />;

    // DETAIL VIEW
    if (selectedBrigada) {
        const availablePersonal = personal.filter(p =>
            !brigadaPersonal.find(bp => bp.personal_id === p.id)
        );

        return (
            <div>
                <div className="detail-header">
                    <button className="detail-back-btn" onClick={() => setSelectedBrigada(null)}>
                        <ArrowLeft size={18} />
                    </button>
                    <div style={{ flex: 1 }}>
                        <h2>{selectedBrigada.nombre}</h2>
                        <p className="page-header-subtitle">
                            {selectedBrigada.descripcion || 'Sin descripción'}
                            {' · '}
                            <span className={`badge ${selectedBrigada.activa ? 'badge-green' : 'badge-red'}`}>
                                {selectedBrigada.activa ? 'Activa' : 'Inactiva'}
                            </span>
                        </p>
                    </div>
                    <div className="btn-group" style={{ position: 'relative' }}>
                        <button className="btn btn-secondary btn-sm" style={{ padding: '8px' }} onClick={() => setShowActionsDropdown(!showActionsDropdown)}>
                            <MoreVertical size={18} />
                        </button>

                        {showActionsDropdown && (
                            <>
                                <div className="animated-dropdown-backdrop" onClick={() => setShowActionsDropdown(false)} />
                                <div className="animated-dropdown" style={{ top: 'calc(100% + 8px)' }}>
                                    <div className="animated-dropdown-label">Acciones</div>
                                    <div className="animated-dropdown-separator" />
                                    
                                    <button 
                                        className="animated-dropdown-item item-complete"
                                        onClick={() => {
                                            setShowActionsDropdown(false);
                                            setShowCreatePersonal(true);
                                        }}
                                    >
                                        <UserPlus size={16} /> Registrar Personal
                                    </button>
                                    
                                    <button 
                                        className="animated-dropdown-item item-complete"
                                        onClick={() => {
                                            setShowActionsDropdown(false);
                                            setShowAsignarPersonal(true);
                                        }}
                                    >
                                        <Plus size={16} /> Asignar Personal
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
                                            handleDeleteBrigada(selectedBrigada);
                                        }}
                                    >
                                        <Trash2 size={16} /> Eliminar Brigada
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="card-grid">
                    <div className="stat-card">
                        <div className="stat-icon green"><Users size={20} /></div>
                        <div className="stat-info">
                            <h4><CountUp from={0} to={brigadaPersonal.length} duration={1} /></h4>
                            <p>Miembros actuales</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon purple"><History size={20} /></div>
                        <div className="stat-info">
                            <h4><CountUp from={0} to={historial.length} duration={1} /></h4>
                            <p>Movimientos total</p>
                        </div>
                    </div>
                </div>

                <div className="tabs" style={{ marginTop: 16 }}>
                    <button className={`tab ${activeTab === 'miembros' ? 'active' : ''}`} onClick={() => setActiveTab('miembros')}>
                        Miembros Actuales
                    </button>
                    <button className={`tab ${activeTab === 'historial' ? 'active' : ''}`} onClick={() => setActiveTab('historial')}>
                        Historial de Movimientos
                    </button>
                    <button className={`tab ${activeTab === 'asistencia' ? 'active' : ''}`} onClick={() => setActiveTab('asistencia')}>
                        Asistencia
                    </button>
                </div>

                {activeTab === 'miembros' && (
                    <div>
                        {brigadaPersonal.length > 0 ? (
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Nombre</th>
                                            <th>Cédula</th>
                                            <th>Cargo</th>
                                            <th>Teléfono</th>
                                            <th>Fecha Ingreso</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {brigadaPersonal.map(bp => (
                                            <tr key={bp.id}>
                                                <td style={{ fontWeight: bp.es_lider ? 700 : 500, color: bp.es_lider ? 'var(--accent-orange)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    {bp.es_lider && <Star size={14} fill="currentColor" />}
                                                    <span style={bp.es_lider ? { textShadow: '0 0 8px rgba(249, 115, 22, 0.4)' } : {}}>
                                                        {bp.personal?.nombre || '—'}
                                                    </span>
                                                </td>
                                                <td style={{ fontFamily: 'monospace' }}>{bp.personal?.cedula || '—'}</td>
                                                <td>{bp.personal?.cargo || '—'}</td>
                                                <td>{bp.personal?.telefono || '—'}</td>
                                                <td>{bp.fecha_ingreso}</td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        {!bp.es_lider && (
                                                            <button className="btn btn-sm" style={{ padding: '4px 8px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }} onClick={() => handleSetLider(bp.id, bp.brigada_id)} title="Designar como Líder">
                                                                <Star size={14} />
                                                            </button>
                                                        )}
                                                        <button className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }} onClick={() => {
                                                            setEditPersForm({
                                                                nombre: bp.personal?.nombre || '',
                                                                cedula: bp.personal?.cedula || '',
                                                                cargo: bp.personal?.cargo || '',
                                                                telefono: bp.personal?.telefono || ''
                                                            });
                                                            setShowEditPersonal(bp.personal_id);
                                                        }} title="Editar">
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button className="btn btn-danger btn-sm" style={{ padding: '4px 8px' }} onClick={() => setShowRemovePersonal(bp.id)} title="Remover">
                                                            <UserMinus size={14} />
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
                                <Users size={40} />
                                <h4>Sin miembros asignados</h4>
                                <p>Asigna personal técnico a esta brigada.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'asistencia' && (
                    <div>
                        <div className="filter-bar" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                <div className="search-box" style={{ width: 'auto' }}>
                                    <Calendar className="search-icon" size={18} />
                                    <input
                                        type="date"
                                        className="search-input"
                                        value={asistenciaDate}
                                        onChange={e => setAsistenciaDate(e.target.value)}
                                    />
                                </div>
                                <span style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500 }}>
                                    Seleccionar fecha de pase de lista
                                </span>
                            </div>
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={handleSaveAsistencia}
                                disabled={isSavingAsistencia || asistenciaRecords.length === 0}
                            >
                                {isSavingAsistencia ? 'Guardando...' : 'Guardar Asistencia'}
                            </button>
                        </div>

                        {asistenciaRecords.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                                {asistenciaRecords.map((record, i) => (
                                    <div
                                        key={record.personal_id}
                                        onClick={() => {
                                            const copy = [...asistenciaRecords];
                                            copy[i].asistio = !copy[i].asistio;
                                            setAsistenciaRecords(copy);
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '16px',
                                            backgroundColor: record.asistio ? 'var(--accent-primary-bg)' : 'var(--bg-card)',
                                            border: `1px solid ${record.asistio ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                                            borderRadius: 'var(--radius-md)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            boxShadow: record.asistio ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'
                                        }}
                                    >
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <span style={{ 
                                                fontWeight: 600, 
                                                color: record.asistio ? 'var(--accent-primary)' : 'var(--text-primary)',
                                                transition: 'color 0.2s ease',
                                                fontSize: '14px'
                                            }}>
                                                {record.nombre}
                                            </span>
                                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                                {record.cargo || '—'}
                                            </span>
                                        </div>
                                        <div style={{ pointerEvents: 'none' }}>
                                            <AnimatedCheckbox
                                                checked={record.asistio}
                                                onChange={() => {}}
                                                size={22}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <Users size={32} />
                                <h4>No hay personal en la brigada</h4>
                                <p>Asigne personal para poder registrar asistencia.</p>
                            </div>
                        )}

                        <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 40, flexWrap: 'wrap', gap: 16 }}>
                            <h3>Reporte de Nómina</h3>

                            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Desde:</span>
                                    <input
                                        type="date"
                                        className="search-input"
                                        style={{ padding: '6px 12px' }}
                                        value={filterAsistenciaDesde}
                                        onChange={e => setFilterAsistenciaDesde(e.target.value)}
                                    />
                                    <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginLeft: 8 }}>Hasta:</span>
                                    <input
                                        type="date"
                                        className="search-input"
                                        style={{ padding: '6px 12px' }}
                                        value={filterAsistenciaHasta}
                                        onChange={e => setFilterAsistenciaHasta(e.target.value)}
                                    />
                                </div>

                                <button className="btn btn-secondary btn-sm" onClick={exportAsistenciaToPDF} disabled={asistenciaHistory.length === 0}>
                                    <Download size={16} /> Exportar Nómina (PDF)
                                </button>
                            </div>
                        </div>

                        {asistenciaHistory.length > 0 ? (
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Personal</th>
                                            <th>Cargo</th>
                                            <th style={{ textAlign: 'center' }}>Días Asistidos</th>
                                            <th style={{ textAlign: 'center' }}>Días de Ausencia</th>
                                            <th style={{ textAlign: 'center' }}>Asistencia Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {asistenciaHistory.map((h, i) => (
                                            <tr key={i}>
                                                <td style={{ fontWeight: 500, color: 'var(--text-primary)', verticalAlign: 'top' }}>{h.nombre}</td>
                                                <td style={{ verticalAlign: 'top' }}>{h.cargo}</td>
                                                <td style={{ verticalAlign: 'top' }}>
                                                    <div style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--accent-green)', marginBottom: 6 }}>
                                                        {h.asistencias} días
                                                    </div>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
                                                        {h.fechasAsistidas.map((f, idx) => (
                                                            <span key={idx} style={{ fontSize: 11, padding: '2px 6px', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--accent-green)', borderRadius: 12, border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                                                                {f}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td style={{ verticalAlign: 'top' }}>
                                                    <div style={{ textAlign: 'center', fontWeight: 'bold', color: h.ausencias > 0 ? 'var(--accent-red)' : 'var(--text-secondary)', marginBottom: 6 }}>
                                                        {h.ausencias} días
                                                    </div>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
                                                        {h.fechasAusentes.map((f, idx) => (
                                                            <span key={idx} style={{ fontSize: 11, padding: '2px 6px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)', borderRadius: 12, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                                                {f}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td style={{ textAlign: 'center', color: (h.asistencias / h.total) >= 0.8 ? 'var(--accent-green)' : ((h.asistencias / h.total) >= 0.5 ? 'var(--accent-orange)' : 'var(--accent-red)'), fontWeight: 'bold', verticalAlign: 'middle', fontSize: 16 }}>
                                                    {Math.round((h.asistencias / h.total) * 100)}%
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="empty-state" style={{ padding: '24px 0' }}>
                                <History size={24} />
                                <h4>No hay registros en estas fechas</h4>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'historial' && (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Personal</th>
                                    <th>Cédula</th>
                                    <th>Cargo</th>
                                    <th>Fecha Ingreso</th>
                                    <th>Fecha Salida</th>
                                    <th>Estado</th>
                                    <th>Motivo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {historial.length > 0 ? historial.map(h => (
                                    <tr key={h.id}>
                                        <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{h.personal?.nombre || '—'}</td>
                                        <td style={{ fontFamily: 'monospace' }}>{h.personal?.cedula || '—'}</td>
                                        <td>{h.personal?.cargo || '—'}</td>
                                        <td>{h.fecha_ingreso}</td>
                                        <td>{h.fecha_salida || '—'}</td>
                                        <td>
                                            {h.activo ?
                                                <span className="badge badge-green">Activo</span> :
                                                <span className="badge badge-red">Inactivo</span>
                                            }
                                        </td>
                                        <td>{h.motivo_cambio || '—'}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="7">
                                        <div className="empty-state">
                                            <History size={32} />
                                            <h4>Sin historial</h4>
                                        </div>
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Modal: Asignar Personal */}
                {showAsignarPersonal && (
                    <div className="modal-overlay" onClick={() => setShowAsignarPersonal(false)}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Asignar Personal a la Brigada</h3>
                                <button className="modal-close" onClick={() => setShowAsignarPersonal(false)}><X size={18} /></button>
                            </div>
                            <div className="modal-body">
                                <form onSubmit={handleAsignarPersonal}>
                                    <div className="form-group">
                                        <label>Seleccionar Personal</label>
                                        <select className="form-select" required value={asignarPersonalId}
                                            onChange={e => setAsignarPersonalId(e.target.value)}>
                                            <option value="">Seleccionar...</option>
                                            {availablePersonal.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.nombre} {p.cedula ? `(${p.cedula})` : ''} {p.cargo ? `— ${p.cargo}` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {availablePersonal.length === 0 && (
                                        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
                                            Todo el personal ya está asignado. Registre nuevo personal primero.
                                        </p>
                                    )}
                                    <div className="form-actions">
                                        <button type="button" className="btn btn-secondary" onClick={() => setShowAsignarPersonal(false)}>Cancelar</button>
                                        <button type="submit" className="btn btn-primary" disabled={availablePersonal.length === 0}>Asignar</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal: Remover Personal */}
                {showRemovePersonal && (
                    <div className="modal-overlay" onClick={() => { setShowRemovePersonal(null); setMotivoSalida(''); }}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Remover Personal de la Brigada</h3>
                                <button className="modal-close" onClick={() => { setShowRemovePersonal(null); setMotivoSalida(''); }}><X size={18} /></button>
                            </div>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label>Motivo de salida</label>
                                    <textarea className="form-textarea" value={motivoSalida}
                                        onChange={e => setMotivoSalida(e.target.value)}
                                        placeholder="Ej: Transferido a otra brigada, vacaciones, renuncia..." />
                                </div>
                                <div className="form-actions">
                                    <button className="btn btn-secondary" onClick={() => { setShowRemovePersonal(null); setMotivoSalida(''); }}>Cancelar</button>
                                    <button className="btn btn-danger" onClick={() => handleRemovePersonal(showRemovePersonal)}>
                                        Confirmar Remoción
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal: Editar Personal */}
                {showEditPersonal && (
                    <div className="modal-overlay" onClick={() => setShowEditPersonal(null)}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Editar Personal</h3>
                                <button className="modal-close" onClick={() => setShowEditPersonal(null)}><X size={18} /></button>
                            </div>
                            <div className="modal-body">
                                <form onSubmit={handleEditPersonalDetails}>
                                    <div className="form-group">
                                        <label>Nombre completo *</label>
                                        <input className="form-input" required value={editPersForm.nombre}
                                            onChange={e => setEditPersForm({ ...editPersForm, nombre: e.target.value })} />
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Cédula</label>
                                            <input className="form-input" value={editPersForm.cedula}
                                                onChange={e => setEditPersForm({ ...editPersForm, cedula: e.target.value })} />
                                        </div>
                                        <div className="form-group">
                                            <label>Cargo</label>
                                            <input className="form-input" value={editPersForm.cargo}
                                                onChange={e => setEditPersForm({ ...editPersForm, cargo: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Teléfono</label>
                                        <input className="form-input" value={editPersForm.telefono}
                                            onChange={e => setEditPersForm({ ...editPersForm, telefono: e.target.value })} />
                                    </div>
                                    <div className="form-actions">
                                        <button type="button" className="btn btn-secondary" onClick={() => setShowEditPersonal(null)}>Cancelar</button>
                                        <button type="submit" className="btn btn-primary">Guardar Cambios</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal: Crear Personal (from detail view) */}
                {showCreatePersonal && (
                    <div className="modal-overlay" onClick={() => setShowCreatePersonal(false)}>
                        <div className="modal" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Registrar Personal Técnico</h3>
                                <button className="modal-close" onClick={() => setShowCreatePersonal(false)}><X size={18} /></button>
                            </div>
                            <div className="modal-body">
                                <form onSubmit={handleCreatePersonal}>
                                    <div className="form-group">
                                        <label>Nombre completo *</label>
                                        <input className="form-input" required value={persForm.nombre}
                                            onChange={e => setPersForm({ ...persForm, nombre: e.target.value })}
                                            placeholder="Nombre y apellido" />
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Cédula</label>
                                            <input className="form-input" value={persForm.cedula}
                                                onChange={e => setPersForm({ ...persForm, cedula: e.target.value })}
                                                placeholder="Número de cédula" />
                                        </div>
                                        <div className="form-group">
                                            <label>Cargo</label>
                                            <input className="form-input" value={persForm.cargo}
                                                onChange={e => setPersForm({ ...persForm, cargo: e.target.value })}
                                                placeholder="Ej: Técnico electricista" />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Teléfono</label>
                                        <input className="form-input" value={persForm.telefono}
                                            onChange={e => setPersForm({ ...persForm, telefono: e.target.value })}
                                            placeholder="Número de contacto" />
                                    </div>
                                    <div className="form-actions">
                                        <button type="button" className="btn btn-secondary" onClick={() => setShowCreatePersonal(false)}>Cancelar</button>
                                        <button type="submit" className="btn btn-primary">Registrar</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // BRIGADE LIST VIEW
    const filteredBrigadas = brigadas.filter(b =>
        b.nombre.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div>
            <div className="page-header">
                <div>
                    <h2>Brigadas</h2>
                    <p className="page-header-subtitle">Gestión de brigadas y personal técnico</p>
                </div>
                <div className="btn-group">
                    <button className="btn btn-secondary" onClick={() => setShowCreatePersonal(true)}>
                        <UserPlus size={16} /> Registrar Personal
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowCreateBrigada(true)}>
                        <Plus size={16} /> Nueva Brigada
                    </button>
                </div>
            </div>

            <div className="search-bar">
                <Search />
                <input type="text" placeholder="Buscar brigada..." value={search}
                    onChange={e => setSearch(e.target.value)} />
            </div>

            <div className="card-grid">
                {filteredBrigadas.length > 0 ? filteredBrigadas.map((b, i) => (
                    <div key={b.id} className="proyecto-card" style={{ animationDelay: `${i * 0.06}s` }} onClick={() => loadBrigadaDetail(b)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <h4 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Shield size={16} style={{ color: 'var(--accent-cyan)' }} />
                                {b.nombre}
                                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>
                                    ({brigadaMembers[b.id]?.length || 0} personas)
                                </span>
                            </h4>
                            <span className={`badge ${b.activa ? 'badge-green' : 'badge-red'}`}>
                                <span className={`status-dot ${b.activa ? 'active' : 'inactive'}`} />
                                {b.activa ? 'Activa' : 'Inactiva'}
                            </span>
                        </div>
                        {b.descripcion && <p style={{ marginTop: 8 }}>{b.descripcion}</p>}
                        {brigadaMembers[b.id] && brigadaMembers[b.id].length > 0 ? (
                            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {brigadaMembers[b.id].map((p, i) => (
                                    <span key={i} style={{
                                        fontSize: 11, padding: '3px 10px', borderRadius: 100,
                                        background: p.es_lider ? 'rgba(249, 115, 22, 0.15)' : 'var(--accent-blue-glow)',
                                        color: p.es_lider ? 'var(--accent-orange)' : 'var(--text-secondary)',
                                        textShadow: p.es_lider ? '0 0 8px rgba(249, 115, 22, 0.3)' : 'none',
                                        border: p.es_lider ? '1px solid rgba(249, 115, 22, 0.3)' : '1px solid var(--border-color)',
                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                        width: 'fit-content',
                                        fontWeight: p.es_lider ? 600 : 400
                                    }}>
                                        {p.es_lider ? <Star size={10} fill="currentColor" /> : <Users size={10} />} {p.nombre}{p.cargo ? ` · ${p.cargo}` : ''}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                Sin personal asignado
                            </p>
                        )}
                    </div>
                )) : (
                    <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                        <Users size={40} />
                        <h4>No hay brigadas</h4>
                        <p>Crea tu primera brigada para asignar personal técnico.</p>
                    </div>
                )}
            </div>

            {/* Modal: Crear Brigada */}
            {showCreateBrigada && (
                <div className="modal-overlay" onClick={() => setShowCreateBrigada(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Nueva Brigada</h3>
                            <button className="modal-close" onClick={() => setShowCreateBrigada(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleCreateBrigada}>
                                <div className="form-group">
                                    <label>Nombre de la brigada *</label>
                                    <input className="form-input" required value={brigForm.nombre}
                                        onChange={e => setBrigForm({ ...brigForm, nombre: e.target.value })}
                                        placeholder="Ej: Brigada Norte" />
                                </div>
                                <div className="form-group">
                                    <label>Descripción</label>
                                    <textarea className="form-textarea" value={brigForm.descripcion}
                                        onChange={e => setBrigForm({ ...brigForm, descripcion: e.target.value })}
                                        placeholder="Descripción de la brigada..." />
                                </div>
                                <div className="form-actions">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowCreateBrigada(false)}>Cancelar</button>
                                    <button type="submit" className="btn btn-primary">Crear Brigada</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Crear Personal (from list view) */}
            {showCreatePersonal && !selectedBrigada && (
                <div className="modal-overlay" onClick={() => setShowCreatePersonal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Registrar Personal Técnico</h3>
                            <button className="modal-close" onClick={() => setShowCreatePersonal(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleCreatePersonal}>
                                <div className="form-group">
                                    <label>Nombre completo *</label>
                                    <input className="form-input" required value={persForm.nombre}
                                        onChange={e => setPersForm({ ...persForm, nombre: e.target.value })}
                                        placeholder="Nombre y apellido" />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Cédula</label>
                                        <input className="form-input" value={persForm.cedula}
                                            onChange={e => setPersForm({ ...persForm, cedula: e.target.value })}
                                            placeholder="Número de cédula" />
                                    </div>
                                    <div className="form-group">
                                        <label>Cargo</label>
                                        <input className="form-input" value={persForm.cargo}
                                            onChange={e => setPersForm({ ...persForm, cargo: e.target.value })}
                                            placeholder="Ej: Técnico electricista" />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Teléfono</label>
                                    <input className="form-input" value={persForm.telefono}
                                        onChange={e => setPersForm({ ...persForm, telefono: e.target.value })}
                                        placeholder="Número de contacto" />
                                </div>
                                <div className="form-actions">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowCreatePersonal(false)}>Cancelar</button>
                                    <button type="submit" className="btn btn-primary">Registrar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
