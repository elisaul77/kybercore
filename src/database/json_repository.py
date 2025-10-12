"""Repositorio genérico para persistencia basada en archivos JSON.

Proporciona utilidades comunes para cargar y guardar datos con metadata,
controlando concurrencia básica y rutas relativas al proyecto.
"""

from __future__ import annotations

import json
import threading
from pathlib import Path
from typing import Any, Dict, Optional

from datetime import datetime


class JSONRepositoryError(RuntimeError):
    """Error base para operaciones de repositorios JSON."""


class BaseJSONRepository:
    """Repositorio base para manejar archivos JSON con metadata y datos."""

    def __init__(
        self,
        filename: str,
        data_key: str,
        metadata_key: str = "metadata",
        base_path: Optional[Path] = None,
    ) -> None:
        self._lock = threading.RLock()
        self._data_key = data_key
        self._metadata_key = metadata_key
        self._file_path = self._resolve_path(filename, base_path)

        # Inicializar el archivo si no existe
        if not self._file_path.exists():
            self._initialize_file()

    @staticmethod
    def _resolve_path(filename: str, base_path: Optional[Path]) -> Path:
        """Resuelve la ruta absoluta del archivo JSON."""
        if base_path is None:
            base = Path(__file__).resolve().parents[2]  # proyecto raíz
            base_path = base / "base_datos"
        return (base_path / filename).resolve()

    def _initialize_file(self) -> None:
        """Crea un archivo JSON vacío con metadata mínima."""
        initial_payload = {
            self._metadata_key: {
                "version": "1.0",
                "last_updated": datetime.utcnow().isoformat(),
            },
            self._data_key: [],
        }
        self._file_path.parent.mkdir(parents=True, exist_ok=True)
        self._write_json(initial_payload)

    def _read_json(self) -> Dict[str, Any]:
        try:
            with self._file_path.open("r", encoding="utf-8") as fh:
                return json.load(fh)
        except FileNotFoundError as exc:
            raise JSONRepositoryError(f"Archivo no encontrado: {self._file_path}") from exc
        except json.JSONDecodeError as exc:
            raise JSONRepositoryError(
                f"Archivo JSON corrupto en {self._file_path}: {exc.msg}"
            ) from exc

    def _write_json(self, payload: Dict[str, Any]) -> None:
        with self._file_path.open("w", encoding="utf-8") as fh:
            json.dump(payload, fh, indent=2, ensure_ascii=False)

    def load(self) -> Dict[str, Any]:
        """Carga el contenido completo del archivo."""
        with self._lock:
            return self._read_json()

    def save(self, data: Dict[str, Any], metadata: Optional[Dict[str, Any]] = None) -> None:
        """Guarda los datos y actualiza metadata opcional."""
        with self._lock:
            payload = self._read_json()
            payload[self._data_key] = data
            if metadata is not None:
                payload[self._metadata_key].update(metadata)
            payload[self._metadata_key]["last_updated"] = datetime.utcnow().isoformat()
            self._write_json(payload)

    def update_payload(self, updater) -> Dict[str, Any]:
        """Aplica una función de actualización atómica al payload."""
        with self._lock:
            payload = self._read_json()
            new_payload = updater(payload)
            if self._metadata_key in new_payload:
                new_payload[self._metadata_key]["last_updated"] = datetime.utcnow().isoformat()
            else:
                metadata = payload.get(self._metadata_key, {})
                metadata["last_updated"] = datetime.utcnow().isoformat()
                new_payload[self._metadata_key] = metadata
            self._write_json(new_payload)
            return new_payload

    @property
    def file_path(self) -> Path:
        return self._file_path
