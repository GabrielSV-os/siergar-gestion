import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Package, FolderKanban, Users, LayoutDashboard, BookOpen, StickyNote, Hammer, Database, Menu, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Layout() {
    const [dbSize, setDbSize] = useState(0);
    const [sidebarOpen, setSidebarOpen] = useState(false);

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
                    <NavLink to="/brigadas" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                        <Users />
                        <span>Brigadas</span>
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
                <Outlet />
            </main>
        </div>
    );
}
