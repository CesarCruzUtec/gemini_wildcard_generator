/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import {
  Download,
  Upload,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  Sparkles,
  Settings2,
  FileText,
  Save,
  Plus,
  HelpCircle,
  X,
  Image as ImageIcon,
  Search,
  ArrowRight,
  FolderOpen,
  KeyRound
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Persists state in localStorage and keeps it in sync
function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue] as const;
}

type WildcardItem = { id: string; text: string; createdAt: number; previewUrl?: string };

// API helpers – fire-and-forget for optimistic updates
const dbApi = {
  fetchList: async (list: 'generated' | 'saved'): Promise<WildcardItem[]> => {
    const res = await fetch(`/api/wildcards?list=${list}`);
    return res.json();
  },
  add: (items: (WildcardItem & { list: string })[]) =>
    fetch('/api/wildcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    }),
  patch: (id: string, patch: { list?: string; previewUrl?: string | null }) =>
    fetch(`/api/wildcards/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }),
  remove: (id: string) => fetch(`/api/wildcards/${id}`, { method: 'DELETE' }),
  clearList: (list: 'generated' | 'saved') =>
    fetch(`/api/wildcards?list=${list}`, { method: 'DELETE' }),
  reorder: (list: 'generated' | 'saved', ids: string[]) =>
    fetch('/api/wildcards/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ list, ids }),
    }),
  // ── Costs ──────────────────────────────────────────────────────────────
  fetchCosts: async (): Promise<{ total: number }> => {
    const res = await fetch('/api/costs');
    return res.json();
  },
  createSession: async (label: string): Promise<string> => {
    const res = await fetch('/api/costs/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label }),
    });
    const data = await res.json();
    return data.id as string;
  },
  updateSession: (id: string, amount: number) =>
    fetch(`/api/costs/session/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    }),
  addToTotal: (delta: number) =>
    fetch('/api/costs/total', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delta }),
    }),
  // ── Config ──────────────────────────────────────────────────────────────────
  fetchConfig: async (): Promise<{ galleryDir: string; apiKey: string }> => {
    const res = await fetch('/api/config');
    return res.json();
  },
  updateConfig: (config: { galleryDir?: string; apiKey?: string }) =>
    fetch('/api/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    }),
  resetDb: () => fetch('/api/db/reset', { method: 'POST' }),
};

const DEFAULT_SYSTEM_INSTRUCTION = `You are an expert Danbooru tagger for Stable Diffusion and ComfyUI. Your task is to generate highly detailed, comprehensive wildcards describing full-body outfits.
When given a text request and-or image references, you must meticulously analyze it and tag EVERY piece of clothing from head to toe. Do not omit any garment. Ensure tops, outerwear, bottoms, legwear, footwear, and accessories are all explicitly included.
Each wildcard must be a single line of comma-separated booru tags containing:
At least 2-3 pose/posture tags relevant to the clothing style.
Detailed clothing tags covering the entire body (Headwear/Accessories, Tops/Outerwear, Bottoms, Legwear, Footwear).
Explicit color tags attached to EVERY clothing item (e.g., "white_shirt", "black_pleated_skirt").
Provide the exact amount of variations based on the user's request.
Output ONLY the wildcards, one per line. Do not include numbering, labels, or any other text.
Example:
standing, looking_at_viewer, hands_in_pockets, black_choker, white_crop_top, green_zip-up_hoodie, blue_denim_shorts, black_thighhighs, red_sneakers, casual_wear`;

type Theme = {
  id: string;
  name: string;
  bg: string;
  text: string;
  card: string;
  border: string;
  accent: string;
  sidebar: string;
  input: string;
  muted: string;
  scrollbar: string;
};

const THEMES: Theme[] = [
  {
    id: 'light',
    name: 'Light',
    bg: '#fafafa',
    text: '#1a1a1a',
    card: '#ffffff',
    border: 'rgba(0,0,0,0.05)',
    accent: '#000000',
    sidebar: '#ffffff',
    input: 'rgba(0,0,0,0.05)',
    muted: 'rgba(0,0,0,0.4)',
    scrollbar: 'rgba(0,0,0,0.05)'
  },
  {
    id: 'dark',
    name: 'Dark',
    bg: '#0a0a0a',
    text: '#e5e5e5',
    card: '#121212',
    border: 'rgba(255,255,255,0.1)',
    accent: '#ffffff',
    sidebar: '#121212',
    input: 'rgba(255,255,255,0.05)',
    muted: 'rgba(255,255,255,0.4)',
    scrollbar: 'rgba(255,255,255,0.1)'
  },
  {
    id: 'pastel-pink',
    name: 'Pastel Pink',
    bg: '#fff5f5',
    text: '#4a2c2c',
    card: '#ffffff',
    border: '#ffe3e3',
    accent: '#ff8787',
    sidebar: '#fffafa',
    input: '#fff0f0',
    muted: '#c0a0a0',
    scrollbar: '#ffe3e3'
  },
  {
    id: 'pastel-blue',
    name: 'Pastel Blue',
    bg: '#f0f7ff',
    text: '#2c3e50',
    card: '#ffffff',
    border: '#d0e1f9',
    accent: '#4dabf7',
    sidebar: '#f8fbff',
    input: '#e7f3ff',
    muted: '#868e96',
    scrollbar: '#d0e1f9'
  },
  {
    id: 'pastel-green',
    name: 'Pastel Green',
    bg: '#f4fce3',
    text: '#2b3d10',
    card: '#ffffff',
    border: '#e9fac8',
    accent: '#82c91e',
    sidebar: '#fafff0',
    input: '#f1fbd7',
    muted: '#868e96',
    scrollbar: '#e9fac8'
  },
  {
    id: 'pastel-lavender',
    name: 'Pastel Lavender',
    bg: '#f8f0fc',
    text: '#3b2c4a',
    card: '#ffffff',
    border: '#f3d9fa',
    accent: '#be4bdb',
    sidebar: '#fdfaff',
    input: '#f8f0fc',
    muted: '#868e96',
    scrollbar: '#f3d9fa'
  }
];

