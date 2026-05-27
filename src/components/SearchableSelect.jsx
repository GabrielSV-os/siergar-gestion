import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

/**
 * SearchableSelect - Dropdown con búsqueda integrada
 *
 * Props:
 *  - options: [{ value, label, sublabel?, disabled?, disabledReason? }]
 *  - value: string (current selected value)
 *  - onChange: (value) => void
 *  - placeholder: string
 *  - required: boolean
 *  - searchPlaceholder: string
 */
export default function SearchableSelect({
    options = [],
    value,
    onChange,
    placeholder = 'Seleccionar...',
    required = false,
    searchPlaceholder = 'Buscar...',
    style = {}
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef(null);
    const searchInputRef = useRef(null);

    const selectedOption = options.find(o => o.value === value);

    const filtered = options.filter(o => {
        const q = search.toLowerCase();
        return (
            o.label.toLowerCase().includes(q) ||
            (o.sublabel && o.sublabel.toLowerCase().includes(q))
        );
    });

    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        function handleClickOutside(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
                setSearch('');
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={containerRef} style={{ position: 'relative', ...style }}>
            {/* Hidden input for form validation */}
            {required && (
                <input
                    tabIndex={-1}
                    autoComplete="off"
                    style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
                    value={value || ''}
                    required={required}
                    onChange={() => {}}
                />
            )}

            {/* Trigger button */}
            <div
                className="form-select"
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    gap: 8,
                    minHeight: 40,
                    backgroundImage: 'none',
                    paddingRight: 12
                }}
            >
                <span style={{
                    color: selectedOption ? 'var(--text-primary)' : 'var(--text-muted)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1
                }}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown
                    size={16}
                    style={{
                        color: 'var(--text-muted)',
                        transition: 'transform 0.2s ease',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        flexShrink: 0
                    }}
                />
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    maxHeight: 300,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}>
                    {/* Search input */}
                    <div style={{
                        padding: '8px',
                        borderBottom: '1px solid var(--border-color)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                    }}>
                        <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={searchPlaceholder}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                color: 'var(--text-primary)',
                                fontSize: 13,
                                width: '100%'
                            }}
                        />
                        {search && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setSearch(''); }}
                                style={{
                                    background: 'transparent', border: 'none', cursor: 'pointer',
                                    color: 'var(--text-muted)', padding: 2, display: 'flex', flexShrink: 0
                                }}
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Options list */}
                    <div style={{ overflowY: 'auto', maxHeight: 240 }}>
                        {filtered.length > 0 ? filtered.map(option => (
                            <div
                                key={option.value}
                                onClick={() => {
                                    if (option.disabled) return;
                                    onChange(option.value);
                                    setIsOpen(false);
                                    setSearch('');
                                }}
                                style={{
                                    padding: '10px 12px',
                                    cursor: option.disabled ? 'not-allowed' : 'pointer',
                                    backgroundColor: option.value === value ? 'var(--accent-primary-bg)' : 'transparent',
                                    borderLeft: option.value === value ? '3px solid var(--accent-primary)' : '3px solid transparent',
                                    opacity: option.disabled ? 0.5 : 1,
                                    transition: 'background-color 0.15s ease',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 2
                                }}
                                onMouseEnter={e => {
                                    if (!option.disabled) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.backgroundColor = option.value === value ? 'var(--accent-primary-bg)' : 'transparent';
                                }}
                            >
                                <span style={{
                                    fontSize: 13,
                                    color: option.disabled ? 'var(--text-muted)' : 'var(--text-primary)',
                                    fontWeight: option.value === value ? 600 : 400
                                }}>
                                    {option.label}
                                </span>
                                {option.sublabel && (
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                        {option.sublabel}
                                    </span>
                                )}
                                {option.disabled && option.disabledReason && (
                                    <span style={{ fontSize: 10, color: 'var(--accent-red)', fontStyle: 'italic' }}>
                                        {option.disabledReason}
                                    </span>
                                )}
                            </div>
                        )) : (
                            <div style={{ padding: '16px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                                No se encontraron resultados
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
