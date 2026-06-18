import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useRealtime } from '../lib/useRealtime';
import { Package, FolderKanban, Users, TrendingDown, Info } from 'lucide-react';
import CountUp from '../components/CountUp';
import {
    Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend as ChartLegend,
    CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement
} from 'chart.js';
import { Doughnut, Bar, Chart } from 'react-chartjs-2';

ChartJS.register(ArcElement, ChartTooltip, ChartLegend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement);

export default function Dashboard() {
    const [stats, setStats] = useState({
        materiales: 0,
        proyectos: 0,
        brigadas: 0,
        consumoHoy: 0
    });
    const [recentConsumo, setRecentConsumo] = useState([]);
    const [chartData, setChartData] = useState({
        proyectosStatus: [],
        topMateriales: [],
        cotizacionesAnual: { labels: [], data: [] }
    });
    const [loading, setLoading] = useState(true);
    const [themeTrigger, setThemeTrigger] = useState(0);

    useEffect(() => {
        const observer = new MutationObserver(() => setThemeTrigger(t => t + 1));
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        loadStats();
    }, []);

    useRealtime(
        ['materiales', 'proyectos', 'brigadas', 'consumo_materiales', 'inventario', 'proyecto_cotizacion'],
        loadStats,
        'dashboard-realtime'
    );

    async function loadStats() {
        try {
            const [matRes, projRes, brigRes, consumoRes, recentRes, allProjRes, allMatsRes, allConsumosRes, allCotsRes] = await Promise.all([
                supabase.from('materiales').select('id', { count: 'exact', head: true }),
                supabase.from('proyectos').select('id', { count: 'exact', head: true }).eq('estado', 'activo'),
                supabase.from('brigadas').select('id', { count: 'exact', head: true }).eq('activa', true),
                supabase.from('consumo_materiales').select('id', { count: 'exact', head: true })
                    .eq('fecha', new Date().toISOString().split('T')[0]),
                supabase.from('consumo_materiales')
                    .select(`
            id, cantidad, fecha, observaciones,
            materiales(nombre),
            proyectos(nombre),
            brigadas(nombre)
          `)
                    .order('created_at', { ascending: false })
                    .limit(10),
                supabase.from('proyectos').select('id, nombre, estado, fecha_fin, created_at'),
                supabase.from('materiales').select('id, nombre, inventario(cantidad)'),
                supabase.from('consumo_materiales').select('material_id, cantidad, tipo'),
                supabase.from('proyecto_cotizacion').select('proyecto_id, precio_unitario, cantidad')
            ]);

            setStats({
                materiales: matRes.count || 0,
                proyectos: projRes.count || 0,
                brigadas: brigRes.count || 0,
                consumoHoy: consumoRes.count || 0
            });
            setRecentConsumo(recentRes.data || []);

            // 1. Status Chart Data
            const estados = allProjRes.data || [];
            const todayStr = new Date().toISOString().split('T')[0];
            const statusCounts = { activo: 0, retrasado: 0, pausado: 0, completado: 0, cancelado: 0 };
            estados.forEach(p => {
                if (statusCounts[p.estado] !== undefined) statusCounts[p.estado]++;
                // Also count as retrasado if active and past end date
                if (p.estado === 'activo' && p.fecha_fin && p.fecha_fin < todayStr) {
                    statusCounts.retrasado++;
                }
            });

            // 2. Top Materials Data
            const consumos = allConsumosRes.data || [];
            const allMats = allMatsRes.data || [];
            const matMap = {};
            allMats.forEach(m => {
                let stockVal = 0;
                if (m.inventario) {
                    if (Array.isArray(m.inventario)) {
                        stockVal = m.inventario.reduce((acc, curr) => acc + (Number(curr.cantidad) || 0), 0);
                    } else {
                        stockVal = Number(m.inventario.cantidad) || 0;
                    }
                }
                matMap[m.id] = { nombre: m.nombre, stock: stockVal, consumido: 0 };
            });
            consumos.forEach(c => {
                if (matMap[c.material_id]) {
                    matMap[c.material_id].consumido += Number(c.cantidad) || 0;
                }
            });
            // Show top 5 by consumption, or by stock if no consumption
            let topMateriales = Object.values(matMap)
                .filter(m => m.consumido > 0 || m.stock > 0)
                .sort((a, b) => (b.consumido + b.stock) - (a.consumido + a.stock))
                .slice(0, 5);

            // 5. Quoted Value per Month Data
            const cots = allCotsRes.data || [];
            const projMap = {};
            estados.forEach(p => {
                const date = new Date(p.created_at);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                projMap[p.id] = { monthKey, totalValue: 0 };
            });
            cots.forEach(c => {
                if (projMap[c.proyecto_id]) {
                    projMap[c.proyecto_id].totalValue += (Number(c.precio_unitario) * Number(c.cantidad));
                }
            });

            const monthlyValues = {};
            Object.values(projMap).forEach(p => {
                if (!monthlyValues[p.monthKey]) monthlyValues[p.monthKey] = 0;
                monthlyValues[p.monthKey] += p.totalValue;
            });

            const monthKeys = [];
            const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
            const monthLabels = [];
            const today = new Date();
            for (let i = 5; i >= 0; i--) {
                const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                monthKeys.push(key);
                monthLabels.push(`${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`);
            }
            const cotizacionesAnualData = monthKeys.map(k => monthlyValues[k] || 0);

            setChartData({
                proyectosStatus: [statusCounts.activo, statusCounts.retrasado, statusCounts.pausado, statusCounts.completado, statusCounts.cancelado],
                topMateriales,
                cotizacionesAnual: { labels: monthLabels, data: cotizacionesAnualData }
            });
        } catch (err) {
            console.error('Error loading stats:', err);
        } finally {
            setLoading(false);
        }
    }

    const cssTextSecondary = useMemo(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#cbd5e1',
        [themeTrigger]);
    const cssTextMuted = useMemo(() =>
        getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#94a3b8',
        [themeTrigger]);

    const doughnutChartData = useMemo(() => ({
        labels: ['Activos', 'Retrasados', 'Pausados', 'Completados', 'Cancelados'],
        datasets: [{ data: chartData.proyectosStatus || [0, 0, 0, 0, 0], backgroundColor: ['#10b981', '#f97316', '#eab308', '#3b82f6', '#ef4444'], borderWidth: 0, hoverOffset: 4 }]
    }), [chartData.proyectosStatus]);

    const doughnutOptions = useMemo(() => ({
        plugins: {
            legend: { position: 'right', labels: { color: cssTextSecondary, font: { family: 'Inter' } } },
            tooltip: { backgroundColor: 'rgba(0,0,0,0.85)', padding: 12, cornerRadius: 8, titleFont: { family: 'Inter' }, bodyFont: { family: 'Inter' } }
        },
        maintainAspectRatio: false,
        cutout: '70%'
    }), [cssTextSecondary]);

    const barChartData = useMemo(() => ({
        labels: chartData.topMateriales.map(m => m.nombre.length > 18 ? m.nombre.substring(0, 18) + '...' : m.nombre),
        datasets: [
            { label: 'Consumo Histórico', data: chartData.topMateriales.map(m => m.consumido), backgroundColor: '#f59e0b' },
            { label: 'Stock Actual', data: chartData.topMateriales.map(m => m.stock), backgroundColor: '#3b82f6' }
        ]
    }), [chartData.topMateriales]);

    const barOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top', labels: { color: cssTextSecondary, font: { family: 'Inter' } } },
            tooltip: {
                backgroundColor: 'rgba(0,0,0,0.85)', padding: 12, cornerRadius: 8, titleFont: { family: 'Inter' }, bodyFont: { family: 'Inter' },
                callbacks: { title: (context) => context?.length ? chartData.topMateriales[context[0].dataIndex]?.nombre || '' : '' }
            }
        },
        scales: {
            x: { grid: { color: 'rgba(255,255,255,0.06)', drawBorder: false }, ticks: { color: cssTextMuted, font: { family: 'Inter' } } },
            y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.06)', drawBorder: false }, ticks: { color: cssTextMuted, font: { family: 'Inter' } } }
        }
    }), [cssTextSecondary, cssTextMuted, chartData.topMateriales]);

    const lineBarData = useMemo(() => ({
        labels: chartData.cotizacionesAnual.labels,
        datasets: [
            { type: 'line', label: 'Tendencia', data: chartData.cotizacionesAnual.data, borderColor: '#f59e0b', borderWidth: 3, fill: false, tension: 0.4, pointBackgroundColor: '#f59e0b', pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 6 },
            { type: 'bar', label: 'Valor Cotizado (RD$)', data: chartData.cotizacionesAnual.data, backgroundColor: 'rgba(59, 130, 246, 0.4)', borderColor: '#3b82f6', borderWidth: 1, borderRadius: 4 }
        ]
    }), [chartData.cotizacionesAnual]);

    const lineBarOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: { position: 'top', labels: { color: cssTextSecondary, font: { family: 'Inter', size: 12 } } },
            tooltip: { backgroundColor: 'rgba(0,0,0,0.85)', padding: 12, cornerRadius: 8, titleFont: { family: 'Inter' }, bodyFont: { family: 'Inter' } }
        },
        scales: {
            x: { grid: { color: 'rgba(255,255,255,0.06)', drawBorder: false }, ticks: { color: cssTextMuted, font: { family: 'Inter' } } },
            y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.06)', drawBorder: false }, ticks: { color: cssTextMuted, font: { family: 'Inter' }, callback: (v) => '$' + v.toLocaleString() } }
        }
    }), [cssTextSecondary, cssTextMuted]);

    if (loading) return <div className="loading-spinner" />;

    return (
        <div>
            <style>{`
                .chart-info-wrapper {
                    position: relative;
                    display: inline-flex;
                    cursor: pointer;
                }
                .chart-info-wrapper .chart-info-tooltip {
                    visibility: hidden;
                    opacity: 0;
                    position: absolute;
                    top: calc(100% + 8px);
                    right: 0;
                    width: 260px;
                    padding: 10px 14px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-sm);
                    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
                    font-size: 12px;
                    line-height: 1.5;
                    color: var(--text-secondary);
                    z-index: 100;
                    transition: opacity 0.2s ease, visibility 0.2s ease;
                    pointer-events: none;
                }
                .chart-info-wrapper:hover .chart-info-tooltip {
                    visibility: visible;
                    opacity: 1;
                }
            `}</style>
            <div className="page-header">
                <div>
                    <h2>Dashboard</h2>
                    <p className="page-header-subtitle">Resumen general del sistema</p>
                </div>
            </div>

            <div className="card-grid">
                <div className="stat-card">
                    <div className="stat-icon blue"><Package size={24} /></div>
                    <div className="stat-info">
                        <h4><CountUp from={0} to={stats.materiales} duration={1} separator="," /></h4>
                        <p>Materiales registrados</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon purple"><FolderKanban size={24} /></div>
                    <div className="stat-info">
                        <h4><CountUp from={0} to={stats.proyectos} duration={1} separator="," /></h4>
                        <p>Proyectos activos</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon green"><Users size={24} /></div>
                    <div className="stat-info">
                        <h4><CountUp from={0} to={stats.brigadas} duration={1} separator="," /></h4>
                        <p>Brigadas activas</p>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon orange"><TrendingDown size={24} /></div>
                    <div className="stat-info">
                        <h4><CountUp from={0} to={stats.consumoHoy} duration={1} separator="," /></h4>
                        <p>Consumos registrados hoy</p>
                    </div>
                </div>
            </div>

            {/* CHARTS SECTIONS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginTop: '20px' }}>
                {/* 1. Estado de Proyectos (Doughnut) */}
                <div className="card">
                    <div className="card-header">
                        <h3>Estado de Proyectos</h3>
                        <div className="chart-info-wrapper">
                            <Info size={16} style={{ color: 'var(--text-muted)' }} />
                            <div className="chart-info-tooltip">
                                Muestra la distribución actual de todos los proyectos según su estado: activos, retrasados, pausados, completados o cancelados.
                            </div>
                        </div>
                    </div>
                    <div style={{ height: 300, position: 'relative' }}>
                        <Doughnut
                            key={themeTrigger}
                            data={doughnutChartData}
                            options={doughnutOptions}
                        />
                    </div>
                </div>

                {/* 2. Top Materiales (Bar) */}
                <div className="card">
                    <div className="card-header">
                        <h3>Top 5 Materiales: Consumo vs Stock</h3>
                        <div className="chart-info-wrapper">
                            <Info size={16} style={{ color: 'var(--text-muted)' }} />
                            <div className="chart-info-tooltip">
                                Compara los 5 materiales más utilizados: la barra naranja indica cuánto se ha consumido en total y la azul cuánto queda en inventario actualmente.
                            </div>
                        </div>
                    </div>
                    <div style={{ height: 300, position: 'relative' }}>
                        <Bar
                            key={themeTrigger}
                            data={barChartData}
                            options={barOptions}
                        />
                    </div>
                </div>
            </div>

            {/* 5. Valor de Proyectos Cotizados (Línea/Barra) */}
            <div className="card" style={{ marginTop: 20, marginBottom: 20 }}>
                <div className="card-header">
                    <h3>Valor Total de Proyectos por Mes</h3>
                    <div className="chart-info-wrapper">
                        <Info size={16} style={{ color: 'var(--text-muted)' }} />
                        <div className="chart-info-tooltip">
                            Suma el valor en RD$ de todas las cotizaciones de proyectos creados cada mes. La línea amarilla muestra la tendencia a lo largo del tiempo.
                        </div>
                    </div>
                </div>
                <div style={{ height: 350, position: 'relative' }}>
                    <Chart
                        key={themeTrigger}
                        type='bar'
                        data={lineBarData}
                        options={lineBarOptions}
                    />
                </div>
            </div>

            <div className="card" style={{ marginTop: 8 }}>
                <div className="card-header">
                    <h3>Consumos Recientes</h3>
                </div>
                {recentConsumo.length > 0 ? (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Material</th>
                                    <th>Cantidad</th>
                                    <th>Proyecto</th>
                                    <th>Brigada</th>
                                    <th>Fecha</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentConsumo.map(c => (
                                    <tr key={c.id}>
                                        <td>{c.materiales?.nombre || '—'}</td>
                                        <td>{c.cantidad}</td>
                                        <td>{c.proyectos?.nombre || '—'}</td>
                                        <td>{c.brigadas?.nombre || '—'}</td>
                                        <td>{c.fecha}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty-state">
                        <TrendingDown size={40} />
                        <h4>Sin consumos recientes</h4>
                        <p>Los consumos de materiales aparecerán aquí cuando se registren.</p>
                    </div>
                )}
            </div>
        </div >
    );
}
