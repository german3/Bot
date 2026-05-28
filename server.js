const express = require('express');
const path = require('path');
const multer = require('multer');
const db = require('./database');
const fs = require('fs');
const whatsappBot = require('./bots/whatsapp');
const telegramBot = require('./bots/telegram');
const scheduler = require('./scheduler'); // Inicia el cron job a las 7 AM

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de Multer para subida de imágenes
const uploadDir = process.env.DATA_DIR ? path.join(process.env.DATA_DIR, 'uploads') : path.join(__dirname, 'public', 'uploads');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Configuración de Express
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
if (process.env.DATA_DIR) {
    app.use('/uploads', express.static(path.join(process.env.DATA_DIR, 'uploads')));
}
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- Rutas del Panel Web ---

// Inicio / Dashboard
app.get('/', (req, res) => {
    db.all(`SELECT * FROM posts ORDER BY id DESC`, [], (err, posts) => {
        if (err) return res.status(500).send("Error en BD");
        db.get(`SELECT * FROM config LIMIT 1`, [], (err, config) => {
            res.render('index', { posts: posts, config: config || {} });
        });
    });
});

// Guardar Configuración (Redes, Número)
app.post('/config', (req, res) => {
    const { phoneNumber, socialLinks, telegramToken, telegramChatId } = req.body;
    db.run(`UPDATE config SET phone_number = ?, social_links = ?, telegram_token = ?, telegram_chat_id = ? WHERE id = 1`, 
        [phoneNumber, socialLinks, telegramToken, telegramChatId], (err) => {
        if (err) console.error(err);
        res.redirect('/');
    });
});

// Crear nueva publicación
app.post('/posts', upload.single('image'), (req, res) => {
    const { content } = req.body;
    const imagePath = req.file ? '/uploads/' + req.file.filename : null;

    db.run(`INSERT INTO posts (content, image_path) VALUES (?, ?)`, [content, imagePath], (err) => {
        if (err) console.error(err);
        res.redirect('/');
    });
});

// Eliminar publicación
app.post('/posts/delete/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM posts WHERE id = ?`, [id], (err) => {
        if (err) console.error(err);
        res.redirect('/');
    });
});

// Vista de Conexión de WhatsApp
app.get('/whatsapp', (req, res) => {
    res.render('whatsapp');
});

// API para obtener el estado de WhatsApp (QR y Conexión)
app.get('/api/whatsapp/status', (req, res) => {
    const status = whatsappBot.getStatus();
    res.json({ 
        status: status.connected ? 'connected' : (status.qr ? 'qr_ready' : 'pending'), 
        qr: status.qr 
    }); 
});

// Inicializar configuraciones al arrancar
db.get(`SELECT * FROM config LIMIT 1`, [], (err, config) => {
    if (config && config.telegram_token) {
        telegramBot.initBot(config.telegram_token);
    }
});

// Forzar publicación manual
app.post('/api/force-publish', (req, res) => {
    scheduler.runDailyPublishing();
    res.json({ success: true, message: 'Publicación forzada iniciada. Revisa la consola para ver el progreso.' });
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`🚀 Panel de Control ejecutándose en http://localhost:${PORT}`);
});
