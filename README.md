# 🎮 Game Time Tracker — HUD Edition

Tracker de sesiones de videojuegos con temporizador, registro de tiempo real y notas por segmento. Diseño estilo HUD gamer.

## 🚀 Deploy en GitHub Pages

1. Sube esta carpeta a un repositorio en GitHub
2. Ve a **Settings → Pages**
3. En "Source" selecciona: **Branch: main / root**
4. Listo — tu URL será: `https://tuusuario.github.io/nombre-repo/`

## 📁 Estructura del proyecto

```
├── index.html          ← App principal
├── css/
│   └── style.css       ← Estilos HUD
├── js/
│   ├── tracker.js      ← Lógica del tracker
│   └── select.js       ← Pantalla de selección
└── data/
    ├── games.json      ← Catálogo de juegos
    └── tlou1.json      ← Datos de TLOU Part I
```

---

## ➕ Agregar un nuevo juego

### Paso 1 — Crea el archivo JSON del juego

Crea `data/nombre-del-juego.json` siguiendo este formato:

```json
{
  "id": "mi-juego",
  "title": "NOMBRE DEL JUEGO",
  "platform": "PS5",
  "totalEstMin": 720,
  "chapters": [
    {
      "id": 0,
      "name": "CAPÍTULO 1",
      "subtitle": "Descripción del capítulo",
      "segments": [
        { "id": "c1s1", "name": "Nombre del segmento", "est": 25 },
        { "id": "c1s2", "name": "Otro segmento", "est": 30 }
      ]
    },
    {
      "id": 1,
      "name": "CAPÍTULO 2",
      "subtitle": "Otra sección",
      "segments": [
        { "id": "c2s1", "name": "Segmento", "est": 20 }
      ]
    }
  ]
}
```

**Campos importantes:**
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | string | Identificador único (sin espacios) |
| `title` | string | Nombre completo del juego |
| `platform` | string | PS5, PC, Xbox, etc. |
| `totalEstMin` | number | Total estimado en minutos |
| `est` | number | Minutos estimados por segmento |

### Paso 2 — Registra el juego en el catálogo

Abre `data/games.json` y agrega una entrada:

```json
[
  {
    "id": "tlou1",
    "title": "The Last of Us Part I",
    "platform": "PS5",
    "file": "data/tlou1.json",
    "coverColor": "#1a8a35",
    "totalEstMin": 900
  },
  {
    "id": "mi-juego",
    "title": "Nombre del Juego",
    "platform": "PS5",
    "file": "data/mi-juego.json",
    "coverColor": "#1a3a8a",
    "totalEstMin": 720
  }
]
```

### Paso 3 — Sube los cambios a GitHub

```bash
git add .
git commit -m "Agrego nuevo juego: Nombre"
git push
```

¡Listo! El juego aparecerá en la pantalla de selección automáticamente.

---

## 💾 Datos guardados

El progreso se guarda en **localStorage** del navegador por juego (`tracker_[id]`). No se pierde al cerrar. Se borra si limpias el caché del navegador.

---

## 🧩 Funciones

- **Temporizador de sesión** con alerta visual al 70% y 90% del tiempo
- **Marcar segmentos** como completados con tiempo real registrado
- **Notas por segmento** (tips, ubicaciones, bosses)
- **Estimado restante** ajustado con tus tiempos reales
- **Log de sesiones** por capítulo con hora y duración
- **Progreso visual** por capítulo y global
