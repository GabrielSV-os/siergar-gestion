import { BookOpen, Package, FolderKanban, Users, LayoutDashboard, ChevronRight, Hammer } from 'lucide-react';

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
                    'Visualiza el reporte detallado mensual o semanal y calcúlales el porcentaje de asistencia general.',
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 900 }}>
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
                    </div>
                </div>
            </div>
        </div>
    );
}
