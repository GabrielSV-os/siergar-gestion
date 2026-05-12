import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRealtime } from '../lib/useRealtime';
import { useToast } from '../components/Toast';
import { StickyNote, Plus, Trash2, Clock, X, Paperclip, FileText, Image as ImageIcon } from 'lucide-react';
import StarsBackground from '../components/StarsBackground';
import ColorBends from '../components/ColorBends';

export default function Notas() {
    const toast = useToast();
    const [notas, setNotas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [titulo, setTitulo] = useState('');
    const [contenido, setContenido] = useState('');
    const [archivos, setArchivos] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [isDark, setIsDark] = useState(() => document.documentElement.getAttribute('data-theme') !== 'light');

    useEffect(() => {
        setIsDark(document.documentElement.getAttribute('data-theme') !== 'light');
        const observer = new MutationObserver(() => {
            setIsDark(document.documentElement.getAttribute('data-theme') !== 'light');
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);

    useEffect(() => { loadNotas(); }, []);
    useRealtime(['notas'], loadNotas, 'notas-realtime');

    async function loadNotas() {
        setLoading(true);
        const { data } = await supabase.from('notas')
            .select('*')
            .order('created_at', { ascending: false });
        setNotas(data || []);
        setLoading(false);
    }

    async function handleAdd(e) {
        e.preventDefault();
        if (!titulo.trim()) { toast('Ingrese un título', 'error'); return; }
        if (!contenido.trim()) { toast('Ingrese el contenido', 'error'); return; }

        try {
            setUploading(true);
            let uploadedFiles = [];

            if (archivos.length > 0) {
                const uploadPromises = archivos.map(async (file) => {
                    const fileExt = file.name.split('.').pop();
                    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
                    const filePath = `adjuntos/${fileName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('notas-attachments')
                        .upload(filePath, file);

                    if (uploadError) throw uploadError;

                    const { data } = supabase.storage
                        .from('notas-attachments')
                        .getPublicUrl(filePath);

                    return {
                        url: data.publicUrl,
                        nombre: file.name
                    };
                });

                uploadedFiles = await Promise.all(uploadPromises);
            }

            const { error: insertError } = await supabase.from('notas').insert({
                titulo: titulo.trim(),
                contenido: contenido.trim(),
                archivos: uploadedFiles // JSON array of attachments
            });

            if (insertError) throw insertError;

            toast('Nota agregada correctamente');
            setTitulo('');
            setContenido('');
            setArchivos([]);
            setShowModal(false);
            loadNotas();
        } catch (error) {
            console.error('Error guardando nota:', error);
            toast(error.message || 'Error al guardar la nota', 'error');
        } finally {
            setUploading(false);
        }
    }

    async function handleDelete(id) {
        if (!confirm('¿Eliminar esta nota?')) return;
        await supabase.from('notas').delete().eq('id', id);
        toast('Nota eliminada');
        loadNotas();
    }

    if (loading) return <div className="loading-spinner" />;

    return (
        <div className="stars-container">
            {isDark ? <StarsBackground /> : (
                <ColorBends
                    colors={["#ff5c7a", "#8a5cff", "#00ffd1"]}
                    rotation={0}
                    speed={0.2}
                    scale={1}
                    frequency={1}
                    warpStrength={1}
                    mouseInfluence={1}
                    parallax={0.5}
                    noise={0.1}
                    transparent
                    autoRotate={0}
                />
            )}
            <div className="page-header">
                <div>
                    <h2><StickyNote style={{ marginRight: 8, verticalAlign: 'middle' }} /> Notas</h2>
                    <p className="page-header-subtitle">Registro de notas con fecha y hora</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={16} /> Nueva Nota
                </button>
            </div>

            {notas.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {notas.map(nota => (
                        <div key={nota.id} className="card" style={{ padding: '16px 20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{ margin: '0 0 6px 0', color: 'var(--text-primary)', fontSize: 15 }}>
                                        {nota.titulo}
                                    </h4>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>
                                        {nota.contenido}
                                    </p>

                                    {/* Attachment Display */}
                                    {nota.archivos && nota.archivos.length > 0 && (
                                        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                            {nota.archivos.map((adjunto, idx) => (
                                                <div key={idx} style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-color)', display: 'inline-block' }}>
                                                    {adjunto.nombre?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                            <a href={adjunto.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
                                                                <img
                                                                    src={adjunto.url}
                                                                    alt={adjunto.nombre}
                                                                    style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 4, objectFit: 'contain' }}
                                                                />
                                                            </a>
                                                            <a href={adjunto.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-blue)', textDecoration: 'none' }}>
                                                                <ImageIcon size={14} /> {adjunto.nombre}
                                                            </a>
                                                        </div>
                                                    ) : (
                                                        <a href={adjunto.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--accent-blue)', textDecoration: 'none' }}>
                                                            <FileText size={14} /> {adjunto.nombre || 'Documento adjunto'}
                                                        </a>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, color: 'var(--text-muted)', fontSize: 12 }}>
                                        <Clock size={12} />
                                        <span>
                                            {new Date(nota.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                            {' · '}
                                            {new Date(nota.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => handleDelete(nota.id)}
                                    style={{ color: 'var(--accent-red)', flexShrink: 0 }}
                                    title="Eliminar nota"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <StickyNote size={48} />
                    <h3>Sin notas</h3>
                    <p>Crea tu primera nota con el botón "Nueva Nota".</p>
                </div>
            )}

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Nueva Nota</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleAdd}>
                                <div className="form-group">
                                    <label>Título *</label>
                                    <input className="form-input" required value={titulo}
                                        onChange={e => setTitulo(e.target.value)}
                                        placeholder="Título de la nota" />
                                </div>
                                <div className="form-group">
                                    <label>Contenido *</label>
                                    <textarea className="form-textarea" required value={contenido}
                                        onChange={e => setContenido(e.target.value)}
                                        placeholder="Escribe el contenido..."
                                        rows={4} />
                                </div>
                                <div className="form-group">
                                    <label>Adjuntar Archivos (Opcional)</label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <label className="btn btn-ghost" style={{ cursor: 'pointer', display: 'flex', gap: 6, alignItems: 'center', border: '1px dashed var(--border-color)', width: 'fit-content' }}>
                                            <Plus size={16} />
                                            Agregar imágenes o documentos
                                            <input
                                                type="file"
                                                multiple
                                                style={{ display: 'none' }}
                                                onChange={e => {
                                                    const selectedFiles = Array.from(e.target.files);
                                                    const validFiles = [];
                                                    for (const file of selectedFiles) {
                                                        if (file.size > 8 * 1024 * 1024) {
                                                            toast(`El archivo "${file.name}" supera el límite de 8MB y no será subido.`, 'error');
                                                        } else {
                                                            validFiles.push(file);
                                                        }
                                                    }
                                                    setArchivos(prev => [...prev, ...validFiles]);
                                                    e.target.value = ''; // Reset input to allow selecting same file again if needed
                                                }}
                                                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                                            />
                                        </label>

                                        {/* File list preview */}
                                        {archivos.length > 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                                                {archivos.map((file, idx) => (
                                                    <div key={idx} style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', background: 'var(--bg-secondary)', borderRadius: 4, width: 'fit-content' }}>
                                                        {file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? <ImageIcon size={14} /> : <FileText size={14} />}
                                                        <span style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {file.name}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setArchivos(prev => prev.filter((_, i) => i !== idx))}
                                                            style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', padding: 2, display: 'flex' }}
                                                            title="Quitar archivo"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="form-actions">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={uploading}>Cancelar</button>
                                    <button type="submit" className="btn btn-primary" disabled={uploading}>
                                        {uploading ? 'Guardando...' : 'Guardar Nota'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
