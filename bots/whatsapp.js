const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path = require('path');

const sessionsPath = process.env.DATA_DIR ? path.join(process.env.DATA_DIR, 'sessions') : './sessions';

const puppeteerOptions = {
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
};

if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    puppeteerOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
}

// Usamos LocalAuth para que la sesión se guarde en disco y no haya que escanear siempre
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: sessionsPath }),
    puppeteer: puppeteerOptions
});

let qrCodeData = null;
let isConnected = false;

client.on('qr', (qr) => {
    // Genera el código QR en la terminal de Node (útil para ver en consola)
    qrcode.generate(qr, { small: true });
    qrCodeData = qr; // Guardamos el QR para poder enviarlo a la UI web si lo piden
    console.log('📌 Nuevo código QR de WhatsApp generado.');
});

client.on('ready', () => {
    isConnected = true;
    qrCodeData = null;
    console.log('✅ Cliente de WhatsApp Web está listo y conectado!');
});

client.on('authenticated', () => {
    console.log('✅ Autenticado en WhatsApp correctamente.');
});

client.on('auth_failure', msg => {
    console.error('❌ Error de autenticación en WhatsApp:', msg);
});

client.on('disconnected', (reason) => {
    console.log('⚠️ Cliente de WhatsApp desconectado:', reason);
    isConnected = false;
    // Si se desconecta (ej. cerraron sesión desde el teléfono), reiniciamos el cliente
    client.initialize();
});

// Inicializamos el cliente al cargar el archivo
client.initialize();

/**
 * Función para enviar un mensaje a un grupo o chat
 * @param {string} chatId ID del chat (ej: '1234567890@c.us' para número, o '1234567890-123@g.us' para grupo)
 * @param {string} message Texto del mensaje
 */
async function sendMessage(chatId, message) {
    if (!isConnected) {
        console.log('⚠️ No se puede enviar mensaje, WhatsApp no está conectado.');
        return false;
    }
    
    try {
        await client.sendMessage(chatId, message);
        console.log(`✅ Mensaje enviado a WhatsApp (${chatId})`);
        return true;
    } catch (error) {
        console.error(`❌ Error enviando mensaje a WhatsApp (${chatId}):`, error);
        return false;
    }
}

/**
 * Obtener estado actual (Para el frontend)
 */
function getStatus() {
    return {
        connected: isConnected,
        qr: qrCodeData
    };
}

module.exports = {
    client,
    sendMessage,
    getStatus
};
