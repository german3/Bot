const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dataDir = process.env.DATA_DIR || __dirname;
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.resolve(dataDir, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error al conectar a la base de datos:', err.message);
    } else {
        console.log('Conectado a la base de datos SQLite.');
        inicializarBaseDatos();
    }
});

function inicializarBaseDatos() {
    db.serialize(() => {
        // Tabla de Configuraciones Generales
        db.run(`CREATE TABLE IF NOT EXISTS config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone_number TEXT,
            social_links TEXT,
            telegram_token TEXT,
            telegram_chat_id TEXT
        )`);

        // Insertar configuración inicial vacía si no existe
        db.get(`SELECT COUNT(*) as count FROM config`, (err, row) => {
            if (row.count === 0) {
                db.run(`INSERT INTO config (phone_number, social_links) VALUES ('', '')`);
            }
        });

        // Tabla de Grupos (Facebook y WhatsApp)
        db.run(`CREATE TABLE IF NOT EXISTS groups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            url_or_id TEXT,
            platform TEXT -- 'facebook', 'whatsapp', 'telegram'
        )`);

        // Tabla de Publicaciones
        db.run(`CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            content TEXT,
            image_path TEXT,
            is_active INTEGER DEFAULT 1 -- 1 si se publicará todos los días, 0 si está pausada
        )`);

        // Tabla de Historial (Logs de publicaciones)
        db.run(`CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER,
            platform TEXT,
            status TEXT, -- 'success', 'error'
            message TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    });
}

module.exports = db;
