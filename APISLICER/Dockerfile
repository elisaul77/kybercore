FROM ubuntu:24.04

# Evitar prompts interactivos durante la instalación
ENV DEBIAN_FRONTEND=noninteractive

# Instalar dependencias del sistema (nombres actualizados para Ubuntu 24.04)
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    wget \
    xvfb \
    libgtk-3-0 \
    libglu1-mesa \
    libgl1-mesa-dri \
    libegl1 \
    libxrandr2 \
    libxss1 \
    libxcursor1 \
    libxcomposite1 \
    libasound2t64 \
    libxi6 \
    libxtst6 \
    libfuse2t64 \
    # WebKit / GUI dependencies necesarias para el binario extraído
    libwebkit2gtk-4.1-0 \
    libgstreamer1.0-0 \
    libgstreamer-plugins-base1.0-0 \
    libgtk-4-1 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libpango-1.0-0 \
    libgdk-pixbuf-2.0-0 \
    libnotify4 \
    libsecret-1-0 \
    && rm -rf /var/lib/apt/lists/*

# Crear directorio de trabajo
WORKDIR /app

# Copiar y instalar dependencias de Python
COPY requirements.txt .
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

# Descargar e instalar PrusaSlicer AppImage y extraer su contenido para evitar FUSE
RUN wget -O /opt/PrusaSlicer.AppImage \
    "https://github.com/prusa3d/PrusaSlicer/releases/download/version_2.8.1/PrusaSlicer-2.8.1+linux-x64-newer-distros-GTK3-202409181416.AppImage" \
    && chmod +x /opt/PrusaSlicer.AppImage \
    # Extraer AppImage (evita dependencia de /dev/fuse en tiempo de ejecución)
    && /opt/PrusaSlicer.AppImage --appimage-extract \
    && mv squashfs-root /opt/prusaslicer-root \
    # Crear un wrapper en /usr/local/bin que invoque el binario extraído
    && printf '%s\n' "#!/bin/sh" "exec /opt/prusaslicer-root/usr/bin/prusa-slicer \"\$@\"" > /usr/local/bin/prusa-slicer \
    && chmod +x /usr/local/bin/prusa-slicer \
    && rm -f /opt/PrusaSlicer.AppImage

# Crear directorios necesarios
RUN mkdir -p /app/uploads /app/output /app/config/printer_configs

# Copiar configuraciones y aplicación
COPY config/ /app/config/
COPY app/ /app/

# AppImage permisos ya configurados arriba

# Exponer puerto
EXPOSE 8000

# Variables de entorno para headless
ENV DISPLAY=:99
ENV PYTHONPATH=/app

# Comando de inicio
CMD ["sh", "-c", "Xvfb :99 -screen 0 1024x768x24 & python3 main.py"]