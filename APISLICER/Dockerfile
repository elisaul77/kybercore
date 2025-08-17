FROM ubuntu:22.04

# Evitar prompts interactivos durante la instalación
ENV DEBIAN_FRONTEND=noninteractive

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    wget \
    xvfb \
    libgtk-3-0 \
    libglu1-mesa \
    libgl1-mesa-glx \
    libegl1-mesa \
    libxrandr2 \
    libxss1 \
    libxcursor1 \
    libxcomposite1 \
    libasound2 \
    libxi6 \
    libxtst6 \
    libfuse2 \
    && rm -rf /var/lib/apt/lists/*

# Crear directorio de trabajo
WORKDIR /app

# Copiar y instalar dependencias de Python
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# Descargar e instalar PrusaSlicer AppImage
RUN wget -O /opt/PrusaSlicer.AppImage \
    "https://github.com/prusa3d/PrusaSlicer/releases/download/version_2.8.1/PrusaSlicer-2.8.1+linux-x64-newer-distros-GTK3-202409181416.AppImage" \
    && chmod +x /opt/PrusaSlicer.AppImage \
    && ln -s /opt/PrusaSlicer.AppImage /usr/local/bin/prusa-slicer

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