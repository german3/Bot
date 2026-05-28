const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

let bot = null;

/**
 * Inicializa el bot de Telegram con el token guardado en la base de datos
 * @param {string} token 
 */
function initBot(token) {
    if (!token) return;
    try {
        bot = new TelegramBot(token, { polling: false });
        console.log('✅ Bot de Telegram inicializado.');
    } catch (error) {
        console.error('❌ Error inicializando bot de Telegram:', error);
    }
}

/**
 * Envia un mensaje y opcionalmente una foto al canal/chat configurado
 * @param {string} chatId 
 * @param {string} message 
 * @param {string} imagePath (Ruta local de la imagen)
 */
async function sendMessage(chatId, message, imagePath = null) {
    if (!bot) {
        console.log('⚠️ Bot de Telegram no inicializado (Falta token en configuración).');
        return false;
    }
    if (!chatId) {
        console.log('⚠️ No hay Chat ID configurado para Telegram.');
        return false;
    }

    try {
        if (imagePath && fs.existsSync(imagePath)) {
            // Enviar Foto + Texto (Caption)
            await bot.sendPhoto(chatId, imagePath, { caption: message });
            console.log(`✅ Foto enviada a Telegram (${chatId})`);
        } else {
            // Enviar solo texto
            await bot.sendMessage(chatId, message);
            console.log(`✅ Mensaje enviado a Telegram (${chatId})`);
        }
        return true;
    } catch (error) {
        console.error(`❌ Error enviando mensaje a Telegram (${chatId}):`, error.message);
        return false;
    }
}

module.exports = {
    initBot,
    sendMessage
};
