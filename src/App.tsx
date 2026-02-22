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
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DEFAULT_SYSTEM_INSTRUCTION = `You are a professional booru tag expert for Stable Diffusion and ComfyUI. 
Your task is to generate high-quality costume/clothing wildcards. 
Each wildcard must be a single line of comma-separated booru tags.
Example: "white_shirt, pleated_skirt, black_necktie, loafers, school_uniform"
Provide exactly 5 distinct variations based on the user's request. 
Output ONLY the wildcards, one per line. Do not include numbering, labels, or any other text.`;

export default function App() {
  const [systemInstruction, setSystemInstruction] = useState(DEFAULT_SYSTEM_INSTRUCTION);
  const [userPrompt, setUserPrompt] = useState('');
  const [numToGenerate, setNumToGenerate] = useState(12);
  const [totalCost, setTotalCost] = useState(0);
  const [lastCallCost, setLastCallCost] = useState(0);
  const [generatedWildcards, setGeneratedWildcards] = useState<string[]>([]);
  const [savedWildcards, setSavedWildcards] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateWildcards = async (prompt: string, isRefining = false) => {
    const targetPrompt = prompt.trim() || "Generate random, creative, and unique costume/clothing booru tag wildcards. Surprise me with different styles (e.g., fantasy, sci-fi, historical, modern, avant-garde).";
    setIsLoading(true);
    
    // If not refining, clear previous results to show fresh ones
    if (!isRefining) {
      setGeneratedWildcards([]);
      setLastCallCost(0);
    }
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = "gemini-3-flash-preview";
      
      const totalNeeded = isRefining ? 1 : numToGenerate;
      const batchSize = 10;
      const batches: number[] = [];
      
      for (let i = 0; i < totalNeeded; i += batchSize) {
        batches.push(Math.min(batchSize, totalNeeded - i));
      }

      let sessionCost = 0;

      for (const count of batches) {
        const batchPrompt = isRefining 
          ? `Refine this wildcard: "${prompt}". User request for refinement: ${userPrompt}. Output ONLY 1 line of booru tags.`
          : `${targetPrompt} Provide exactly ${count} distinct variations. Output ONLY the wildcards, one per line.`;

        const response = await ai.models.generateContent({
          model,
          contents: batchPrompt,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.8,
          },
        });

        // Calculate cost (Estimated based on Gemini 1.5 Flash pricing)
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
        
        if (isRefining) {
          setGeneratedWildcards(prev => [...lines, ...prev]);
        } else {
          setGeneratedWildcards(prev => [...prev, ...lines]);
        }
      }
      setLastCallCost(sessionCost);
    } catch (error) {
      console.error("Generation failed:", error);
      alert("Failed to generate wildcards.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const saveToSavedList = (wildcard: string) => {
    if (!savedWildcards.includes(wildcard)) {
      setSavedWildcards(prev => [wildcard, ...prev]);
    }
  };

  const removeSaved = (index: number) => {
    setSavedWildcards(prev => prev.filter((_, i) => i !== index));
  };

  const clearSaved = () => {
    if (confirm("Clear all saved wildcards?")) {
      setSavedWildcards([]);
    }
  };

  const downloadWildcards = () => {
    if (savedWildcards.length === 0) return;
    const content = savedWildcards.join('\n');
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
      setSavedWildcards(prev => [...new Set([...lines, ...prev])]);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRefine = (wildcard: string) => {
    if (!userPrompt.trim()) {
      alert("Enter a refinement instruction in the 'Request' box first.");
      return;
    }
    generateWildcards(wildcard, true);
  };

  return (
    <div className="h-screen flex flex-col bg-[#fafafa] text-[#1a1a1a] font-sans overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-black/5 bg-white flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-black" />
          <h1 className="text-sm font-medium tracking-tight">Wildcard Studio</h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              "p-2 rounded-md transition-colors",
              showSettings ? "bg-black/5 text-black" : "text-black/40 hover:text-black hover:bg-black/5"
            )}
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Input & Saved */}
        <aside className="w-80 border-r border-black/5 flex flex-col shrink-0 bg-white">
          {/* Input Section */}
          <div className="p-6 space-y-4 border-b border-black/5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-black/40">Request</label>
              <textarea 
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="e.g., cyberpunk street wear..."
                className="w-full h-24 bg-black/5 border-none rounded-lg p-3 text-sm focus:ring-1 focus:ring-black/10 transition-all resize-none placeholder:text-black/20"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-black/40">Count</label>
              <input 
                type="number"
                min="1"
                max="100"
                value={numToGenerate}
                onChange={(e) => setNumToGenerate(parseInt(e.target.value) || 1)}
                className="w-full h-9 bg-black/5 border-none rounded-lg px-3 text-xs focus:ring-1 focus:ring-black/10 transition-all"
              />
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => generateWildcards(userPrompt)}
                disabled={isLoading || !userPrompt.trim()}
                className="flex-1 h-10 bg-black text-white text-xs font-medium rounded-lg hover:bg-black/80 disabled:bg-black/10 disabled:text-black/20 transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : "Generate"}
              </button>
              <button 
                onClick={() => { setUserPrompt(''); generateWildcards(''); }}
                disabled={isLoading}
                className="w-10 h-10 bg-black/5 text-black/40 hover:text-black hover:bg-black/10 rounded-lg transition-all flex items-center justify-center"
                title="Surprise Me"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
              </button>
            </div>
          </div>

          {/* Saved Section */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 flex items-center justify-between shrink-0">
              <h2 className="text-[10px] font-bold uppercase tracking-wider text-black/40 flex items-center gap-2">
                <FileText className="w-3 h-3" />
                Saved ({savedWildcards.length})
              </h2>
              <div className="flex gap-1">
                <button onClick={() => fileInputRef.current?.click()} className="p-1.5 text-black/40 hover:text-black hover:bg-black/5 rounded-md transition-colors" title="Import">
                  <Upload className="w-3.5 h-3.5" />
                </button>
                <button onClick={downloadWildcards} disabled={savedWildcards.length === 0} className="p-1.5 text-black/40 hover:text-black hover:bg-black/5 rounded-md transition-colors disabled:opacity-10" title="Export">
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button onClick={clearSaved} disabled={savedWildcards.length === 0} className="p-1.5 text-black/40 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:opacity-10" title="Clear All">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".txt" />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2 custom-scrollbar">
              <AnimatePresence initial={false}>
                {savedWildcards.map((wildcard, idx) => (
                  <motion.div 
                    key={`${wildcard}-${idx}`}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="group relative p-3 bg-black/5 hover:bg-black/10 rounded-lg transition-all"
                  >
                    <p className="text-[11px] font-mono text-black/70 leading-relaxed pr-6">
                      {wildcard}
                    </p>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                      <button onClick={() => handleCopy(wildcard, idx + 1000)} className="p-1 text-black/30 hover:text-black">
                        {copiedIndex === idx + 1000 ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                      <button onClick={() => removeSaved(idx)} className="p-1 text-black/30 hover:text-red-500">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {savedWildcards.length === 0 && (
                <div className="py-12 text-center border border-dashed border-black/5 rounded-xl">
                  <p className="text-[10px] text-black/20 font-medium">Empty</p>
                </div>
              )}
            </div>
          </div>

          {/* Cost Summary Section */}
          <div className="px-4 py-3 border-t border-black/5 bg-black/[0.02] shrink-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-black/30">Session Cost</span>
              <span className="text-[10px] font-mono font-medium text-black/60">${lastCallCost.toFixed(6)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-black/30">Total Cost</span>
              <span className="text-[10px] font-mono font-medium text-black/60">${totalCost.toFixed(6)}</span>
            </div>
          </div>
        </aside>

        {/* Main Content: Generated Results */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {/* Settings Overlay */}
          <AnimatePresence>
            {showSettings && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-14 left-80 right-0 z-40 bg-white border-b border-black/5 p-6 shadow-sm"
              >
                <div className="max-w-2xl mx-auto space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-black/40">System Instructions</label>
                    <button onClick={() => setSystemInstruction(DEFAULT_SYSTEM_INSTRUCTION)} className="text-[10px] font-bold text-black/40 hover:text-black transition-colors">Reset</button>
                  </div>
                  <textarea 
                    value={systemInstruction}
                    onChange={(e) => setSystemInstruction(e.target.value)}
                    className="w-full h-32 bg-black/5 border-none rounded-lg p-4 text-xs font-mono focus:ring-1 focus:ring-black/10 transition-all resize-none"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="max-w-6xl mx-auto p-10 space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-bold uppercase tracking-wider text-black/40">Generated Wildcards ({generatedWildcards.length})</h2>
                {generatedWildcards.length > 0 && (
                  <button onClick={() => generateWildcards(userPrompt)} className="text-[10px] font-bold text-black/40 hover:text-black flex items-center gap-1 transition-colors">
                    <RefreshCw className="w-3 h-3" />
                    Refresh
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                  {isLoading && generatedWildcards.length === 0 ? (
                    <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="col-span-full space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                          <div key={i} className="h-32 bg-black/5 rounded-xl animate-pulse" />
                        ))}
                      </div>
                    </motion.div>
                  ) : generatedWildcards.length > 0 ? (
                    generatedWildcards.map((wildcard, idx) => (
                      <motion.div 
                        key={`${wildcard}-${idx}`}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="group relative h-32 bg-white border border-black/5 hover:border-black/20 rounded-xl transition-all cursor-pointer overflow-hidden"
                        onClick={() => handleCopy(wildcard, idx)}
                      >
                        {/* Content */}
                        <div className="p-4 h-full flex flex-col">
                          <p className="text-[11px] font-mono text-black/50 leading-relaxed line-clamp-4 group-hover:opacity-0 transition-opacity">
                            {wildcard}
                          </p>
                          <div className="absolute inset-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity bg-white/50 backdrop-blur-[2px] overflow-y-auto custom-scrollbar">
                            <p className="text-[11px] font-mono text-black leading-relaxed">
                              {wildcard}
                            </p>
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <button 
                            onClick={(e) => { e.stopPropagation(); saveToSavedList(wildcard); }}
                            className="p-1.5 bg-white border border-black/10 rounded-md hover:bg-black hover:text-white transition-all shadow-sm"
                            title="Save"
                          >
                            <Save className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleRefine(wildcard); }}
                            className="p-1.5 bg-white border border-black/10 rounded-md hover:bg-black hover:text-white transition-all shadow-sm"
                            title="Refine"
                          >
                            <Sparkles className="w-3 h-3" />
                          </button>
                        </div>
                        
                        {/* Copy Indicator */}
                        <AnimatePresence>
                          {copiedIndex === idx && (
                            <motion.div 
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center z-20"
                            >
                              <div className="flex items-center gap-2 text-emerald-600">
                                <Check className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Copied</span>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))
                  ) : (
                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="col-span-full py-32 flex flex-col items-center justify-center text-center space-y-4">
                      <div className="w-12 h-12 bg-black/5 rounded-full flex items-center justify-center">
                        <Plus className="w-5 h-5 text-black/20" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-black/30 font-medium">No wildcards generated</p>
                        <p className="text-[10px] text-black/20">Enter a request to begin</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Loading indicator for subsequent batches */}
                {isLoading && generatedWildcards.length > 0 && (
                  <div className="col-span-full flex justify-center py-4">
                    <RefreshCw className="w-4 h-4 animate-spin text-black/20" />
                  </div>
                )}
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
          background: rgba(0, 0, 0, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </div>
  );
}
