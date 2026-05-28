const cron = require('node-cron');
const db = require('./database');
const path = require('path');
const telegramBot = require('./bots/telegram');
const whatsappBot = require('./bots/whatsapp');
const facebookBot = require('./bots/facebook');

// Definir los grupos estáticos por ahora (se pueden mover a BD luego)
const WHATSAPP_GROUPS = [
    // ID del grupo en WhatsApp (termina en @g.us)
    // '1234567890-123456@g.us' 
];

const TELEGRAM_CHANNELS = [
    // Se tomará de la base de datos
];

const FACEBOOK_GROUPS = [
    // URLs de grupos de Facebook
    // 'https://www.facebook.com/groups/ventasbogota'
];

/**
 * Función principal que orquesta todas las publicaciones
 */
async function runDailyPublishing() {
    console.log('⏰ [7:00 AM] Iniciando tarea de publicación programada...');

    db.get(`SELECT * FROM config LIMIT 1`, [], async (err, config) => {
        if (err || !config) {
            console.error('❌ No se encontró configuración.');
            return;
        }

        // Obtener publicaciones activas
        db.all(`SELECT * FROM posts WHERE is_active = 1`, [], async (err, posts) => {
            if (err) {
                console.error('❌ Error obteniendo publicaciones de la BD.');
                return;
            }

            if (posts.length === 0) {
                console.log('ℹ️ No hay publicaciones activas programadas.');
                return;
            }

            const footer = `\n\nContacto: ${config.phone_number || ''}\n${config.social_links || ''}`;
            const telegramChatId = config.telegram_chat_id;

            for (const post of posts) {
                const fullMessage = post.content + footer;
                let imageAbsPath = null;
                
                if (post.image_path) {
                    if (process.env.DATA_DIR) {
                        imageAbsPath = path.join(process.env.DATA_DIR, post.image_path.replace(/^\/?uploads\//, 'uploads/'));
                    } else {
                        imageAbsPath = path.join(__dirname, 'public', post.image_path);
                    }
                }

                console.log(`\n🚀 Procesando Post ID: ${post.id}`);

                let profilesPublished = 0;
                const MAX_PROFILES = 5;

                // --- 1. TELEGRAM ---
                if (telegramChatId) {
                    if (profilesPublished < MAX_PROFILES) {
                        console.log('Enviando a Telegram...');
                        await telegramBot.sendMessage(telegramChatId, fullMessage, imageAbsPath);
                        profilesPublished++;
                    } else {
                        console.log('Límite de perfiles alcanzado. Saltando Telegram.');
                    }
                } else {
                    console.log('Saltando Telegram (No hay Chat ID configurado).');
                }

                // --- 2. WHATSAPP ---
                if (WHATSAPP_GROUPS.length > 0) {
                    console.log('Enviando a WhatsApp...');
                    for (const groupId of WHATSAPP_GROUPS) {
                        if (profilesPublished >= MAX_PROFILES) {
                            console.log('Límite de perfiles alcanzado para WhatsApp.');
                            break;
                        }
                        await whatsappBot.sendMessage(groupId, fullMessage);
                        profilesPublished++;
                        // Breve pausa para no hacer spam rápido
                        await new Promise(r => setTimeout(r, 2000));
                    }
                } else {
                    console.log('Saltando WhatsApp (No hay grupos configurados).');
                }

                // --- 3. FACEBOOK ---
                if (FACEBOOK_GROUPS.length > 0) {
                    if (profilesPublished < MAX_PROFILES) {
                        console.log('Iniciando proceso de Facebook...');
                        const availableSlots = MAX_PROFILES - profilesPublished;
                        const facebookGroupsToPublish = FACEBOOK_GROUPS.slice(0, availableSlots);
                        await facebookBot.publishToFacebook(fullMessage, imageAbsPath, facebookGroupsToPublish);
                        profilesPublished += facebookGroupsToPublish.length;
                    } else {
                        console.log('Límite de perfiles alcanzado. Saltando Facebook.');
                    }
                } else {
                    console.log('Saltando Facebook (No hay grupos configurados).');
                }

                console.log(`✅ Post ID: ${post.id} procesado.`);
            }

            console.log('\n🎉 Tarea de publicación diaria finalizada.');
        });
    });
}

// Programar para las 7:00 AM todos los días (Hora local del servidor)
// '0 7 * * *' significa: Minuto 0, Hora 7, Cualquier día del mes, mes, día de semana
cron.schedule('0 7 * * *', () => {
    runDailyPublishing();
});

console.log('📅 CronJob programado: Las publicaciones saldrán todos los días a las 07:00 AM.');

// Exportar para poder forzar una ejecución manual si es necesario
module.exports = {
    runDailyPublishing
};
