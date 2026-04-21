# Molina Dashboard 🚀

Un dashboard universitario moderno, rápido y profesional construido con React 19, Vite, Tailwind CSS 4 y Supabase.

## ✨ Características

- **Diseño Moderno & Premium**: Interfaz limpia con modo oscuro nativo, efectos de glassmorphism y animaciones suaves.
- **Iconografía Profesional**: Migración total de emojis a iconos vectoriales con `lucide-react`.
- **Chat con IA Avanzada**: Integración con Gemini y Groq (Llama 3) para asistencia académica con cambio automático de proveedor ante límites de tasa.
- **Gestión Académica**: Control de semestres, materias, horarios, notas y tareas.
- **Scrollbar Personalizada**: Diseñada específicamente para armonizar con el modo oscuro.

## 🛠️ Tecnologías

- **Frontend**: React 19, TypeScript, Vite.
- **Estilos**: Tailwind CSS 4 (Beta).
- **Backend**: Supabase (Database, Auth, Storage).
- **IA**: Google Gemini API & Groq API.
- **Iconos**: Lucide React.
- **Markdown**: React Markdown.

## 🚀 Despliegue en Vercel

1. Sube el código a tu repositorio de GitHub.
2. En el panel de Vercel, importa el proyecto.
3. **IMPORTANTE**: Configura las siguientes Variables de Entorno en Vercel:
   - `VITE_SUPABASE_URL`: URL de tu proyecto Supabase.
   - `VITE_SUPABASE_ANON_KEY`: Key anónima de tu proyecto Supabase.
   - `VITE_GEMINI_API_KEY`: Tu API Key de Google AI Studio.
   - `VITE_GROQ_API_KEY`: Tu API Key de Groq.

## 🗄️ Base de Datos

Para que la aplicación funcione, debes inicializar tu base de datos en Supabase.
1. Ve al **SQL Editor** en tu dashboard de Supabase.
2. Copia el contenido del archivo `supabase-schema.sql` de este repositorio.
3. Pégalo y ejecuta el script (Run). Esto creará las tablas necesarias y las políticas de seguridad (RLS).

## 📦 Instalación Local

```bash
# Clonar el repositorio
git clone https://github.com/ElMelechorino/molina-dashboard.git

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

---
Diseñado y desarrollado por Santiago Molina.
