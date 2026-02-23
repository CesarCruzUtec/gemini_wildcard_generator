/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
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
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
  const [theme, setTheme] = useState<Theme>(THEMES[0]);
  const [systemInstruction, setSystemInstruction] = useState(DEFAULT_SYSTEM_INSTRUCTION);
  const [userPrompt, setUserPrompt] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [numToGenerate, setNumToGenerate] = useState(5);
  const [totalCost, setTotalCost] = useState(0);
  const [lastCallCost, setLastCallCost] = useState(0);
  const [generatedWildcards, setGeneratedWildcards] = useState<{ id: string; text: string; createdAt: number }[]>([]);
  const [savedWildcards, setSavedWildcards] = useState<{ id: string; text: string; createdAt: number }[]>([]);
  const [lastGenerationTime, setLastGenerationTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [customApiKey, setCustomApiKey] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [refiningWildcard, setRefiningWildcard] = useState<string | null>(null);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

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
      const keyToUse = customApiKey || process.env.GEMINI_API_KEY;
      if (!keyToUse) {
        alert("Please provide a Gemini API Key in settings.");
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
          setTotalCost(prev => prev + batchCost);
        }

        const text = response.text || '';
        const lines = text.split('\n').filter(line => line.trim().length > 0).slice(0, count);

        const newItems = lines.map(l => ({
          id: Math.random().toString(36).substr(2, 9),
          text: l,
          createdAt: generationTime
        }));

        setGeneratedWildcards(prev => [...newItems, ...prev]);
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

  const saveToSavedList = (item: { id: string; text: string; createdAt: number }) => {
    if (!savedWildcards.find(s => s.text === item.text)) {
      setSavedWildcards(prev => [item, ...prev]);
    }
  };

  const removeSaved = (id: string) => {
    setSavedWildcards(prev => prev.filter(s => s.id !== id));
  };

  const removeGenerated = (id: string) => {
    setGeneratedWildcards(prev => prev.filter(s => s.id !== id));
  };

  const clearSaved = () => {
    if (confirm("Clear all saved wildcards?")) {
      setSavedWildcards([]);
    }
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
      const newSaved = lines.map(l => ({
        id: Math.random().toString(36).substr(2, 9),
        text: l,
        createdAt: Date.now()
      }));
      setSavedWildcards(prev => [...newSaved, ...prev]);
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
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold uppercase tracking-wider opacity-40">Theme</label>
            <select
              value={theme.id}
              onChange={(e) => setTheme(THEMES.find(t => t.id === e.target.value) || THEMES[0])}
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
            className="p-2 rounded-md transition-colors hover:bg-black/5"
            style={{ color: theme.muted }}
            title="How to use"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-md transition-colors"
            style={{
              backgroundColor: showSettings ? theme.input : 'transparent',
              color: showSettings ? theme.accent : theme.muted
            }}
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </header>

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
                  <h3 className="text-xs font-bold uppercase tracking-widest opacity-40">1. Generate</h3>
                  <p className="text-sm leading-relaxed opacity-70">
                    Enter a prompt in the <span className="font-bold">Request</span> box. You can also upload up to <span className="font-bold">4 reference images</span> to guide the generation. Set the <span className="font-bold">Count</span> and hit <span className="font-bold">Generate</span>.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest opacity-40">2. Refine</h3>
                  <p className="text-sm leading-relaxed opacity-70">
                    Found a wildcard you like? Click the <Sparkles className="w-3 h-3 inline" /> <span className="font-bold">Refine</span> button. The card will appear in the sidebar as a reference, allowing you to provide specific refinement instructions.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest opacity-40">3. Organize & Search</h3>
                  <p className="text-sm leading-relaxed opacity-70">
                    The app is split into <span className="font-bold">Generated</span> and <span className="font-bold">Saved</span> grids. Use the <span className="font-bold">Search Bar</span> at the top to filter both sections simultaneously. You can also <span className="font-bold">drag and drop</span> cards to reorder them.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest opacity-40">4. Save & Export</h3>
                  <p className="text-sm leading-relaxed opacity-70">
                    Click the <Save className="w-3 h-3 inline" /> <span className="font-bold">Save</span> button to move a wildcard to your permanent list. Use the <Upload className="w-3 h-3 inline" /> <span className="font-bold">Import</span> or <Download className="w-3 h-3 inline" /> <span className="font-bold">Export</span> buttons to manage your <code className="px-1.5 py-0.5 rounded bg-black/5 font-mono text-xs">.txt</code> files.
                  </p>
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-widest opacity-40">5. Cost & Themes</h3>
                  <p className="text-sm leading-relaxed opacity-70">
                    Monitor API usage at the bottom of the sidebar. Switch between various <span className="font-bold">Themes</span> in the header to find your preferred aesthetic.
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
                  <div className="relative">
                    <input
                      type="password"
                      value={customApiKey}
                      onChange={(e) => setCustomApiKey(e.target.value)}
                      placeholder={process.env.GEMINI_API_KEY ? "Using environment key (••••••••)" : "Enter your API key..."}
                      className="w-full h-10 border-none rounded-lg px-4 text-xs focus:ring-1 transition-all pr-10"
                      style={{
                        backgroundColor: theme.input,
                        color: theme.text,
                        '--tw-ring-color': theme.accent
                      } as any}
                    />
                    {customApiKey && (
                      <button
                        onClick={() => setCustomApiKey('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-20 hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <p className="text-[9px] opacity-30 leading-relaxed">
                    Your API key is stored only in your browser's memory for this session.
                    If left empty, the app will attempt to use the system default key.
                  </p>
                </div>

                <div className="pt-4 border-t" style={{ borderColor: theme.border }}>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="w-full h-10 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
                    style={{ backgroundColor: theme.accent, color: theme.id === 'dark' ? '#000' : '#fff' }}
                  >
                    Close Settings
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
            {refiningWildcard && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-wider opacity-40">Refining Card</label>
                  <button
                    onClick={() => setRefiningWildcard(null)}
                    className="text-[10px] font-bold text-red-500 opacity-60 hover:opacity-100 transition-opacity"
                  >
                    Clear
                  </button>
                </div>
                <div
                  className="p-3 rounded-xl border text-[11px] font-mono leading-relaxed shadow-sm"
                  style={{ backgroundColor: theme.card, borderColor: theme.accent }}
                >
                  <div className="opacity-70 whitespace-pre-wrap break-words">
                    {refiningWildcard}
                  </div>
                </div>
              </div>
            )}

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

          <div className="flex-1" />

          {/* Cost Summary Section */}
          <div className="px-4 py-3 border-t shrink-0" style={{ borderColor: theme.border, backgroundColor: theme.input }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-30">Session Cost</span>
              <span className="text-[10px] font-mono font-medium opacity-60">${lastCallCost.toFixed(6)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-30">Total Cost</span>
              <span className="text-[10px] font-mono font-medium opacity-60">${totalCost.toFixed(6)}</span>
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
              <div className="p-4 border-b flex items-center justify-between shrink-0" style={{ borderColor: theme.border }}>
                <h2 className="text-[10px] font-bold uppercase tracking-wider opacity-40">Generated ({filteredGenerated.length})</h2>
                <button
                  onClick={() => setGeneratedWildcards([])}
                  className="p-1 hover:bg-black/5 rounded-md transition-colors opacity-40 hover:opacity-100"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <Reorder.Group
                  axis="y"
                  values={filteredGenerated}
                  onReorder={(reordered) => setGeneratedWildcards(prev => mergeReorder(prev, reordered))}
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
                      >
                        <div className="p-4">
                          <p className="text-[11px] font-mono opacity-60 leading-relaxed whitespace-pre-wrap break-words">
                            {item.text}
                          </p>
                        </div>
                        <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <button
                            onClick={(e) => { e.stopPropagation(); saveToSavedList(item); }}
                            className="p-1.5 border rounded-md transition-all shadow-sm"
                            style={{ backgroundColor: theme.card, borderColor: theme.border }}
                          >
                            <Save className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRefine(item.text); }}
                            className="p-1.5 border rounded-md transition-all shadow-sm"
                            style={{ backgroundColor: theme.card, borderColor: theme.border }}
                          >
                            <Sparkles className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeGenerated(item.id); }}
                            className="p-1.5 border rounded-md transition-all shadow-sm hover:text-red-500"
                            style={{ backgroundColor: theme.card, borderColor: theme.border }}
                          >
                            <Trash2 className="w-3 h-3" />
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
              <div className="p-4 border-b flex items-center justify-between shrink-0" style={{ borderColor: theme.border }}>
                <h2 className="text-[10px] font-bold uppercase tracking-wider opacity-40">Saved ({filteredSaved.length})</h2>
                <div className="flex gap-2">
                  <button onClick={() => fileInputRef.current?.click()} className="p-1 opacity-40 hover:opacity-100" title="Import">
                    <Upload className="w-3 h-3" />
                  </button>
                  <button onClick={downloadWildcards} className="p-1 opacity-40 hover:opacity-100" title="Export">
                    <Download className="w-3 h-3" />
                  </button>
                  <button onClick={clearSaved} className="p-1 opacity-40 hover:opacity-100 hover:text-red-500" title="Clear All">
                    <Trash2 className="w-3 h-3" />
                  </button>
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".txt" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <Reorder.Group
                  axis="y"
                  values={filteredSaved}
                  onReorder={(reordered) => setSavedWildcards(prev => mergeReorder(prev, reordered))}
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
                      >
                        <div className="p-4">
                          <p className="text-[11px] font-mono opacity-60 leading-relaxed whitespace-pre-wrap break-words">
                            {item.text}
                          </p>
                        </div>
                        <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRefine(item.text); }}
                            className="p-1.5 border rounded-md transition-all shadow-sm"
                            style={{ backgroundColor: theme.card, borderColor: theme.border }}
                          >
                            <Sparkles className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeSaved(item.id); }}
                            className="p-1.5 border rounded-md transition-all shadow-sm hover:text-red-500"
                            style={{ backgroundColor: theme.card, borderColor: theme.border }}
                          >
                            <Trash2 className="w-3 h-3" />
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
