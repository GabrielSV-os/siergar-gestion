import { useState, useEffect, useRef } from 'react';
import { Sun, Moon, Palette, Settings, FlaskConical } from 'lucide-react';
import { demoMode } from '../lib/demoMode';

export default function ThemeToggle() {
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('siergar-theme') || 'dark';
    });

    const [accentColor, setAccentColor] = useState(() => {
        return localStorage.getItem('siergar-accent') || '#22c55e'; // Default green
    });

    const [isOpen, setIsOpen] = useState(false);
    const [isDemo, setIsDemo] = useState(demoMode.enabled);
    const dropdownRef = useRef(null);

    useEffect(() => demoMode.subscribe(setIsDemo), []);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('siergar-theme', theme);
    }, [theme]);

    useEffect(() => {
        // Helper: darken a hex color by a percentage (0-1)
        function darkenHex(hex, amount) {
            const r = Math.max(0, Math.round(parseInt(hex.slice(1, 3), 16) * (1 - amount)));
            const g = Math.max(0, Math.round(parseInt(hex.slice(3, 5), 16) * (1 - amount)));
            const b = Math.max(0, Math.round(parseInt(hex.slice(5, 7), 16) * (1 - amount)));
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        }

        const appliedColor = theme === 'dark' ? darkenHex(accentColor, 0.35) : accentColor;

        // Apply primary color
        document.documentElement.style.setProperty('--accent-blue', appliedColor);
        document.documentElement.style.setProperty('--accent-blue-hover', appliedColor);
        // Glow is the color with low opacity (approx 20 in hex -> 12%)
        document.documentElement.style.setProperty('--accent-blue-glow', appliedColor + '20');

        localStorage.setItem('siergar-accent', accentColor);
    }, [accentColor, theme]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

    return (
        <div className="theme-toggle-container" ref={dropdownRef}>
            <button
                className="theme-toggle"
                onClick={() => setIsOpen(!isOpen)}
                title="Configuración de Apariencia"
            >
                <Settings size={20} style={{
                    transition: 'transform 0.4s ease-in-out',
                    transform: isOpen ? 'rotate(360deg)' : 'rotate(0deg)'
                }} />
            </button>

            {isOpen && (
                <>
                    <div className="animated-dropdown-backdrop" onClick={() => setIsOpen(false)} />
                    <div className="animated-dropdown" style={{
                        top: 'auto',
                        bottom: 'calc(100% + 12px)',
                        right: 0,
                        width: '250px',
                        transformOrigin: 'bottom right',
                        padding: '12px'
                    }}>
                        <div className="animated-dropdown-label">Apariencia</div>

                        <div className="animated-dropdown-separator" />

                        <div className="animated-dropdown-item theme-item" style={{ justifyContent: 'space-between', cursor: 'default' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                                <span>Modo {theme === 'dark' ? 'Oscuro' : 'Claro'}</span>
                            </div>
                            <button
                                onClick={toggleTheme}
                                style={{
                                    padding: '4px 8px',
                                    borderRadius: 'var(--radius-sm)',
                                    border: '1px solid var(--border-color)',
                                    background: 'var(--bg-card)',
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer',
                                    fontSize: '11px',
                                    fontWeight: 'bold'
                                }}
                            >
                                Cambiar
                            </button>
                        </div>

                        <div className="animated-dropdown-separator" />

                        <div className="animated-dropdown-label" style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Palette size={14} /> Color Principal
                        </div>

                        <div className="animated-dropdown-item theme-item" style={{ cursor: 'default', paddingBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', width: '100%' }}>
                                {[
                                    { name: 'Verde', color: '#22c55e' },
                                    { name: 'Azul', color: '#3b82f6' },
                                    { name: 'Morado', color: '#a855f7' },
                                    { name: 'Naranja', color: '#f59e0b' },
                                    { name: 'Rojo', color: '#ef4444' },
                                    { name: 'Cian', color: '#06b6d4' }
                                ].map(preset => (
                                    <button
                                        key={preset.color}
                                        onClick={() => setAccentColor(preset.color)}
                                        title={preset.name}
                                        style={{
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '50%',
                                            backgroundColor: preset.color,
                                            border: accentColor === preset.color ? '2px solid var(--text-primary)' : '2px solid transparent',
                                            cursor: 'pointer',
                                            padding: 0,
                                            transition: 'transform 0.1s',
                                            transform: accentColor === preset.color ? 'scale(1.1)' : 'scale(1)',
                                            boxShadow: accentColor === preset.color ? `0 0 8px ${preset.color}60` : 'none'
                                        }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="animated-dropdown-separator" />

                        <div className="animated-dropdown-item theme-item" style={{ justifyContent: 'space-between', cursor: 'default' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FlaskConical size={16} style={{ color: isDemo ? '#f59e0b' : 'var(--text-secondary)' }} />
                                <span>Modo Prueba</span>
                            </div>
                            <button
                                onClick={() => demoMode.toggle()}
                                style={{
                                    padding: '4px 10px',
                                    borderRadius: 'var(--radius-sm)',
                                    border: isDemo ? '1px solid #f59e0b' : '1px solid var(--border-color)',
                                    background: isDemo ? '#f59e0b22' : 'var(--bg-card)',
                                    color: isDemo ? '#f59e0b' : 'var(--text-muted)',
                                    cursor: 'pointer',
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    transition: 'all 0.15s'
                                }}
                            >
                                {isDemo ? 'Activo' : 'Inactivo'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
