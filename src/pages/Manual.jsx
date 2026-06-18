import { BookOpen, Package, FolderKanban, Users, LayoutDashboard, ChevronRight, Hammer, History, Wrench, Zap, Bug } from 'lucide-react';

const changelog = [
    {
        version: 'v2.4',
        date: '17 Jun 2026',
        color: 'var(--accent-primary)',
        groups: [
            {
                icon: 'sparkle',
                label: 'Novedades',
                items: [
                    'Diseño completamente responsivo: tablas, tarjetas, botones y formularios adaptados a cualquier pantalla — móvil (iPhone SE), tablet y escritorio.',
                    'Fondo animado unificado: ambos temas usan Grainient — oscuro en tonos negro/gris, claro en tonos blanco/gris.',
                ]
            },
            {
                icon: 'zap',
                label: 'Rendimiento',
                items: [
                    'Gráficas del Dashboard memoizadas: Chart.js ya no re-anima en cada render, solo cuando cambian los datos o el tema.',
                    'Fondo WebGL: instancia única para ambos temas — cambiar modo claro/oscuro ya no destruye ni recrea el contexto WebGL.',
                    'Fondo WebGL: resolución fija a 1× — en pantallas HiDPI el shader ejecutaba 4× los píxeles sin diferencia visual perceptible.',
                    'Fondo WebGL: animación capada a 24fps — la transición es tan lenta que es indistinguible de 60fps.',
                    'Proyectos: búsqueda de materiales O(n²) → O(1) con Map; filtro de brigadas disponibles O(n²) → O(n) con Set.',
                    'Brigadas: cálculo de personal disponible O(n²) → O(n) con Map/Set.',
                    'Build con code splitting: react, Chart.js, jsPDF y Supabase en bundles separados para caché independiente del navegador.',
                ]
            }
        ]
    },
    {
        version: 'v2.3',
        date: '15 Jun 2026',
        color: '#64748b',
        groups: [
            {
                icon: 'sparkle',
                label: 'Novedades',
                items: [
                    'Fondo animado remodelado con posición fija (no se corta al hacer scroll).',
                    'El fondo animado se oculta en la página de Notas para mayor comodidad de lectura.',
                    'Modo Prueba: actívalo desde el panel de Apariencia (engranaje) para explorar el sistema sin guardar ningún cambio en la base de datos. Un banner naranja aparece en la parte superior mientras está activo.',
                ]
            },
            {
                icon: 'zap',
                label: 'Rendimiento',
                items: [
                    'Cálculos de stock en Inventario optimizados de O(n²) a O(n) con mapa de pre-cómputo.',
                    'useMemo aplicado en Inventario, Brigadas, Proyectos y Dashboard para evitar recálculos innecesarios.',
                ]
            },
            {
                icon: 'bug',
                label: 'Correcciones',
                items: [
                    'Crash en Dashboard por useMemo con auto-referencia al leer variables CSS del tema.',
                    'Crash en Brigadas por hooks (useMemo) declarados después de retornos condicionales, violando las Rules of Hooks.',
                ]
            }
        ]
    },
    {
        version: 'v2.2',
        date: '10 Jun 2026',
        color: 'var(--accent-green)',
        groups: [
            {
                icon: 'sparkle',
                label: 'Novedades',
                items: [
                    'Botón de scroll-to-top para volver al inicio de la página rápidamente.',
                    'Animación de entrada en el módulo de Nómina.',
                ]
            },
            {
                icon: 'bug',
                label: 'Correcciones',
                items: [
                    'Asistencia por persona mostraba registros duplicados en ciertos casos.',
                    'Horas deduplicadas correctamente en el cálculo de nómina.',
                    'Dropdown de selección de brigada se recortaba en pantallas pequeñas.',
                    'Advertencia al eliminar una brigada si tenía registros de asistencia pendientes.',
                    'Empleado aparecía duplicado en nómina al ser transferido entre brigadas.',
                ]
            }
        ]
    },
    {
        version: 'v2.0',
        date: '27 May 2026',
        color: 'var(--accent-orange)',
        groups: [
            {
                icon: 'sparkle',
                label: 'Novedades',
                items: [
                    'Entrada Directa al Proyecto: los materiales ahora pueden registrarse directamente al almacén del proyecto sin pasar por el inventario general. El movimiento queda registrado en el Historial de Movimientos de Inventario.',
                    'Botón "Agregar Material" con menú desplegable: "Desde almacén general" / "Entrada directa al proyecto".',
                ]
            },
            {
                icon: 'bug',
                label: 'Correcciones',
                items: [
                    'Gráfica "Consumo de Materiales por Día" ahora usa escala logarítmica para que materiales con valores muy distintos sean visibles de forma proporcional.',
                    'Corregido error que causaba pantalla en blanco al abrir esa gráfica.',
                ]
            },
            {
                icon: 'zap',
                label: 'Mejoras',
                items: [
                    'Buscador y botón del Almacén de Proyecto están ahora en la misma línea, bajo el título.',
                ]
            }
        ]
    },
    {
        version: 'v1.0',
        date: '27 May 2026',
        color: '#8b5cf6',
        groups: [
            {
                icon: 'sparkle',
                label: 'Novedades',
                items: [
                    'Tablas de secciones colapsables en Almacén, Consumo e Inventario de Brigadas de proyectos.',
                    'Inventario de Brigadas: cada brigada es ahora una sección colapsable (se eliminó el filtro por brigada).',
                    'Buscador en todas las tablas de materiales del sistema.',
                    'Gráficas de dona para "Inventario vs Consumo de Brigadas" (reemplazó la gráfica de barras).',
                    'Menú desplegable animado en la lista de Brigadas (Registrar Personal / Pasar Asistencia).',
                    'Solo se muestran los 5 materiales más consumidos en la tabla de detalle de proyectos.',
                    'Pase de asistencia global: vista unificada y alfabética de todo el personal activo sin importar la brigada.',
                    'Soporte de "Medio día": marca asistencia parcial con confirmación y indicadores visuales en naranja.',
                    'Deshabilitar/habilitar personal desde el modal de edición — al deshabilitarlo se retira automáticamente de su brigada.',
                    'Filtro de personal disponible al agregar a una brigada: excluye automáticamente a quienes ya están asignados a otra brigada activa.',
                    'Filas del reporte de asistencia (nómina) colapsables: ocultas por defecto, se expanden al hacer clic.',
                ]
            },
            {
                icon: 'zap',
                label: 'Mejoras',
                items: [
                    'Títulos en negrita añadidos a todas las tabs de proyectos.',
                    'Nombres largos de materiales truncados en la leyenda de la gráfica (nombre completo al hacer hover).',
                    'Al pasar el cursor por la gráfica de consumo diario, solo se muestra el tooltip del material activo.',
                    'Filtro, buscador y botón alineados en la misma línea en la tab de Consumo de Materiales.',
                ]
            },
            {
                icon: 'bug',
                label: 'Correcciones',
                items: [
                    'Eliminada la doble flecha en los selectores desplegables.',
                ]
            }
        ]
    }
];

