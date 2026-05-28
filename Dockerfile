FROM node:18-bullseye-slim

# Instalar dependencias para Chromium y compilación de módulos nativos (g++, make, python3)
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    build-essential \
    python3 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Configurar variable de entorno para que Puppeteer use Chromium del sistema
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install && npm rebuild sqlite3 --build-from-source

COPY . .

# Exponer el puerto
EXPOSE 3000

CMD [ "npm", "start" ]
