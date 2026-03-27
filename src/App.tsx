import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, Send, Loader2, CheckCircle2, AlertCircle, TrendingUp, TrendingDown, 
  Minus, Moon, Sun, BookOpen, MessageSquare, Tag, MapPin, LayoutGrid 
} from "lucide-react";

type TaskType = "insight" | "summarize" | "classify";

interface TaskConfig {
  id: TaskType;
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  description: string;
}

const TASKS: TaskConfig[] = [
  { 
    id: "insight", 
    label: "Deep Insight", 
    icon: <Sparkles className="w-4 h-4" />, 
    placeholder: "Paste text for deep analysis...",
    description: "Extracts summary, key insights, and sentiment."
  },
  { 
    id: "summarize", 
    label: "Summarize", 
    icon: <BookOpen className="w-4 h-4" />, 
    placeholder: "Paste long text to shorten...",
    description: "Generates a concise summary and bullet points."
  },
  { 
    id: "classify", 
    label: "Classify", 
    icon: <Tag className="w-4 h-4" />, 
    placeholder: "Paste text to categorize...",
    description: "Categorizes text and suggests tags."
  },
];

export default function App() {
  const [activeTask, setActiveTask] = useState<TaskType>("insight");
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [response, setResponse] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") === "dark" || 
        (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
    return false;
  });

  useEffect(() => {
    // Check if server is configured with API key
    fetch("/api/health")
      .then(res => res.json())
      .then(data => setIsConfigured(data.configured))
      .catch(() => setIsConfigured(false));
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;

    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          text: inputText, 
          task: activeTask
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Agent returned status ${res.status}`);
      }

      setResponse(data);
    } catch (err) {
      console.error("Analysis failed:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderResponse = () => {
    if (!response) return null;

    switch (activeTask) {
      case "insight":
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-4">Summary</div>
              <p className="text-xl font-medium text-slate-800 dark:text-slate-200 italic">"{response.summary}"</p>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-xs font-bold uppercase text-slate-500">Sentiment:</span>
                <span className="text-xs font-bold capitalize px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-700 dark:text-slate-300">{response.sentiment}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {response.insights.map((insight: string, idx: number) => (
                <div key={idx} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-start gap-4">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0 mt-1" />
                  <p className="text-slate-700 dark:text-slate-300 font-medium">{insight}</p>
                </div>
              ))}
            </div>
          </div>
        );
      case "summarize":
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-4">Concise Summary</div>
              <p className="text-lg text-slate-800 dark:text-slate-200 leading-relaxed">{response.summary}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-4">Key Points</div>
              <ul className="space-y-3">
                {response.bulletPoints.map((point: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-3 text-slate-700 dark:text-slate-300">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      case "classify":
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-1">Category</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{response.category}</div>
              </div>
              <div className={`px-4 py-2 rounded-xl font-bold uppercase text-xs ${
                response.urgency === 'high' ? 'bg-rose-100 text-rose-700' : 
                response.urgency === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {response.urgency} Priority
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {response.tags.map((tag: string, idx: number) => (
                <span key={idx} className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-sm font-medium border border-slate-200 dark:border-slate-700">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900/30 transition-colors duration-300">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-lg shadow-slate-200 dark:shadow-none overflow-hidden border border-slate-200 dark:border-slate-800">
              <img src="/logo.png" alt="Amit's DSC Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Amit's DSC</h1>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest">AI Service Center</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Task Selector */}
        <div className="flex flex-wrap gap-2 mb-12 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-fit">
          {TASKS.map((task) => (
            <button
              key={task.id}
              onClick={() => {
                setActiveTask(task.id);
                setResponse(null);
                setError(null);
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTask === task.id 
                  ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {task.icon}
              {task.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Input Section */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {TASKS.find(t => t.id === activeTask)?.label}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                {TASKS.find(t => t.id === activeTask)?.description}
              </p>
            </div>

            <div className="space-y-4">
              {isConfigured === false && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-xl flex items-start gap-3 text-amber-700 dark:text-amber-400 text-sm font-medium">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <div>
                    <p className="font-bold">API Key Not Configured</p>
                    <p className="text-xs mt-1">Please set your GEMINI_API_KEY in the environment variables to use this agent.</p>
                  </div>
                </div>
              )}

              <div className="relative group">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">
                  Input Text
                </label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={TASKS.find(t => t.id === activeTask)?.placeholder}
                  className="w-full h-48 p-6 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 rounded-2xl focus:border-indigo-500 transition-all outline-none resize-none shadow-sm"
                />
                <div className="absolute bottom-4 right-4">
                  <button
                    onClick={handleAnalyze}
                    disabled={isLoading || !inputText.trim() || isConfigured === false}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-200 dark:shadow-none active:scale-95"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    {isLoading ? "Working..." : "Process"}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20 rounded-xl flex items-start gap-3 text-rose-700 dark:text-rose-400 text-sm font-medium">
                <AlertCircle className="w-5 h-5 shrink-0" />
                {error}
              </div>
            )}
          </div>

          {/* Output Section */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {response ? (
                <motion.div
                  key={activeTask}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  {renderResponse()}
                </motion.div>
              ) : isLoading ? (
                <div className="h-full flex flex-col items-center justify-center space-y-6 py-24">
                  <div className="w-20 h-20 border-4 border-indigo-100 dark:border-slate-800 border-t-indigo-600 rounded-full animate-spin" />
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Agent is thinking...</h3>
                    <p className="text-sm text-slate-500">Processing your {activeTask} request.</p>
                  </div>
                </div>
              ) : (
                <div className="h-full border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center p-12 text-center space-y-4 bg-slate-50/50 dark:bg-slate-900/20">
                  <Sparkles className="w-12 h-12 text-slate-300 dark:text-slate-700" />
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-slate-400 dark:text-slate-600">Result Viewport</h3>
                    <p className="text-sm text-slate-400 dark:text-slate-600 max-w-xs">
                      Select a task and provide input to see the agent's response here.
                    </p>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