const sections = [
    {
        icon: <LayoutDashboard size={22} />,
        title: 'Dashboard',
        color: 'var(--accent-primary)',
        description: 'Pantalla principal con un resumen general del sistema.',
        features: [
            'Visualiza estadísticas clave: total de materiales, proyectos activos, brigadas y stock total.',
            'Muestra un resumen rápido del estado general del sistema.',
            'Se actualiza en tiempo real conforme se registran cambios en otras secciones.'
        ]
    },
    {
        icon: <Package size={22} />,
        title: 'Inventario',
        color: 'var(--accent-green)',
        description: 'Gestión completa de materiales y su stock.',
        features: [
            {
                subtitle: 'Stock Actual', items: [
                    'Lista todos los materiales con su código, unidad y cantidad en stock central.',
                    'Muestra la cantidad total de cada material que está "Asignado a Proyecto" (en uso actual por los proyectos activos).',
                    'Filtra los materiales rápidamente por nombre o código mediante el buscador.',
                    'Crea nuevos materiales fácilmente con el botón "+ Agregar Material".'
                ]
            },
            {
                subtitle: 'Registrar Entrada', items: [
                    'Selecciona un material y registra la cantidad recibida.',
                    'Actualiza automáticamente el stock disponible.',
                    'Puedes agregar una descripción del motivo de la entrada.'
                ]
            },
            {
                subtitle: 'Entrada Bulk', items: [
                    'Permite registrar múltiples entradas de materiales a la vez.',
                    'Agrega filas con material y cantidad, luego envía todo de una vez.'
                ]
            },
            {
                subtitle: 'Historial de Movimientos', items: [
                    'Registro detallado de todas las entradas y salidas de materiales.',
                    'Muestra fecha, material, tipo, cantidad, proyecto y brigada.',
                    'Exporta el historial a Excel (.xlsx) o PDF para reportes.'
                ]
            }
        ]
    },
    {
        icon: <FolderKanban size={22} />,
        title: 'Proyectos',
        color: 'var(--accent-orange)',
        description: 'Gestión de proyectos de trabajo con seguimiento de materiales y brigadas.',
        features: [
            {
                subtitle: 'Crear y Editar Proyecto', items: [
                    'Nombre único (no se permiten duplicados), ubicación, fechas de inicio y fin.',
                    'La fecha de fin no puede ser anterior a la de inicio.',
                    'Puedes editar todos estos detalles usando el botón Editar (lápiz) al lado del título del proyecto.',
                    'Puedes ver la ubicación original en Google Maps con el botón "Ver en Mapa".'
                ]
            },
            {
                subtitle: 'Estados del Proyecto', items: [
                    'Activo: proyecto en ejecución, permite modificaciones.',
                    'Pausado: proyecto detenido temporalmente, requiere motivo obligatorio.',
                    'Completado: proyecto finalizado, bloqueado para modificaciones.',
                    'Cancelado: proyecto descartado.',
                    'Retrasado: indicador automático si la fecha de fin ya pasó y sigue activo.'
                ]
            },
            {
                subtitle: 'Asignar Brigadas', items: [
                    'Asigna brigadas disponibles al proyecto desde la pestaña "Detalle".',
                    'Las brigadas asignadas aparecen como chips con opción de remover.'
                ]
            },
            {
                subtitle: 'Registrar Consumo', items: [
                    'Selecciona brigada y fecha, luego agrega múltiples materiales con cantidades.',
                    'Valida que haya suficiente stock antes de registrar.',
                    'El stock se descuenta automáticamente del inventario.',
                    'Las horas se calculan automáticamente (jornada de 8 AM a 5 PM, 9 horas).'
                ]
            },
            {
                subtitle: 'Consumo de Materiales', items: [
                    'Calcula el consumo promedio por hora de cada material.',
                    'Registra cada material de forma individual por día sin agruparlo con días anteriores para mayor control.',
                    'El total general del proyecto sí agrupa todas las cantidades para facilitar la vista global.'
                ]
            },
            {
                subtitle: 'Historial', items: [
                    'Registro de todos los cambios de estado del proyecto.',
                    'Muestra fecha, estado anterior, estado nuevo y el motivo del cambio.'
                ]
            },
            {
                subtitle: 'Devolución de Materiales', items: [
                    'Permite devolver al almacén central el material sobrante que no se utilizó.',
                    'Solo se pueden devolver materiales que hayan sido registrados previamente como consumo.',
                    'Puedes imprimir o descargar la lista de devoluciones en formato PDF.'
                ]
            },
            {
                subtitle: 'Progreso y Reportes', items: [
                    'Muestra barras de progreso interactivo que indican el avance temporal y el consumo de materiales.',
                    'Incluye un panel de reporte completo exportable a PDF con gráficos circulares y de barras.'
                ]
            }
        ]
    },
    {
        icon: <Users size={22} />,
        title: 'Brigadas',
        color: '#8b5cf6',
        description: 'Gestión de brigadas de trabajo y asignación de personal.',
        features: [
            {
                subtitle: 'Crear Brigada', items: [
                    'Asigna un nombre descriptivo y opcionalmente un encargado.',
                    'La brigada aparece como una tarjeta en el panel principal.'
                ]
            },
            {
                subtitle: 'Gestionar Personal', items: [
                    'Agrega personas a la brigada indicando nombre, cédula y cargo.',
                    'Una persona no puede estar asignada a más de una brigada activa al mismo tiempo.',
                    'Puedes editar la información del personal en cualquier momento (ícono Editar).',
                    'Puedes remover personal de la brigada guardando un motivo de salida.',
                    'Deshabilita o rehabilita personal desde el ícono de edición — al deshabilitar se retira automáticamente de la brigada.',
                    'El personal activo se muestra en la tarjeta de cada brigada.'
                ]
            },
            {
                subtitle: 'Líderes de Brigada', items: [
                    'Asigna o cambia al Líder de la brigada en cualquier momento usando el ícono de Estrella.',
                    'Los líderes aparecerán resaltados en naranja brillante para su fácil identificación visual.'
                ]
            },
            {
                subtitle: 'Control de Asistencia (Nómina)', items: [
                    'Toma lista del personal día a día marcando sus asistencias y ausencias.',
                    'Soporte de medio día: marca asistencia parcial con confirmación e indicador visual en naranja.',
                    'Vista de asistencia global: pase de lista unificado y alfabético de todo el personal activo, sin importar la brigada.',
                    'Visualiza el reporte detallado mensual o semanal y calcula el porcentaje de asistencia de cada empleado.',
                    'Las filas del reporte están colapsadas por defecto — haz clic para expandir el detalle de cada persona.',
                    'Exporta el reporte completo en formato PDF para el control administrativo de la nómina.'
                ]
            }
        ]
    },
    {
        icon: <Hammer size={22} />,
        title: 'Fabricación de Herrajes',
        color: '#ef4444',
        description: 'Control de lotes de fabricación, costos de materiales y análisis de rentabilidad.',
        features: [
            {
                subtitle: 'Catálogo de Materiales', items: [
                    'Define los materiales base utilizados para fabricar herrajes (tubos, planchuelas, barras, etc.).',
                    'Cada material tiene un precio estándar que se usa como referencia al crear lotes.',
                    'Puedes agregar, editar o eliminar materiales del catálogo en cualquier momento.'
                ]
            },
            {
                subtitle: 'Crear Lotes de Fabricación', items: [
                    'Cada lote representa un batch de fabricación (ej: Fabricación A0001).',
                    'El código del lote se genera automáticamente de forma incremental.',
                    'Define la cantidad de herrajes a fabricar y el precio de venta por unidad.',
                    'Los lotes pueden estar activos (en producción) o finalizados.'
                ]
            },
            {
                subtitle: 'Materiales por Lote', items: [
                    'Agrega los materiales utilizados en cada lote desde el catálogo.',
                    'El precio estándar se llena automáticamente pero puedes modificarlo por lote.',
                    'Los materiales ya agregados al lote no aparecen en el selector para evitar duplicados.',
                    'Puedes editar cantidades y precios o eliminar materiales del lote.'
                ]
            },
            {
                subtitle: 'Análisis de Rentabilidad', items: [
                    'Calcula automáticamente el costo total de fabricación sumando todos los materiales.',
                    'Muestra el costo por herraje individual dividiendo el costo total entre la cantidad.',
                    'Calcula la venta total (cantidad × precio de venta unitario).',
                    'Muestra la ganancia (venta total − costo total) y el porcentaje de rentabilidad.',
                    'Los indicadores se actualizan en tiempo real conforme agregas o modificas materiales.'
                ]
            }
        ]
    },
    {
        icon: <BookOpen size={22} />,
        title: 'Notas',
        color: '#f59e0b',
        description: 'Tus apuntes diarios, con posibilidad de adjuntar imágenes y documentos.',
        features: [
            {
                subtitle: 'Creación de Notas', items: [
                    'Agrega notas para registrar incidencias, cambios o reportes.',
                    'Cada nota guarda automáticamente la fecha y hora de creación.'
                ]
            },
            {
                subtitle: 'Archivos Adjuntos', items: [
                    'Puedes subir múltiples imágenes (JPG, PNG) o documentos (PDF, DOCX, XLSX).',
                    'Cada archivo no puede superar los 8MB de peso.',
                    'Da click sobre las imágenes para abrirlas y previsualizarlas en el navegador.'
                ]
            }
        ]
    }
];

