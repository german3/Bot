const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * Publicar en Facebook usando automatización del navegador
 * ADVERTENCIA: Esta técnica es frágil y sujeta a cambios en el DOM de Facebook.
 * 
 * @param {string} content El texto de la publicación
 * @param {string} imagePath Ruta absoluta a la imagen
 * @param {Array} groups Array de URLs de grupos
 */
async function publishToFacebook(content, imagePath, groups) {
    console.log('🤖 Iniciando automatización de Facebook...');
    
    // Configuración para usar un perfil existente de Chrome y no loguearse cada vez
    // En producción se recomienda usar cookies guardadas o un perfil específico
    const userDataDir = path.resolve(__dirname, '../.fb_profile');
    
    const browser = await puppeteer.launch({
        headless: false, // En false para ver qué hace. Poner en "new" para fondo oculto
        userDataDir: userDataDir,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-notifications']
    });

    const page = await browser.newPage();
    
    // Configurar viewport realista
    await page.setViewport({ width: 1280, height: 800 });
    
    try {
        console.log('Navegando a Facebook...');
        await page.goto('https://www.facebook.com/', { waitUntil: 'networkidle2' });

        // Verificar si estamos logueados buscando el input de email
        const isLoginForm = await page.$('#email');
        if (isLoginForm) {
            console.log('⚠️ Facebook requiere inicio de sesión. Por favor, loguéate manualmente en el navegador abierto.');
            console.log('Esperando a que el inicio de sesión se complete (tienes 60 segundos)...');
            // Esperar a que un elemento típico de la página de inicio aparezca
            await page.waitForSelector('[role="navigation"]', { timeout: 60000 });
            console.log('✅ Inicio de sesión detectado.');
        } else {
            console.log('✅ Ya estamos logueados en Facebook.');
        }

        // Iterar sobre los grupos
        for (const groupUrl of groups) {
            console.log(`Navegando al grupo: ${groupUrl}`);
            try {
                await page.goto(groupUrl, { waitUntil: 'networkidle2' });
                
                // 1. Encontrar el botón "Escribe algo..."
                console.log('Buscando el campo de publicación...');
                // Los selectores de Facebook son dinámicos, usaremos XPath o textos comunes
                const postBoxSelector = `xpath///div[contains(@class, 'x1i10hfl') and contains(string(), 'Escribe algo')]`;
                const postBox = await page.waitForSelector(postBoxSelector, { timeout: 10000 });
                await postBox.click();
                
                // Esperar a que se abra el modal
                await new Promise(r => setTimeout(r, 2000));

                // 2. Escribir el contenido
                console.log('Escribiendo contenido...');
                // Encontrar el editor de texto (contenteditable)
                const editorSelector = `xpath///div[@role='textbox' and @contenteditable='true']`;
                const editor = await page.waitForSelector(editorSelector, { timeout: 10000 });
                await editor.type(content, { delay: 50 }); // Escribir como humano

                // 3. Subir Imagen (si hay)
                if (imagePath && fs.existsSync(imagePath)) {
                    console.log('Subiendo imagen...');
                    // Buscar input file. Es un input hidden que acepta imágenes.
                    const fileInputSelector = 'input[type="file"][accept*="image"]';
                    // Subir archivo al input file
                    const fileInput = await page.$(fileInputSelector);
                    if (fileInput) {
                        await fileInput.uploadFile(imagePath);
                        console.log('Imagen adjuntada. Esperando a que cargue...');
                        await new Promise(r => setTimeout(r, 5000)); // Esperar carga de imagen
                    } else {
                        console.log('⚠️ No se encontró el botón para subir imagen.');
                    }
                }

                // 4. Clic en "Publicar"
                console.log('Haciendo clic en Publicar...');
                const publishBtnSelector = `xpath///div[@role='button' and contains(., 'Publicar') and not(@aria-disabled='true')]`;
                const publishBtn = await page.waitForSelector(publishBtnSelector, { timeout: 10000 });
                await publishBtn.click();
                
                // Esperar a que se publique
                console.log('Esperando a que la publicación termine...');
                await new Promise(r => setTimeout(r, 8000));
                console.log(`✅ Publicado exitosamente en: ${groupUrl}`);

            } catch (groupError) {
                console.error(`❌ Error publicando en el grupo ${groupUrl}:`, groupError.message);
                // Si falla en uno, continuar con el siguiente
            }
        }
        
    } catch (error) {
        console.error('❌ Error general en la automatización de Facebook:', error);
    } finally {
        console.log('Cerrando navegador...');
        await browser.close();
    }
}

module.exports = {
    publishToFacebook
};
