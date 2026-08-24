-- ============================================
-- CREACIÓN DE LA BASE DE DATOS
-- ============================================

DROP DATABASE IF EXISTS offlineaid_in5bm;
CREATE DATABASE offlineaid_in5bm;
USE offlineaid_in5bm;

-- ============================================
-- TABLA ROLES
-- ============================================

CREATE TABLE Roles (
    id_rol INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(255)
);

-- ============================================
-- TABLA USUARIOS
-- ============================================

CREATE TABLE Usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    id_rol INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    correo VARCHAR(120) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    estado ENUM('ACTIVO','INACTIVO') DEFAULT 'ACTIVO',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (id_rol)
        REFERENCES Roles(id_rol)
);

-- ============================================
-- TABLA TIPOS DE EMERGENCIA
-- ============================================

CREATE TABLE TiposEmergencia (
    id_tipo INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    nivel_prioridad ENUM('BAJA','MEDIA','ALTA','CRITICA') NOT NULL
);

-- ============================================
-- TABLA ESTADOS
-- ============================================

CREATE TABLE EstadosEmergencia (
    id_estado INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);

-- ============================================
-- TABLA EMERGENCIAS
-- ============================================

CREATE TABLE Emergencias (

    id_emergencia INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT NOT NULL,

    id_tipo INT NOT NULL,

    id_estado INT NOT NULL,

    titulo VARCHAR(150) NOT NULL,

    descripcion TEXT NOT NULL,

    latitud DECIMAL(10,7),

    longitud DECIMAL(10,7),

    direccion VARCHAR(255),

    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (id_usuario)
        REFERENCES Usuarios(id_usuario),

    FOREIGN KEY (id_tipo)
        REFERENCES TiposEmergencia(id_tipo),

    FOREIGN KEY (id_estado)
        REFERENCES EstadosEmergencia(id_estado)

);

-- ============================================
-- TABLA EVIDENCIAS
-- ============================================

CREATE TABLE Evidencias (

    id_evidencia INT AUTO_INCREMENT PRIMARY KEY,

    id_emergencia INT NOT NULL,

    url_imagen VARCHAR(500),

    fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (id_emergencia)
        REFERENCES Emergencias(id_emergencia)
        ON DELETE CASCADE

);

-- ============================================
-- TABLA INSTITUCIONES
-- ============================================

CREATE TABLE Instituciones (

    id_institucion INT AUTO_INCREMENT PRIMARY KEY,

    nombre VARCHAR(120) NOT NULL,

    tipo VARCHAR(80),

    telefono VARCHAR(20),

    correo VARCHAR(120),

    direccion VARCHAR(255)

);

-- ============================================
-- TABLA ASIGNACIONES
-- ============================================

CREATE TABLE Asignaciones (

    id_asignacion INT AUTO_INCREMENT PRIMARY KEY,

    id_emergencia INT NOT NULL,

    id_institucion INT NOT NULL,

    estado ENUM(
        'ASIGNADA',
        'EN_PROCESO',
        'FINALIZADA'
    ) DEFAULT 'ASIGNADA',

    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (id_emergencia)
        REFERENCES Emergencias(id_emergencia),

    FOREIGN KEY (id_institucion)
        REFERENCES Instituciones(id_institucion)

);

-- ============================================
-- TABLA NOTIFICACIONES
-- ============================================

CREATE TABLE Notificaciones (

    id_notificacion INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT NOT NULL,

    titulo VARCHAR(150),

    mensaje TEXT,

    leida BOOLEAN DEFAULT FALSE,

    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (id_usuario)
        REFERENCES Usuarios(id_usuario)

);

-- ============================================
-- TABLA DISPOSITIVOS
-- ============================================

CREATE TABLE Dispositivos (

    id_dispositivo INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT NOT NULL,

    modelo VARCHAR(100),

    sistema_operativo VARCHAR(100),

    token_push VARCHAR(300),

    ultima_conexion TIMESTAMP NULL,

    FOREIGN KEY (id_usuario)
        REFERENCES Usuarios(id_usuario)

);

-- ============================================
-- TABLA COLA OFFLINE
-- ============================================

CREATE TABLE ColaOffline (

    id_cola INT AUTO_INCREMENT PRIMARY KEY,

    id_usuario INT NOT NULL,

    tipo_operacion ENUM(
        'CREAR_EMERGENCIA',
        'ACTUALIZAR_EMERGENCIA',
        'SUBIR_EVIDENCIA',
        'ACTUALIZAR_UBICACION'
    ),

    payload_json JSON NOT NULL,

    estado_sync ENUM(
        'PENDIENTE',
        'SINCRONIZADO',
        'ERROR'
    ) DEFAULT 'PENDIENTE',

    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    fecha_sync TIMESTAMP NULL,

    FOREIGN KEY (id_usuario)
        REFERENCES Usuarios(id_usuario)

);

-- ============================================
-- TABLA HISTORIAL DE SINCRONIZACIÓN
-- ============================================

CREATE TABLE HistorialSincronizacion (

    id_historial INT AUTO_INCREMENT PRIMARY KEY,

    id_cola INT NOT NULL,

    resultado ENUM(
        'EXITOSO',
        'ERROR'
    ),

    mensaje_error TEXT,

    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (id_cola)
        REFERENCES ColaOffline(id_cola)
        ON DELETE CASCADE

);