export default function Manual() {
    return (
        <div>
            <div className="page-header">
                <div>
                    <h2><BookOpen size={28} style={{ verticalAlign: 'middle', marginRight: 8 }} /> Manual de Uso</h2>
                    <p className="page-header-subtitle">Guía completa para utilizar cada módulo del sistema</p>
                </div>
            </div>

            <div className="manual-layout">

                {/* LEFT — module docs */}
                <div className="manual-main">
                    {sections.map((section, i) => (
                        <div key={i} className="card" style={{ borderLeft: `4px solid ${section.color}` }}>
                            <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 12, marginBottom: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ color: section.color }}>{section.icon}</span>
                                    <h3 style={{ margin: 0 }}>{section.title}</h3>
                                </div>
                            </div>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: 16, fontSize: 14 }}>
                                {section.description}
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {section.features.map((feat, j) => {
                                    if (typeof feat === 'string') {
                                        return (
                                            <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--text-primary)' }}>
                                                <ChevronRight size={14} style={{ marginTop: 2, color: section.color, flexShrink: 0 }} />
                                                <span>{feat}</span>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div key={j}>
                                            <h4 style={{ margin: '0 0 8px 0', fontSize: 14, color: section.color, fontWeight: 600 }}>
                                                {feat.subtitle}
                                            </h4>
                                            {feat.items.map((item, k) => (
                                                <div key={k} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--text-primary)', marginBottom: 6, marginLeft: 8 }}>
                                                    <ChevronRight size={14} style={{ marginTop: 2, color: 'var(--text-muted)', flexShrink: 0 }} />
                                                    <span>{item}</span>
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    <div className="card" style={{ background: 'var(--accent-primary-bg)', borderLeft: '4px solid var(--accent-primary)' }}>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: 15 }}>💡 Consejos Generales</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                <ChevronRight size={14} style={{ marginTop: 2, flexShrink: 0 }} />
                                <span>Todos los datos se actualizan en <strong>tiempo real</strong> — los cambios realizados por otros usuarios se reflejan automáticamente.</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                <ChevronRight size={14} style={{ marginTop: 2, flexShrink: 0 }} />
                                <span>Usa el botón de <strong>Ajustes de Apariencia (engranaje)</strong> abajo a la derecha para cambiar entre modo claro/oscuro y personalizar el color principal del sistema.</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                <ChevronRight size={14} style={{ marginTop: 2, flexShrink: 0 }} />
                                <span>Los proyectos completados o cancelados quedan <strong>bloqueados</strong> para evitar modificaciones accidentales.</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                <ChevronRight size={14} style={{ marginTop: 2, flexShrink: 0 }} />
                                <span>Revisa en el menú la <strong>barra de Almacenamiento</strong> para asegurarte de que tu base de datos (límite 500 MB) tenga espacio suficiente.</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                <ChevronRight size={14} style={{ marginTop: 2, flexShrink: 0 }} />
                                <span>El sistema es <strong>totalmente responsivo</strong> — puedes usarlo desde móvil, tablet o escritorio sin perder funcionalidad.</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT — changelog (sticky) */}
                <div className="manual-changelog">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                        <History size={18} style={{ color: 'var(--text-muted)' }} />
                        <h3 style={{ margin: 0, fontSize: 15 }}>Notas de Actualización</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {changelog.map((release, i) => (
                            <div key={i} className="card" style={{ borderLeft: `4px solid ${release.color}`, padding: '14px 16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                    <span style={{
                                        background: release.color,
                                        color: '#fff',
                                        fontSize: 11,
                                        fontWeight: 700,
                                        padding: '2px 8px',
                                        borderRadius: 4,
                                        letterSpacing: '0.05em'
                                    }}>{release.version}</span>
                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{release.date}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {release.groups.map((group, j) => (
                                        <div key={j}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                                                {group.icon === 'sparkle' && <Zap size={12} style={{ color: release.color }} />}
                                                {group.icon === 'zap' && <Zap size={12} style={{ color: 'var(--accent-orange)' }} />}
                                                {group.icon === 'bug' && <Bug size={12} style={{ color: 'var(--accent-green)' }} />}
                                                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                                    {group.label}
                                                </span>
                                            </div>
                                            {group.items.map((item, k) => (
                                                <div key={k} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontSize: 12, color: 'var(--text-primary)', marginBottom: 4, marginLeft: 3 }}>
                                                    <ChevronRight size={12} style={{ marginTop: 2, color: 'var(--text-muted)', flexShrink: 0 }} />
                                                    <span>{item}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
