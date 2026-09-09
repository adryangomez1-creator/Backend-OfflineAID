import { pool } from './database.js';

export async function poblarDatosIniciales() {
  console.log('Verificando y poblando datos iniciales para OfflineAid...');

  // 1. Tipos de Emergencia iniciales
  const [tiposExistentes] = await pool.query('SELECT COUNT(*) as total FROM TiposEmergencia') as any;
  if (tiposExistentes[0].total === 0) {
    const tipos = [
      ['Accidente de Tránsito', 'Colisión o percance vial de vehículos o peatones', 'ALTA'],
      ['Desastre Natural / Terremoto', 'Sismo, terremoto o colapso estructural', 'CRITICA'],
      ['Inundación / Deslave', 'Crecida de ríos, inundaciones o deslizamiento de tierra', 'CRITICA'],
      ['Incendio Estructural / Forestal', 'Fuego en viviendas, comercios o áreas boscosas', 'ALTA'],
      ['Emergencia Médica Grave', 'Paro cardíaco, heridas graves, asfixia o pérdida del conocimiento', 'CRITICA'],
      ['Emergencia Médica Menor', 'Contusiones leves, caídas o heridas sin riesgo vital inmediato', 'MEDIA'],
      ['Falla Eléctrica / Apagón Masivo', 'Corte prolongado de energía en comunidades', 'BAJA'],
      ['Búsqueda y Rescate', 'Personas extraviadas en áreas remotas o rurales', 'ALTA'],
    ];

    for (const tipo of tipos) {
      await pool.query(
        'INSERT INTO TiposEmergencia (nombre, descripcion, nivel_prioridad) VALUES (?, ?, ?)',
        tipo
      );
    }
    console.log(`✓ ${tipos.length} tipos de emergencia insertados.`);
  }

  // 2. Instituciones de Socorro iniciales
  const [instExistentes] = await pool.query('SELECT COUNT(*) as total FROM Instituciones') as any;
  if (instExistentes[0].total === 0) {
    const instituciones = [
      ['Bomberos Voluntarios', 'Cuerpo de Bomberos y Rescate', '122', 'emergencias@bomberosvoluntarios.org', 'Estación Central, Zona 3'],
      ['Bomberos Municipales', 'Atención de emergencias prehospitalarias y contra incendios', '123', 'contacto@bomberosmunicipales.gob', 'Bulevar Liberación, Zona 12'],
      ['Cruz Roja', 'Atención médica humanitaria y ambulancias', '125', 'info@cruzroja.org', '3a Calle 8-40 Zona 1'],
      ['CONRED', 'Coordinadora Nacional para la Reducción de Desastres', '119', 'alertas@conred.gob', 'Avenida Hincapié 21-72 Zona 13'],
      ['Policía Nacional Civil', 'Seguridad ciudadana y orden público', '110', 'denuncias@pnc.gob', '10a Calle 13-92 Zona 1'],
    ];

    for (const inst of instituciones) {
      await pool.query(
        'INSERT INTO Instituciones (nombre, tipo, telefono, correo, direccion) VALUES (?, ?, ?, ?, ?)',
        inst
      );
    }
    console.log(`✓ ${instituciones.length} instituciones de socorro insertadas.`);
  }

  // 3. Usuarios iniciales (Admin, Operador, Ciudadano)
  const [usuariosExistentes] = await pool.query('SELECT COUNT(*) as total FROM Usuarios') as any;
  if (usuariosExistentes[0].total === 0) {
    const usuarios = [
      ['Admin', 'Sistema', '55550001', 'admin@offlineaid.com', 'admin123', 'ADMIN', 'ACTIVO', null, 'Web Console', 'Linux'],
      ['Operador', 'Centro de Despacho', '55550002', 'operador@offlineaid.com', 'operador123', 'OPERADOR', 'ACTIVO', null, 'Web Console', 'Windows'],
      ['Carlos', 'Mendoza', '55551234', 'carlos.mendoza@email.com', 'carlos123', 'CIUDADANO', 'ACTIVO', 'push-token-carlos-001', 'Samsung Galaxy A32', 'Android 13'],
      ['María', 'González', '55554321', 'maria.gonzalez@email.com', 'maria123', 'CIUDADANO', 'ACTIVO', 'push-token-maria-002', 'Xiaomi Redmi Note 11', 'Android 12'],
    ];

    for (const usu of usuarios) {
      await pool.query(
        `INSERT INTO Usuarios (nombre, apellido, telefono, correo, password, rol, estado, token_push, modelo_dispositivo, sistema_operativo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        usu
      );
    }
    console.log(`✓ ${usuarios.length} usuarios de prueba insertados.`);
  }

  console.log('Población de datos iniciales completada con éxito.');
}

if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  poblarDatosIniciales()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error al poblar datos iniciales:', err);
      process.exit(1);
    });
}
