-- Este script eliminará todos los registros de la base de datos, 
-- pero conservará el catálogo de materiales, poniendo en 0 su inventario.

-- 1. Eliminar datos de tablas dependientes primero (para evitar errores de clave foránea)
DELETE FROM proyecto_historial;
DELETE FROM proyecto_inventario;
DELETE FROM proyecto_devolucion;
DELETE FROM proyecto_gastos;
DELETE FROM consumo_materiales;
DELETE FROM movimientos_inventario;
DELETE FROM brigada_personal;
DELETE FROM nota_attachments;

-- 2. Eliminar entidades principales
DELETE FROM notas;
DELETE FROM proyectos;
DELETE FROM brigadas;

-- 3. Reiniciar el inventario a 0 (conservando la lista de materiales)
UPDATE inventario SET cantidad = 0;
