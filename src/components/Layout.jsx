import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Package, FolderKanban, Users, LayoutDashboard, BookOpen, StickyNote, Hammer, Database, Menu, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Grainient from './Grainient';
import Aurora from './Aurora';

export default function Layout() {
    const location = useLocation();
    const isNotas = location.pathname === '/notas';
    const [dbSize, setDbSize] = useState(0);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isLight, setIsLight] = useState(() => (localStorage.getItem('siergar-theme') || 'dark') === 'light');

    useEffect(() => {
        const observer = new MutationObserver(() => {
            setIsLight(document.documentElement.getAttribute('data-theme') === 'light');
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        async function fetchSize() {
            const { data, error } = await supabase.rpc('get_db_size');
            if (!error && data !== null) {
                setDbSize(Number(data));
            }
        }
        fetchSize();
        const interval = setInterval(fetchSize, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const MAX_SIZE = 500 * 1024 * 1024;
    const percent = Math.min((dbSize / MAX_SIZE) * 100, 100);
    const sizeMB = (dbSize / (1024 * 1024)).toFixed(2);

    return (
        <div className="app-layout">
            {!isNotas && <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
                <Grainient
                    color1={isLight ? '#e0e0e0' : '#000000'}
                    color2={isLight ? '#94a3b8' : '#5f656e'}
                    color3={isLight ? '#ffffff' : '#000000'}
                    timeSpeed={0.25}
                    colorBalance={0}
                    warpStrength={1}
                    warpFrequency={5}
                    warpSpeed={2}
                    warpAmplitude={50}
                    blendAngle={0}
                    blendSoftness={0.05}
                    rotationAmount={500}
                    noiseScale={2}
                    grainAmount={0.1}
                    grainScale={2}
                    grainAnimated={false}
                    contrast={1.5}
                    gamma={1}
                    saturation={1}
                    centerX={0}
                    centerY={0}
                    zoom={0.9}
                />
            </div>}
            {/* Mobile hamburger button */}
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
                {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            {/* Mobile backdrop */}
            {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}
            <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <div className="sidebar-logo-icon">SG</div>
                        <div>
                            <h1>Siergar</h1>
                            <span>Gestión de Materiales</span>
                        </div>
                    </div>
                </div>
                <nav className="sidebar-nav">
                    <div className="sidebar-section-title">Módulos</div>
                    <NavLink to="/" end className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                        <LayoutDashboard />
                        <span>Dashboard</span>
                    </NavLink>
                    <NavLink to="/inventario" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                        <Package />
                        <span>Inventario</span>
                    </NavLink>
                    <NavLink to="/proyectos" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                        <FolderKanban />
                        <span>Proyectos</span>
                    </NavLink>
                    <NavLink to="/personal" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                        <Users />
                        <span>Personal</span>
                    </NavLink>
                    <NavLink to="/fabricacion" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                        <Hammer />
                        <span>Fabricación</span>
                    </NavLink>
                    <NavLink to="/notas" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                        <StickyNote />
                        <span>Notas</span>
                    </NavLink>
                    <div style={{ flex: 1 }} />
                    <div className="sidebar-section-title" style={{ marginTop: 8 }}>Ayuda</div>
                    <NavLink to="/manual" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                        <BookOpen />
                        <span>Manual de Uso</span>
                    </NavLink>

                    <div className="storage-indicator">
                        <div className="storage-header">
                            <Database size={14} />
                            <span>Almacenamiento BD</span>
                        </div>
                        <div className="storage-progress-bg">
                            <div
                                className="storage-progress-fill"
                                style={{
                                    width: `${Math.max(percent, 1)}%`,
                                    background: percent > 90 ? 'var(--accent-red)' : percent > 75 ? 'var(--accent-orange)' : 'var(--accent-blue)'
                                }}
                            />
                        </div>
                        <div className="storage-text">
                            {sizeMB} MB / 500 MB ({percent.toFixed(1)}%)
                        </div>
                    </div>
                </nav>
            </aside>
            <main className="main-content">
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
