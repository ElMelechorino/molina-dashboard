import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { Zap, Brain, Puzzle, Target, Calculator, Lightbulb, MessageCircle, Bot } from 'lucide-react';


// ── Types ──────────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

type ChatMode = 'rapido' | 'explicar' | 'pensar' | 'examen' | 'matematicas' | 'intuicion';

interface ModeOption {
  id: ChatMode;
  label: string;
  icon: React.ReactNode;
  description: string;
}

// ── Constants & API Config ─────────────────────────────────────────────
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_TOKEN || '';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const GROQ_API_KEY = import.meta.env.VITE_GROQ_TOKEN || '';
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

const GLOBAL_SUFFIX = '\n\nResponde de forma concisa, sin repetir información y sin añadir contenido innecesario.';

const MODE_PROMPTS: Record<ChatMode, string> = {
  rapido: `Eres un asistente para un estudiante universitario.

Responde:
- Muy corto (máximo 2-3 líneas)
- Claro y directo
- Fácil de decir en voz alta

Evita:
- Explicaciones largas
- Detalles innecesarios

Usa lenguaje natural, sencillo y preciso.
Da solo la respuesta, sin introducciones ni cierre.${GLOBAL_SUFFIX}`,

  explicar: `Eres un asistente que explica temas a un estudiante universitario.

Responde:
- Claro y fácil de entender
- En ideas bien separadas
- Con un ejemplo breve si ayuda

Usa lenguaje natural, sin tecnicismos innecesarios.

Evita:
- Explicaciones largas
- Repeticiones
- Relleno

Mantén la respuesta útil pero concisa.${GLOBAL_SUFFIX}`,

  pensar: `Eres un asistente que ayuda a razonar.

Responde:
- Analizando paso a paso
- Explicando el por qué de cada idea
- Mostrando el proceso mental

Estructura:
- Idea principal
- Desarrollo lógico
- Conclusión clara

Evita ir directo a la respuesta sin explicar.
Usa lenguaje claro, natural y preciso.${GLOBAL_SUFFIX}`,

  examen: `Eres un estudiante que intenta responder bien en clase.

Responde:
- Claro
- Preciso
- Bien estructurado

Tono:
- Lenguaje natural, intentando sonar serio pero sin ser perfecto
- Se nota esfuerzo por explicarse bien

Evita:
- Sonar robótico o demasiado formal
- Frases típicas de IA
- Explicaciones largas o redundantes

Da:
- Una definición breve
- Una explicación clara
- Una frase final que cierre la idea

No incluyas introducciones ni conclusiones genéricas.${GLOBAL_SUFFIX}`,

  matematicas: `Eres un asistente especializado en matemáticas.

Resuelve:
- Paso a paso
- Sin saltarte ningún procedimiento

Para cada paso:
- Explica qué haces
- Explica por qué lo haces

Usa:
- Orden claro
- Desarrollo completo

Al final:
- Da el resultado final claramente

Evita:
- Saltar pasos
- Explicaciones confusas${GLOBAL_SUFFIX}`,

  intuicion: `Eres un asistente que explica conceptos de forma intuitiva.

Responde:
- De forma simple
- Con analogías o ejemplos reales si ayudan
- Enfocado en entender, no memorizar

Explica el "por qué" de las cosas de forma natural.

Evita:
- Lenguaje técnico
- Definiciones complicadas

Haz que alguien entienda la idea sin necesidad de conocimientos previos.${GLOBAL_SUFFIX}`,
};

const MODES: ModeOption[] = [
  { id: 'rapido',      label: 'Rápido',      icon: <Zap className="w-4 h-4" />, description: 'Respuestas cortas y directas' },
  { id: 'explicar',    label: 'Explicar',     icon: <Brain className="w-4 h-4" />, description: 'Entender un tema de forma clara' },
  { id: 'pensar',      label: 'Pensar',       icon: <Puzzle className="w-4 h-4" />, description: 'Analizar paso a paso' },
  { id: 'examen',      label: 'Examen',       icon: <Target className="w-4 h-4" />, description: 'Respuesta estructurada para clase' },
  { id: 'matematicas', label: 'Matemáticas',  icon: <Calculator className="w-4 h-4" />, description: 'Resolver ejercicios paso a paso' },
  { id: 'intuicion',   label: 'Intuición',    icon: <Lightbulb className="w-4 h-4" />, description: 'Entender el concepto de forma simple' },
];

// ── Helpers ────────────────────────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ── AI Provider State ──
// Gestiona el estado para manejar los límites y fallbacks
let activeProvider: 'gemini' | 'groq' = 'gemini';
let geminiTimeoutUntil: number = 0;
const GEMINI_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutos antes de reintentar el modelo principal

async function queryGemini(userInput: string, mode: ChatMode): Promise<string> {
  const systemPrompt = MODE_PROMPTS[mode];
  const fullPrompt = systemPrompt + '\n\nPregunta: ' + userInput;

  const res = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: fullPrompt }] }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Respuesta vacía de Gemini');
  }
  return text;
}