export default function App() {
  // ── Persisted in localStorage ────────────────────────────────────────────
  const [themeId, setThemeId] = useLocalStorage('themeId', 'dark');
  const [systemInstruction, setSystemInstruction] = useLocalStorage('systemInstruction', DEFAULT_SYSTEM_INSTRUCTION);
  const [userPrompt, setUserPrompt] = useLocalStorage('userPrompt', '');
  const [numToGenerate, setNumToGenerate] = useLocalStorage('numToGenerate', 5);
  const [referenceImages, setReferenceImages] = useLocalStorage<string[]>('referenceImages', []);

  const theme = THEMES.find(t => t.id === themeId) ?? THEMES[1];

  // ── Session-only state ───────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [allTimeCost, setAllTimeCost] = useState(0);
  const [sessionCost, setSessionCost] = useState(0);
  const [lastCallCost, setLastCallCost] = useState(0);
  const [generatedWildcards, setGeneratedWildcards] = useState<WildcardItem[]>([]);
  const [savedWildcards, setSavedWildcards] = useState<WildcardItem[]>([]);
  const [lastGenerationTime, setLastGenerationTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [refiningWildcard, setRefiningWildcard] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [galleryPath, setGalleryPath] = useState('');
  const [galleryPathInput, setGalleryPathInput] = useState('');
  const [galleryFiles, setGalleryFiles] = useState<string[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [previewHover, setPreviewHover] = useState<{ url: string; x: number; y: number } | null>(null);
  const [clearGeneratedConfirm, setClearGeneratedConfirm] = useState(false);
  const [clearSavedConfirm, setClearSavedConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const sessionIdRef = useRef<string | null>(null);
  const sessionCostRef = useRef(0); // mirror of sessionCost for use inside async loops
  const initializedRef = useRef(false); // guard against StrictMode double-mount

  // ── Load wildcards from DB on mount ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    Promise.all([dbApi.fetchList('generated'), dbApi.fetchList('saved')])
      .then(([generated, saved]) => {
        setGeneratedWildcards(generated);
        setSavedWildcards(saved);
      })
      .catch(() => { /* server not running */ });

    // Create a new session row and load all-time total
    const now = new Date();
    const label = now.toLocaleString();
    dbApi.createSession(label)
      .then(id => { sessionIdRef.current = id; })
      .catch(() => {});
    dbApi.fetchCosts()
      .then(({ total }) => setAllTimeCost(total))
      .catch(() => {});
    dbApi.fetchConfig()
      .then(({ galleryDir, apiKey: key }) => {
        setGalleryPath(galleryDir); setGalleryPathInput(galleryDir);
        setApiKey(key); setApiKeyInput(key);
      })
      .catch(() => {});
  }, []);

  // ── Poll gallery ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!galleryPath.trim()) {
      setGalleryFiles([]);
      setGalleryLoading(false);
      return;
    }
    const fetchGallery = async () => {
      try {
        const res = await fetch('/api/gallery');
        const data = await res.json();
        setGalleryFiles(data.files ?? []);
      } catch {
        // server not running or no images
      } finally {
        setGalleryLoading(false);
      }
    };
    fetchGallery();
    const id = setInterval(fetchGallery, 5000);
    return () => clearInterval(id);
  }, [galleryPath]);

  const galleryEnabled = galleryPath.trim() !== '';

  // Sync settings input fields whenever settings panel opens
  useEffect(() => {
    if (showSettings) {
      setGalleryPathInput(galleryPath);
      setApiKeyInput(apiKey);
    }
  }, [showSettings]); // eslint-disable-line react-hooks/exhaustive-deps

  const resizeImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 4 - referenceImages.length);
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const resized = await resizeImage(base64);
        setReferenceImages(prev => [...prev, resized]);
      };
      reader.readAsDataURL(file);
    }
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const generateWildcards = async () => {
    setIsLoading(true);
    setLastCallCost(0);
    const generationTime = Date.now();
    setLastGenerationTime(generationTime);

    try {
      const keyToUse = apiKey.trim();
      if (!keyToUse) {
        alert("Please set a Gemini API Key in Settings.");
        setShowSettings(true);
        setIsLoading(false);
        return;
      }
      const ai = new GoogleGenAI({ apiKey: keyToUse });
      const model = "gemini-3-flash-preview";

      const totalNeeded = numToGenerate;
      const batchSize = 10;
      const batches: number[] = [];

      for (let i = 0; i < totalNeeded; i += batchSize) {
        batches.push(Math.min(batchSize, totalNeeded - i));
      }

      let sessionCost = 0;

      for (const count of batches) {
        let batchPrompt = `${userPrompt}. Provide exactly ${count} distinct variations. Output ONLY the wildcards, one per line.`;
        if (refiningWildcard) {
          batchPrompt = `Refine this wildcard: "${refiningWildcard}". User request: ${userPrompt}. Provide exactly ${count} distinct variations. Output ONLY the wildcards, one per line.`;
        }

        const parts: any[] = [{ text: batchPrompt }];

        referenceImages.forEach(img => {
          parts.push({
            inlineData: {
              data: img.split(',')[1],
              mimeType: 'image/jpeg'
            }
          });
        });

        const response = await ai.models.generateContent({
          model,
          contents: { parts },
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.8,
          },
        });

        const usage = response.usageMetadata;
        if (usage) {
          const inputCost = (usage.promptTokenCount || 0) * (0.5 / 1000000);
          const outputCost = (usage.candidatesTokenCount || 0) * (3.0 / 1000000);
          const batchCost = inputCost + outputCost;
          sessionCost += batchCost;
          sessionCostRef.current += batchCost;
          setSessionCost(sessionCostRef.current);
          setAllTimeCost(prev => prev + batchCost);
          // Persist to DB (fire-and-forget)
          if (sessionIdRef.current) dbApi.updateSession(sessionIdRef.current, sessionCostRef.current);
          dbApi.addToTotal(batchCost);
        }

        const text = response.text || '';
        const lines = text.split('\n').filter(line => line.trim().length > 0).slice(0, count);

        const newItems: WildcardItem[] = lines.map(l => ({
          id: crypto.randomUUID(),
          text: l,
          createdAt: generationTime
        }));

        setGeneratedWildcards(prev => [...newItems, ...prev]);
        dbApi.add(newItems.map(item => ({ ...item, list: 'generated' })));
      }
      setLastCallCost(sessionCost);
      setRefiningWildcard(null);
    } catch (error) {
      console.error("Generation failed:", error);
      alert("Failed to generate wildcards.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const saveToSavedList = (item: WildcardItem) => {
    if (savedWildcards.find(s => s.text === item.text)) return;
    // New ID so generated and saved rows don't conflict in the DB
    const newItem: WildcardItem = { ...item, id: crypto.randomUUID() };
    setSavedWildcards(prev => [newItem, ...prev]);
    dbApi.add([{ ...newItem, list: 'saved' }]);
  };

  const setPreviewForWildcard = (id: string, imageUrl: string, listType: 'generated' | 'saved') => {
    if (listType === 'generated') {
      setGeneratedWildcards(prev => prev.map(w => w.id === id ? { ...w, previewUrl: imageUrl } : w));
    } else {
      setSavedWildcards(prev => prev.map(w => w.id === id ? { ...w, previewUrl: imageUrl } : w));
    }
    dbApi.patch(id, { previewUrl: imageUrl });
  };

  const removeSaved = (id: string) => {
    setSavedWildcards(prev => prev.filter(s => s.id !== id));
    dbApi.remove(id);
  };

  const removeGenerated = (id: string) => {
    setGeneratedWildcards(prev => prev.filter(s => s.id !== id));
    dbApi.remove(id);
  };

  const clearSaved = () => {
    setSavedWildcards([]);
    dbApi.clearList('saved');
    setClearSavedConfirm(false);
  };

  const clearGenerated = () => {
    setGeneratedWildcards([]);
    dbApi.clearList('generated');
    setClearGeneratedConfirm(false);
  };

  const downloadWildcards = () => {
    if (savedWildcards.length === 0) return;
    const content = savedWildcards.map(s => s.text).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wildcards.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const lines = content.split('\n').filter(line => line.trim().length > 0);
      const newSaved: WildcardItem[] = lines.map(l => ({
        id: crypto.randomUUID(),
        text: l,
        createdAt: Date.now()
      }));
      setSavedWildcards(prev => [...newSaved, ...prev]);
      dbApi.add(newSaved.map(item => ({ ...item, list: 'saved' })));
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRefine = (wildcard: string) => {
    setRefiningWildcard(wildcard);
    const textarea = document.querySelector('textarea');
    if (textarea) textarea.focus();
  };

  // Merges a reordered filtered subset back into the full list
  const mergeReorder = <T extends { id: string }>(fullList: T[], filteredReordered: T[]): T[] => {
    const filteredIds = new Set(filteredReordered.map(item => item.id));
    const filteredIndexes = fullList.reduce<number[]>((acc, item, idx) => {
      if (filteredIds.has(item.id)) acc.push(idx);
      return acc;
    }, []);
    const result = [...fullList];
    filteredIndexes.forEach((pos, i) => { result[pos] = filteredReordered[i]; });
    return result;
  };

  const filteredGenerated = generatedWildcards.filter(w =>
    w.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSaved = savedWildcards.filter(w =>
    w.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      className="h-screen flex flex-col font-sans overflow-hidden transition-colors duration-300"
      style={{ backgroundColor: theme.bg, color: theme.text }}
    >
      {/* Header */}
      <header
        className="h-14 border-b flex items-center justify-between px-6 shrink-0 transition-colors duration-300"
        style={{ backgroundColor: theme.sidebar, borderColor: theme.border }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" style={{ color: theme.accent }} />
          <h1 className="text-sm font-medium tracking-tight">Wildcard Studio</h1>
          {!apiKey.trim() && (
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border transition-opacity hover:opacity-80"
              style={{ borderColor: 'rgba(250,100,100,0.5)', color: 'rgb(220,80,80)', backgroundColor: 'rgba(250,100,100,0.08)' }}
            >
              <KeyRound className="w-2.5 h-2.5" /> No API Key
            </button>
          )}
          {!galleryEnabled && (
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border transition-opacity hover:opacity-80"
              style={{ borderColor: 'rgba(200,160,0,0.5)', color: 'rgb(180,140,0)', backgroundColor: 'rgba(230,190,0,0.08)' }}
            >
              <FolderOpen className="w-2.5 h-2.5" /> No Gallery
            </button>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold uppercase tracking-wider opacity-40">Theme</label>
            <select
              value={themeId}
              onChange={(e) => setThemeId(e.target.value)}
              className="bg-transparent text-[10px] font-bold uppercase tracking-wider border-none focus:ring-0 cursor-pointer"
              style={{ color: theme.accent }}
            >
              {THEMES.map(t => (
                <option key={t.id} value={t.id} style={{ backgroundColor: theme.card, color: theme.text }}>{t.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setShowGuide(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md transition-colors hover:bg-black/5 text-[10px] font-bold uppercase tracking-wider"
            style={{ color: theme.muted }}
          >
            <HelpCircle className="w-4 h-4" /> Guide
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-md transition-colors text-[10px] font-bold uppercase tracking-wider"
            style={{
              backgroundColor: showSettings ? theme.input : 'transparent',
              color: showSettings ? theme.accent : theme.muted
            }}
          >
            <Settings2 className="w-4 h-4" /> Settings
          </button>
        </div>
      </header>

      {/* Reset DB Confirmation Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowResetConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
              style={{ backgroundColor: theme.card, color: theme.text }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b flex items-center gap-3" style={{ borderColor: theme.border }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center bg-red-500/10 shrink-0">
                  <Trash2 className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <h2 className="text-sm font-bold">Reset Database</h2>
                  <p className="text-[10px] opacity-40 mt-0.5">This cannot be undone</p>
                </div>
              </div>
              <div className="p-6 space-y-3">
                <p className="text-xs opacity-60 leading-relaxed">The following will be permanently deleted:</p>
                <ul className="space-y-2">
                  <li className="flex items-center justify-between text-xs rounded-lg px-3 py-2" style={{ backgroundColor: theme.input }}>
                    <span className="opacity-60">Generated wildcards</span>
                    <span className="font-bold font-mono">{generatedWildcards.length}</span>
                  </li>
                  <li className="flex items-center justify-between text-xs rounded-lg px-3 py-2" style={{ backgroundColor: theme.input }}>
                    <span className="opacity-60">Saved wildcards</span>
                    <span className="font-bold font-mono">{savedWildcards.length}</span>
                  </li>
                  <li className="flex items-center justify-between text-xs rounded-lg px-3 py-2" style={{ backgroundColor: theme.input }}>
                    <span className="opacity-60">All-time API cost</span>
                    <span className="font-bold font-mono">${allTimeCost.toFixed(6)}</span>
                  </li>
                  <li className="flex items-center justify-between text-xs rounded-lg px-3 py-2" style={{ backgroundColor: theme.input }}>
                    <span className="opacity-60">API key &amp; gallery path</span>
                    <span className="font-bold font-mono opacity-60">cleared</span>
                  </li>
                </ul>
              </div>
              <div className="px-6 pb-6 flex gap-3">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 h-10 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
                  style={{ backgroundColor: theme.input }}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await dbApi.resetDb();
                    setGeneratedWildcards([]);
                    setSavedWildcards([]);
                    setAllTimeCost(0);
                    setSessionCost(0);
                    setLastCallCost(0);
                    setApiKey(''); setApiKeyInput('');
                    setGalleryPath(''); setGalleryPathInput('');
                    setGalleryFiles([]);
                    sessionIdRef.current = null;
                    sessionCostRef.current = 0;
                    setShowResetConfirm(false);
                    setShowSettings(false);
                  }}
                  className="flex-1 h-10 rounded-lg text-xs font-bold uppercase tracking-widest transition-all bg-red-500 hover:bg-red-600 text-white"
                >
                  Reset Everything
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tutorial Modal */}
      <AnimatePresence>
        {showGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowGuide(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
              style={{ backgroundColor: theme.card, color: theme.text }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: theme.border }}>
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5" style={{ color: theme.accent }} />
                  <h2 className="text-sm font-bold uppercase tracking-wider">How to use Wildcard Studio</h2>
                </div>
                <button onClick={() => setShowGuide(false)} className="p-1 hover:bg-black/5 rounded-full transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
                <section className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest opacity-40">0. First-time setup</h3>
                  <p className="text-sm leading-relaxed opacity-70">
                    Open <Settings2 className="w-3 h-3 inline" /> <span className="font-bold">Settings</span> and enter your <span className="font-bold">Gemini API Key</span> — the key is saved in the local database and never leaves your machine. Optionally set a <span className="font-bold">Gallery Folder</span> (e.g. your ComfyUI output path) to enable the image gallery. Warning badges in the header will remind you if either is missing.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest opacity-40">1. Generate</h3>
                  <p className="text-sm leading-relaxed opacity-70">
                    Enter a prompt in the <span className="font-bold">Request</span> box. Upload up to <span className="font-bold">4 reference images</span> to guide the generation. Set the <span className="font-bold">Count</span> and hit <span className="font-bold">Generate</span>. Use the <RefreshCw className="w-3 h-3 inline" /> button to generate a random surprise prompt.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest opacity-40">2. Refine</h3>
                  <p className="text-sm leading-relaxed opacity-70">
                    Hover over any wildcard and click <span className="font-bold">Refine</span>. A bar will appear at the bottom of the screen showing the selected wildcard. Type your refinement instructions in the <span className="font-bold">Request</span> sidebar and hit <span className="font-bold">Generate</span> — the selected wildcard is used as the base for the new generation. Click <X className="w-3 h-3 inline" /> on the bar to cancel.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest opacity-40">3. Organize & Search</h3>
                  <p className="text-sm leading-relaxed opacity-70">
                    The app is split into <span className="font-bold">Generated</span> and <span className="font-bold">Saved</span> columns. Use the <span className="font-bold">Search Bar</span> at the top to filter both simultaneously. <span className="font-bold">Drag and drop</span> cards to reorder them within each column.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest opacity-40">4. Save & Export</h3>
                  <p className="text-sm leading-relaxed opacity-70">
                    Click <Save className="w-3 h-3 inline" /> <span className="font-bold">Save</span> on a generated card to move it to your permanent list. Use <Upload className="w-3 h-3 inline" /> <span className="font-bold">Import</span> or <Download className="w-3 h-3 inline" /> <span className="font-bold">Export</span> in the Saved header to manage <code className="px-1.5 py-0.5 rounded bg-black/5 font-mono text-xs">.txt</code> files.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest opacity-40">5. Gallery & Previews</h3>
                  <p className="text-sm leading-relaxed opacity-70">
                    If a gallery folder is set, browse your output images in the left sidebar. Hover over a card in the gallery then click <ImageIcon className="w-3 h-3 inline" /> <span className="font-bold">Preview</span> on a wildcard to link that image to it — a thumbnail appears in the corner of the card and a larger preview pops up on hover.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest opacity-40">6. Costs & Themes</h3>
                  <p className="text-sm leading-relaxed opacity-70">
                    API usage is tracked at the bottom of the sidebar (last call, session total, all-time). Switch <span className="font-bold">Themes</span> from the header dropdown.
                  </p>
                </section>
              </div>

              <div className="p-6 border-t flex justify-end" style={{ borderColor: theme.border }}>
                <button
                  onClick={() => setShowGuide(false)}
                  className="px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
                  style={{ backgroundColor: theme.accent, color: theme.id === 'dark' ? '#000' : '#fff' }}
                >
                  Got it
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Overlay */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-14 left-0 right-0 z-50 border-b p-6 shadow-xl"
            style={{ backgroundColor: theme.card, borderColor: theme.border }}
          >
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-wider opacity-40">System Instructions</label>
                  <button
                    onClick={() => setSystemInstruction(DEFAULT_SYSTEM_INSTRUCTION)}
                    className="text-[10px] font-bold opacity-40 hover:opacity-100 transition-colors"
                  >
                    Reset to Default
                  </button>
                </div>
                <textarea
                  value={systemInstruction}
                  onChange={(e) => setSystemInstruction(e.target.value)}
                  className="w-full h-48 border-none rounded-xl p-4 text-xs font-mono focus:ring-1 transition-all resize-none"
                  style={{
                    backgroundColor: theme.input,
                    color: theme.text,
                    '--tw-ring-color': theme.accent
                  } as any}
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider opacity-40">Gemini API Key</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 opacity-30" />
                      <input
                        type="password"
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        placeholder="Enter your Gemini API key..."
                        className="w-full h-10 border-none rounded-lg pl-8 pr-4 text-xs focus:ring-1 transition-all"
                        style={{
                          backgroundColor: theme.input,
                          color: theme.text,
                          '--tw-ring-color': theme.accent
                        } as any}
                      />
                    </div>
                    <button
                      onClick={async () => {
                        const trimmed = apiKeyInput.trim();
                        setApiKey(trimmed);
                        await dbApi.updateConfig({ apiKey: trimmed });
                      }}
                      className="h-10 px-4 rounded-lg text-xs font-bold transition-all shrink-0"
                      style={{ backgroundColor: theme.input, color: theme.accent }}
                    >
                      Apply
                    </button>
                  </div>
                  <p className="text-[9px] opacity-30 leading-relaxed">
                    Stored in the local database. Your key never leaves your machine.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider opacity-40">Gallery Folder</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 opacity-30" />
                      <input
                        type="text"
                        value={galleryPathInput}
                        onChange={(e) => setGalleryPathInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                        placeholder="/path/to/ComfyUI/output"
                        className="w-full h-10 border-none rounded-lg pl-8 pr-4 text-xs focus:ring-1 transition-all"
                        style={{
                          backgroundColor: theme.input,
                          color: theme.text,
                          '--tw-ring-color': theme.accent
                        } as any}
                      />
                    </div>
                    <button
                      onClick={async () => {
                        const trimmed = galleryPathInput.trim();
                        setGalleryPath(trimmed);
                        await dbApi.updateConfig({ galleryDir: trimmed });
                        if (trimmed) {
                          setGalleryLoading(true);
                          try {
                            const res = await fetch('/api/gallery');
                            const data = await res.json();
                            setGalleryFiles(data.files ?? []);
                            setGalleryIndex(0);
                          } catch {} finally {
                            setGalleryLoading(false);
                          }
                        } else {
                          setGalleryFiles([]);
                        }
                      }}
                      className="h-10 px-4 rounded-lg text-xs font-bold transition-all shrink-0"
                      style={{ backgroundColor: theme.input, color: theme.accent }}
                    >
                      Apply
                    </button>
                  </div>
                  <p className="text-[9px] opacity-30 leading-relaxed">
                    Absolute path to your image output folder (e.g. ComfyUI output directory). Leave empty to disable the gallery.
                  </p>
                </div>

                <div className="pt-4 border-t flex flex-col gap-2" style={{ borderColor: theme.border }}>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="w-full h-10 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
                    style={{ backgroundColor: theme.accent, color: theme.id === 'dark' ? '#000' : '#fff' }}
                  >
                    Close Settings
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    className="w-full h-9 rounded-lg text-xs font-bold uppercase tracking-widest transition-all border border-red-500/30 text-red-500/60 hover:text-red-500 hover:border-red-500/60 hover:bg-red-500/5"
                  >
                    Reset Database
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Input & Saved */}
        <aside
          className="w-[26rem] border-r flex flex-col shrink-0 transition-colors duration-300"
          style={{ backgroundColor: theme.sidebar, borderColor: theme.border }}
        >
          {/* Input Section */}
          <div className="p-6 space-y-4 border-b overflow-y-auto custom-scrollbar" style={{ borderColor: theme.border }}>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider opacity-40">Request</label>
              <textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="e.g., cyberpunk street wear..."
                className="w-full h-24 border-none rounded-lg p-3 text-sm focus:ring-1 transition-all resize-none placeholder:opacity-20"
                style={{
                  backgroundColor: theme.input,
                  color: theme.text,
                  '--tw-ring-color': theme.accent
                } as any}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider opacity-40">Reference Images ({referenceImages.length}/4)</label>
                <button
                  onClick={() => imageInputRef.current?.click()}
                  disabled={referenceImages.length >= 4}
                  className="p-1 hover:bg-black/5 rounded-md transition-colors disabled:opacity-10"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <input
                  type="file"
                  ref={imageInputRef}
                  onChange={handleImageUpload}
                  className="hidden"
                  accept="image/*"
                  multiple
                />
              </div>
              <div className="grid grid-cols-4 gap-2">
                {referenceImages.map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-md overflow-hidden bg-black/5">
                    <img src={img} className="w-full h-full object-cover" />
                    <button
                      onClick={() => setReferenceImages(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-0 right-0 p-0.5 bg-red-500 text-white rounded-bl-md"
                    >
                      <X className="w-2 h-2" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider opacity-40">Count</label>
              <input
                type="number"
                min="1"
                max="100"
                value={numToGenerate}
                onChange={(e) => setNumToGenerate(parseInt(e.target.value) || 1)}
                className="w-full h-9 border-none rounded-lg px-3 text-xs focus:ring-1 transition-all"
                style={{
                  backgroundColor: theme.input,
                  color: theme.text,
                  '--tw-ring-color': theme.accent
                } as any}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => generateWildcards()}
                disabled={isLoading || (!userPrompt.trim() && referenceImages.length === 0)}
                className="flex-1 h-10 text-xs font-medium rounded-lg disabled:opacity-20 transition-all flex items-center justify-center gap-2"
                style={{
                  backgroundColor: theme.accent,
                  color: theme.id === 'dark' ? '#000' : '#fff'
                }}
              >
                {isLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : "Generate"}
              </button>
              <button
                onClick={() => { setUserPrompt(''); setReferenceImages([]); setRefiningWildcard(null); generateWildcards(); }}
                disabled={isLoading}
                className="w-10 h-10 rounded-lg transition-all flex items-center justify-center"
                title="Surprise Me"
                style={{ backgroundColor: theme.input, color: theme.muted }}
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
              </button>
            </div>
          </div>

          {/* Gallery Viewer */}
          <div className="flex-1 flex flex-col p-4 gap-3 overflow-hidden border-t" style={{ borderColor: theme.border }}>
            <div className="flex items-center justify-between shrink-0">
              <label className="text-[10px] font-bold uppercase tracking-wider opacity-40">Output Gallery</label>
              <div className="flex items-center gap-2">
                {galleryFiles.length > 0 && (
                  <span className="text-[10px] font-mono opacity-30">
                    {galleryIndex + 1} / {galleryFiles.length}
                  </span>
                )}
                <button
                  onClick={async () => {
                    setGalleryLoading(true);
                    try {
                      const res = await fetch('/api/gallery');
                      const data = await res.json();
                      setGalleryFiles(data.files ?? []);
                      setGalleryIndex(0);
                    } catch {}
                    setGalleryLoading(false);
                  }}
                  className="p-1 rounded-md hover:opacity-100 opacity-40 transition-opacity"
                  title="Refresh gallery"
                >
                  <RefreshCw className={cn("w-3 h-3", galleryLoading && "animate-spin")} />
                </button>
              </div>
            </div>

            {!galleryEnabled ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center p-4" style={{ opacity: 0.3 }}>
                <FolderOpen className="w-6 h-6" />
                <span className="text-[10px] uppercase tracking-wider">No gallery folder set</span>
                <button
                  onClick={() => setShowSettings(true)}
                  className="text-[10px] underline underline-offset-2 mt-1"
                >
                  Configure in Settings
                </button>
              </div>
            ) : galleryLoading ? (
              <div className="flex-1 flex items-center justify-center opacity-20">
                <RefreshCw className="w-5 h-5 animate-spin" />
              </div>
            ) : galleryFiles.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 opacity-20">
                <ImageIcon className="w-6 h-6" />
                <span className="text-[10px] uppercase tracking-wider">No images found</span>
              </div>
            ) : (
              <>
                <div
                  className="flex-1 rounded-xl overflow-hidden relative"
                  style={{ backgroundColor: theme.input }}
                >
                  <img
                    key={galleryFiles[galleryIndex]}
                    src={`/gallery-images/${galleryFiles[galleryIndex]}`}
                    className="w-full h-full object-contain"
                    alt={galleryFiles[galleryIndex]}
                  />
                </div>
                <p className="text-[9px] font-mono opacity-30 truncate shrink-0 text-center">
                  {galleryFiles[galleryIndex]}
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setGalleryIndex(i => Math.max(0, i - 1))}
                    disabled={galleryIndex === 0}
                    className="flex-1 h-7 rounded-lg text-xs font-medium disabled:opacity-20 transition-opacity"
                    style={{ backgroundColor: theme.input, color: theme.text }}
                  >
                    ← Prev
                  </button>
                  <button
                    onClick={() => setGalleryIndex(i => Math.min(galleryFiles.length - 1, i + 1))}
                    disabled={galleryIndex === galleryFiles.length - 1}
                    className="flex-1 h-7 rounded-lg text-xs font-medium disabled:opacity-20 transition-opacity"
                    style={{ backgroundColor: theme.input, color: theme.text }}
                  >
                    Next →
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Cost Summary Section */}
          <div className="px-4 py-3 border-t shrink-0" style={{ borderColor: theme.border, backgroundColor: theme.input }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-30">Last Call</span>
              <span className="text-[10px] font-mono font-medium opacity-60">${lastCallCost.toFixed(6)}</span>
            </div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-30">This Session</span>
              <span className="text-[10px] font-mono font-medium opacity-60">${sessionCost.toFixed(6)}</span>
            </div>
            <div className="flex items-center justify-between" style={{ borderTop: `1px solid ${theme.border}`, paddingTop: '6px', marginTop: '4px' }}>
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-50">All Time</span>
              <span className="text-[10px] font-mono font-bold opacity-80">${allTimeCost.toFixed(6)}</span>
            </div>
          </div>
        </aside>

        {/* Main Content: Generated Results */}
        <div className="flex-1 flex flex-col overflow-hidden transition-colors duration-300" style={{ backgroundColor: theme.bg }}>
          {/* Search Bar */}
          <div className="h-14 border-b flex items-center px-6 gap-4 shrink-0" style={{ borderColor: theme.border }}>
            <Search className="w-4 h-4 opacity-20" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search wildcards..."
              className="flex-1 bg-transparent border-none text-sm focus:ring-0 placeholder:opacity-20"
            />
          </div>

          {/* Split Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Generated Section */}
            <div className="flex-1 flex flex-col border-r overflow-hidden" style={{ borderColor: theme.border }}>
              <div className="border-b shrink-0" style={{ borderColor: theme.border }}>
                <div className="p-4 flex items-center justify-between">
                  <h2 className="text-[10px] font-bold uppercase tracking-wider opacity-40">Generated ({filteredGenerated.length})</h2>
                  <button
                    onClick={() => setClearGeneratedConfirm(true)}
                    disabled={generatedWildcards.length === 0}
                    className="flex items-center gap-1.5 px-2 py-1 hover:bg-black/5 rounded-md transition-colors opacity-40 hover:opacity-100 disabled:opacity-20 disabled:cursor-not-allowed text-[10px] font-medium"
                  >
                    <Trash2 className="w-3 h-3" /> Clear
                  </button>
                </div>
                <AnimatePresence>
                  {clearGeneratedConfirm && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-3 flex items-center justify-between gap-3 border-t pt-3" style={{ borderColor: theme.border }}>
                        <p className="text-[10px] opacity-60 leading-tight">
                          Delete <span className="font-bold text-red-500">{generatedWildcards.length} wildcard{generatedWildcards.length !== 1 ? 's' : ''}</span> permanently?
                        </p>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => setClearGeneratedConfirm(false)} className="px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors" style={{ backgroundColor: theme.input }}>Cancel</button>
                          <button onClick={clearGenerated} className="px-2.5 py-1 rounded-md text-[10px] font-bold text-white bg-red-500 hover:bg-red-600 transition-colors">Delete all</button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <Reorder.Group
                  axis="y"
                  values={filteredGenerated}
                  onReorder={(reordered) => {
                    const merged = mergeReorder(generatedWildcards, reordered);
                    setGeneratedWildcards(merged);
                    dbApi.reorder('generated', merged.map(w => w.id));
                  }}
                  className="flex flex-col gap-4"
                >
                  <AnimatePresence mode="popLayout">
                    {filteredGenerated.map((item) => (
                      <Reorder.Item
                        key={item.id}
                        value={item}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        dragListener={true}
                        className={cn(
                          "group relative border rounded-xl transition-colors cursor-grab active:cursor-grabbing overflow-hidden select-none",
                          item.createdAt === lastGenerationTime ? "ring-1" : ""
                        )}
                        style={{
                          backgroundColor: theme.card,
                          borderColor: item.createdAt === lastGenerationTime ? theme.accent : theme.border,
                          '--tw-ring-color': theme.accent
                        } as any}
                        onClick={() => handleCopy(item.text, item.id)}
                        onMouseEnter={(e) => {
                          if (item.previewUrl) {
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            setPreviewHover({ url: item.previewUrl, x: rect.right, y: rect.top });
                          }
                        }}
                        onMouseLeave={() => setPreviewHover(null)}
                      >
                        {item.previewUrl && (
                          <div className="absolute top-2 right-2 w-8 h-8 rounded-md overflow-hidden border z-10 opacity-70 pointer-events-none" style={{ borderColor: theme.border }}>
                            <img src={item.previewUrl} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="p-4">
                          <p className="text-[11px] font-mono opacity-60 leading-relaxed whitespace-pre-wrap break-words">
                            {item.text}
                          </p>
                        </div>
                        <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <button
                            onClick={(e) => { e.stopPropagation(); saveToSavedList(item); }}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 border rounded-md transition-all shadow-sm text-[10px] font-medium"
                            style={{ backgroundColor: theme.card, borderColor: theme.border }}
                          >
                            <Save className="w-3 h-3" /> Save
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRefine(item.text); }}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 border rounded-md transition-all shadow-sm text-[10px] font-medium"
                            style={{ backgroundColor: theme.card, borderColor: theme.border }}
                          >
                            <Sparkles className="w-3 h-3" /> Refine
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setPreviewForWildcard(item.id, `/gallery-images/${galleryFiles[galleryIndex]}`, 'generated'); }}
                            disabled={!galleryEnabled || galleryFiles.length === 0}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 border rounded-md transition-all shadow-sm text-[10px] font-medium disabled:opacity-20"
                            style={{ backgroundColor: item.previewUrl ? theme.accent : theme.card, borderColor: item.previewUrl ? theme.accent : theme.border, color: item.previewUrl ? (theme.id === 'dark' ? '#000' : '#fff') : undefined }}
                          >
                            <ImageIcon className="w-3 h-3" /> Preview
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeGenerated(item.id); }}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 border rounded-md transition-all shadow-sm text-[10px] font-medium hover:text-red-500"
                            style={{ backgroundColor: theme.card, borderColor: theme.border }}
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </div>
                        <AnimatePresence>
                          {copiedIndex === item.id && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 backdrop-blur-sm flex items-center justify-center z-20"
                              style={{ backgroundColor: `${theme.card}e6` }}
                            >
                              <div className="flex items-center gap-2 text-emerald-600">
                                <Check className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Copied</span>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </Reorder.Item>
                    ))}
                  </AnimatePresence>
                </Reorder.Group>
              </div>
            </div>

            {/* Saved Section */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="border-b shrink-0" style={{ borderColor: theme.border }}>
                <div className="p-4 flex items-center justify-between">
                  <h2 className="text-[10px] font-bold uppercase tracking-wider opacity-40">Saved ({filteredSaved.length})</h2>
                  <button
                    onClick={() => setClearSavedConfirm(true)}
                    disabled={savedWildcards.length === 0}
                    className="flex items-center gap-1.5 px-2 py-1 hover:bg-black/5 rounded-md transition-colors opacity-40 hover:opacity-100 disabled:opacity-20 disabled:cursor-not-allowed text-[10px] font-medium"
                  >
                    <Trash2 className="w-3 h-3" /> Clear
                  </button>
                </div>
                <AnimatePresence>
                  {clearSavedConfirm && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-3 flex items-center justify-between gap-3 border-t pt-3" style={{ borderColor: theme.border }}>
                        <p className="text-[10px] opacity-60 leading-tight">
                          Delete <span className="font-bold text-red-500">{savedWildcards.length} wildcard{savedWildcards.length !== 1 ? 's' : ''}</span> permanently?
                        </p>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => setClearSavedConfirm(false)} className="px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors" style={{ backgroundColor: theme.input }}>Cancel</button>
                          <button onClick={clearSaved} className="px-2.5 py-1 rounded-md text-[10px] font-bold text-white bg-red-500 hover:bg-red-600 transition-colors">Delete all</button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <Reorder.Group
                  axis="y"
                  values={filteredSaved}
                  onReorder={(reordered) => {
                    const merged = mergeReorder(savedWildcards, reordered);
                    setSavedWildcards(merged);
                    dbApi.reorder('saved', merged.map(w => w.id));
                  }}
                  className="flex flex-col gap-4"
                >
                  <AnimatePresence mode="popLayout">
                    {filteredSaved.map((item) => (
                      <Reorder.Item
                        key={item.id}
                        value={item}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        dragListener={true}
                        className="group relative border rounded-xl transition-colors cursor-grab active:cursor-grabbing overflow-hidden select-none"
                        style={{ backgroundColor: theme.card, borderColor: theme.border }}
                        onClick={() => handleCopy(item.text, item.id)}
                        onMouseEnter={(e) => {
                          if (item.previewUrl) {
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            setPreviewHover({ url: item.previewUrl, x: rect.right, y: rect.top });
                          }
                        }}
                        onMouseLeave={() => setPreviewHover(null)}
                      >
                        {item.previewUrl && (
                          <div className="absolute top-2 right-2 w-8 h-8 rounded-md overflow-hidden border z-10 opacity-70 pointer-events-none" style={{ borderColor: theme.border }}>
                            <img src={item.previewUrl} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="p-4">
                          <p className="text-[11px] font-mono opacity-60 leading-relaxed whitespace-pre-wrap break-words">
                            {item.text}
                          </p>
                        </div>
                        <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRefine(item.text); }}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 border rounded-md transition-all shadow-sm text-[10px] font-medium"
                            style={{ backgroundColor: theme.card, borderColor: theme.border }}
                          >
                            <Sparkles className="w-3 h-3" /> Refine
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setPreviewForWildcard(item.id, `/gallery-images/${galleryFiles[galleryIndex]}`, 'saved'); }}
                            disabled={!galleryEnabled || galleryFiles.length === 0}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 border rounded-md transition-all shadow-sm text-[10px] font-medium disabled:opacity-20"
                            style={{ backgroundColor: item.previewUrl ? theme.accent : theme.card, borderColor: item.previewUrl ? theme.accent : theme.border, color: item.previewUrl ? (theme.id === 'dark' ? '#000' : '#fff') : undefined }}
                          >
                            <ImageIcon className="w-3 h-3" /> Preview
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeSaved(item.id); }}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 border rounded-md transition-all shadow-sm text-[10px] font-medium hover:text-red-500"
                            style={{ backgroundColor: theme.card, borderColor: theme.border }}
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </div>
                        <AnimatePresence>
                          {copiedIndex === item.id && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 backdrop-blur-sm flex items-center justify-center z-20"
                              style={{ backgroundColor: `${theme.card}e6` }}
                            >
                              <div className="flex items-center gap-2 text-emerald-600">
                                <Check className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Copied</span>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </Reorder.Item>
                    ))}
                  </AnimatePresence>
                </Reorder.Group>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Refine Bar */}
      <AnimatePresence>
        {refiningWildcard && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-6 pb-4 pointer-events-none"
          >
            <div
              className="max-w-2xl w-full rounded-2xl shadow-2xl border-2 pointer-events-auto"
              style={{ backgroundColor: theme.card, borderColor: theme.accent + '60' }}
            >
              <div className="flex items-start gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-3 h-3 shrink-0" style={{ color: theme.accent }} />
                    <span className="text-[9px] font-bold uppercase tracking-widest opacity-40">Refining this wildcard — type your instructions in the sidebar and hit Generate</span>
                  </div>
                  <p className="text-sm font-mono leading-relaxed opacity-70 whitespace-pre-wrap break-words line-clamp-3">
                    {refiningWildcard}
                  </p>
                </div>
                <button
                  onClick={() => setRefiningWildcard(null)}
                  className="shrink-0 p-1.5 rounded-lg transition-colors opacity-40 hover:opacity-100"
                  style={{ backgroundColor: theme.input }}
                  title="Clear refine selection"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating preview on wildcard hover */}
      {previewHover && (
        <div
          className="fixed z-[200] pointer-events-none rounded-xl overflow-hidden shadow-2xl border"
          style={{
            left: Math.min(previewHover.x + 10, window.innerWidth - 220),
            top: Math.max(8, Math.min(previewHover.y, window.innerHeight - 220)),
            width: 210,
            height: 210,
            backgroundColor: theme.card,
            borderColor: theme.border,
          }}
        >
          <img
            src={previewHover.url}
            className="w-full h-full object-contain"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${theme.scrollbar};
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${theme.accent}40;
        }
      `}</style>
    </div>
  );
}