// Respaldo usando Groq y el modelo Llama3
async function queryGroq(userInput: string, mode: ChatMode): Promise<string> {
  const systemPrompt = MODE_PROMPTS[mode];

  const res = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userInput }
      ],
      temperature: 0.7,
      max_tokens: 1024
    }),
  });

  if (!res.ok) {
    throw new Error(`Groq API error: ${res.status}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('Respuesta vacía de Groq');
  }
  return text;
}

// Inteligencia de conmutación automática a nivel de IA
async function queryAI(userInput: string, mode: ChatMode): Promise<string> {
  // Comprobar si se puede restaurar el modelo principal
  if (activeProvider === 'groq' && Date.now() > geminiTimeoutUntil) {
    activeProvider = 'gemini';
    console.log('Restaurando el modelo principal de IA (Gemini)...');
  }

  if (activeProvider === 'gemini') {
    try {
      return await queryGemini(userInput, mode);
    } catch (error) {
      console.warn('Gemini experimentando problemas o límites. Cambiando al modelo de respaldo transparente (Groq)...', error);
      activeProvider = 'groq';
      geminiTimeoutUntil = Date.now() + GEMINI_COOLDOWN_MS;
      
      // Fallback transparente al instante
      return await queryGroq(userInput, mode);
    }
  } else {
    try {
      return await queryGroq(userInput, mode);
    } catch (error) {
      console.error('El modelo de respaldo también falló.', error);
      // Lanza error real solo si ambos fallaron para mostrarle al componente de vista
      throw error;
    }
  }
}

// ── Component ──────────────────────────────────────────────────────────
export function ChatView() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'welcome', role: 'assistant', content: '¿Cómo te puedo ayudar hoy?' },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState<ChatMode>('rapido');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = { id: uid(), role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const reply = await queryAI(trimmed, selectedMode);
      setMessages(prev => [
        ...prev,
        { id: uid(), role: 'assistant', content: reply },
      ]);
    } catch (error: any) {
      console.error("Error crítico detallado de las respuestas IA:", error);
      
      let errorMsg = '⚠️ En este momento estamos experimentando una alta demanda. Por favor, intenta de nuevo más tarde.';
      
      // Comprobar la ausencia de claves API
      if (!GEMINI_API_KEY && !GROQ_API_KEY) {
         errorMsg = '⚠️ Error de configuración: No se encontraron las claves de API (VITE_GEMINI_TOKEN / VITE_GROQ_TOKEN) en las variables de entorno.';
      } else if (error?.message) {
         errorMsg = `⚠️ Ocurrió un error al consultar la IA: ${error.message}`;
      }

      setMessages(prev => [
        ...prev,
        { id: uid(), role: 'assistant', content: errorMsg },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const currentMode = MODES.find(m => m.id === selectedMode)!;

  return (
    <div className="flex flex-col h-full max-h-full">
      {/* ── Header + Mode selector ── */}
      <div className="flex-shrink-0 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50">
        {/* Title bar */}
        <div className="px-4 sm:px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Chat con Tito
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {currentMode.icon} {currentMode.label} — {currentMode.description}
            </p>
          </div>
        </div>

        {/* Mode pills */}
        <div className="px-4 sm:px-6 pb-3 flex flex-wrap gap-2">
          {MODES.map(mode => (
            <button
              key={mode.id}
              onClick={() => setSelectedMode(mode.id)}
              title={mode.description}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                transition-all duration-200 cursor-pointer select-none
                ${selectedMode === mode.id
                  ? 'bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-500/25 scale-105'
                  : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600/60'
                }
              `}
            >
              <div className="flex-shrink-0">{mode.icon}</div>
              <span className="hidden sm:inline">{mode.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mr-2 mt-1 shadow-sm">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div
              className={`
                max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-3 text-sm leading-relaxed
                break-words
                ${msg.role === 'user'
                  ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-br-md shadow-md shadow-blue-500/15'
                  : 'bg-white dark:bg-slate-700/80 text-slate-800 dark:text-slate-100 rounded-bl-md shadow-sm border border-slate-200/60 dark:border-slate-600/40'
                }
              `}
            >
              <div className="prose dark:prose-invert prose-sm max-w-none break-words leading-relaxed [&>*:first-child]:!mt-0 [&>*:last-child]:!mb-0 [&_p]:!my-1 [&_ul]:!my-1 [&_ol]:!my-1 [&_li]:!my-0">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {msg.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mr-2 mt-1 shadow-sm">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white dark:bg-slate-700/80 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-slate-200/60 dark:border-slate-600/40">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input area ── */}
      <div className="flex-shrink-0 p-3 sm:p-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-xl border-t border-slate-200/50 dark:border-slate-700/50">
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu mensaje…"
            rows={1}
            disabled={isLoading}
            className="
              flex-1 resize-none rounded-xl border border-slate-200 dark:border-slate-600
              bg-white dark:bg-slate-700 text-slate-900 dark:text-white
              placeholder:text-slate-400 dark:placeholder:text-slate-500
              px-4 py-3 text-sm leading-relaxed
              focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500
              disabled:opacity-50 transition-all
            "
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="
              flex-shrink-0 w-11 h-11 rounded-xl
              bg-gradient-to-br from-violet-500 to-indigo-600
              text-white flex items-center justify-center
              shadow-lg shadow-violet-500/20
              hover:shadow-xl hover:shadow-violet-500/30 hover:scale-105
              active:scale-95
              disabled:opacity-40 disabled:hover:scale-100 disabled:hover:shadow-lg
              transition-all duration-200 cursor-pointer
            "
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
