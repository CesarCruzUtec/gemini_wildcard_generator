/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Theme, WildcardItem } from './types';
import { THEMES, DEFAULT_SYSTEM_INSTRUCTION } from './constants';
import { dbApi } from './api/dbApi';
import { useLocalStorage } from './hooks/useLocalStorage';

import { Header } from './components/Header';
import { SettingsOverlay } from './components/SettingsOverlay';
import { ResetDbModal } from './components/modals/ResetDbModal';
import { GuideModal } from './components/modals/GuideModal';
import { Sidebar } from './components/Sidebar';
import { WildcardList } from './components/WildcardList';
import { RefineBar } from './components/RefineBar';
import { PreviewHover } from './components/PreviewHover';

export default function App() {
  // ── Persisted in localStorage ────────────────────────────────────────────
  const [themeId, setThemeId] = useLocalStorage('themeId', 'dark');
  const [systemInstruction, setSystemInstruction] = useLocalStorage('systemInstruction', DEFAULT_SYSTEM_INSTRUCTION);
  const [userPrompt, setUserPrompt] = useLocalStorage('userPrompt', '');
  const [numToGenerate, setNumToGenerate] = useLocalStorage('numToGenerate', 5);
  const [referenceImages, setReferenceImages] = useLocalStorage<string[]>('referenceImages', []);

  const theme: Theme = THEMES.find((t) => t.id === themeId) ?? THEMES[1];

  // ── Session-only state ───────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [allTimeCost, setAllTimeCost] = useState(0);
  const [sessionCost, setSessionCost] = useState(0);
  const [lastCallCost, setLastCallCost] = useState(0);
  const [generatedWildcards, setGeneratedWildcards] = useState<WildcardItem[]>([]);
  const [savedWildcards, setSavedWildcards] = useState<WildcardItem[]>([]);
  const [lastGenerationTime, setLastGenerationTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
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

  const sessionIdRef = useRef<string | null>(null);
  const sessionCostRef = useRef(0);
  const initializedRef = useRef(false);

  // ── Load data on mount ───────────────────────────────────────────────────
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    Promise.all([dbApi.fetchList('generated'), dbApi.fetchList('saved')])
      .then(([generated, saved]) => {
        setGeneratedWildcards(generated);
        setSavedWildcards(saved);
      })
      .catch(() => {});

    const label = new Date().toLocaleString();
    dbApi.createSession(label)
      .then((id) => { sessionIdRef.current = id; })
      .catch(() => {});

    dbApi.fetchCosts()
      .then(({ total }) => setAllTimeCost(total))
      .catch(() => {});

    dbApi.fetchConfig()
      .then(({ galleryDir, apiKey: key }) => {
        setGalleryPath(galleryDir);
        setGalleryPathInput(galleryDir);
        setApiKey(key);
        setApiKeyInput(key);
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

  // ── Sync settings inputs when panel opens ────────────────────────────────
  useEffect(() => {
    if (showSettings) {
      setGalleryPathInput(galleryPath);
      setApiKeyInput(apiKey);
    }
  }, [showSettings]); // eslint-disable-line react-hooks/exhaustive-deps

  const galleryEnabled = galleryPath.trim() !== '';
  const currentGalleryImageUrl =
    galleryFiles.length > 0 ? `/gallery-images/${galleryFiles[galleryIndex]}` : '';

  // ── Generation ───────────────────────────────────────────────────────────
  const generateWildcards = async () => {
    setIsLoading(true);
    setLastCallCost(0);
    const generationTime = Date.now();
    setLastGenerationTime(generationTime);

    try {
      const keyToUse = apiKey.trim();
      if (!keyToUse) {
        alert('Please set a Gemini API Key in Settings.');
        setShowSettings(true);
        setIsLoading(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey: keyToUse });
      const model = 'gemini-3-flash-preview';
      const batchSize = 10;
      const batches: number[] = [];
      for (let i = 0; i < numToGenerate; i += batchSize) {
        batches.push(Math.min(batchSize, numToGenerate - i));
      }

      let callCost = 0;

      for (const count of batches) {
        const batchPrompt = refiningWildcard
          ? `Refine this wildcard: "${refiningWildcard}". User request: ${userPrompt}. Provide exactly ${count} distinct variations. Output ONLY the wildcards, one per line.`
          : `${userPrompt}. Provide exactly ${count} distinct variations. Output ONLY the wildcards, one per line.`;

        const parts: { text?: string; inlineData?: { data: string; mimeType: string } }[] = [
          { text: batchPrompt },
        ];
        referenceImages.forEach((img) => {
          parts.push({ inlineData: { data: img.split(',')[1], mimeType: 'image/jpeg' } });
        });

        const response = await ai.models.generateContent({
          model,
          contents: { parts },
          config: { systemInstruction, temperature: 0.8 },
        });

        const usage = response.usageMetadata;
        if (usage) {
          const inputCost = (usage.promptTokenCount || 0) * (0.5 / 1_000_000);
          const outputCost = (usage.candidatesTokenCount || 0) * (3.0 / 1_000_000);
          const batchCost = inputCost + outputCost;
          callCost += batchCost;
          sessionCostRef.current += batchCost;
          setSessionCost(sessionCostRef.current);
          setAllTimeCost((prev) => prev + batchCost);
          if (sessionIdRef.current) dbApi.updateSession(sessionIdRef.current, sessionCostRef.current);
          dbApi.addToTotal(batchCost);
        }

        const lines = (response.text || '')
          .split('\n')
          .filter((l) => l.trim().length > 0)
          .slice(0, count);

        const newItems: WildcardItem[] = lines.map((l) => ({
          id: crypto.randomUUID(),
          text: l,
          createdAt: generationTime,
        }));

        setGeneratedWildcards((prev) => [...newItems, ...prev]);
        dbApi.add(newItems.map((item) => ({ ...item, list: 'generated' })));
      }

      setLastCallCost(callCost);
      setRefiningWildcard(null);
    } catch (error) {
      console.error('Generation failed:', error);
      alert('Failed to generate wildcards.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Wildcard actions ─────────────────────────────────────────────────────
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const saveToSavedList = (item: WildcardItem) => {
    if (savedWildcards.find((s) => s.text === item.text)) return;
    const newItem: WildcardItem = { ...item, id: crypto.randomUUID() };
    setSavedWildcards((prev) => [newItem, ...prev]);
    dbApi.add([{ ...newItem, list: 'saved' }]);
  };

  const setPreviewForWildcard = (id: string, imageUrl: string, listType: 'generated' | 'saved') => {
    const updater = (prev: WildcardItem[]) =>
      prev.map((w) => (w.id === id ? { ...w, previewUrl: imageUrl } : w));
    if (listType === 'generated') setGeneratedWildcards(updater);
    else setSavedWildcards(updater);
    dbApi.patch(id, { previewUrl: imageUrl });
  };

  const removeSaved = (id: string) => {
    setSavedWildcards((prev) => prev.filter((s) => s.id !== id));
    dbApi.remove(id);
  };

  const removeGenerated = (id: string) => {
    setGeneratedWildcards((prev) => prev.filter((s) => s.id !== id));
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

  const handleHoverChange = (url: string | null, x?: number, y?: number) => {
    setPreviewHover(url && x !== undefined && y !== undefined ? { url, x, y } : null);
  };

  // ── Settings handlers ────────────────────────────────────────────────────
  const handleApplyApiKey = async (trimmed: string) => {
    setApiKey(trimmed);
    await dbApi.updateConfig({ apiKey: trimmed });
  };

  const handleApplyGallery = async (trimmed: string) => {
    setGalleryPath(trimmed);
    await dbApi.updateConfig({ galleryDir: trimmed });
    if (trimmed) {
      setGalleryLoading(true);
      try {
        const res = await fetch('/api/gallery');
        const data = await res.json();
        setGalleryFiles(data.files ?? []);
        setGalleryIndex(0);
      } catch {
        // ignore
      } finally {
        setGalleryLoading(false);
      }
    } else {
      setGalleryFiles([]);
    }
  };

  const handleGalleryRefresh = async () => {
    setGalleryLoading(true);
    try {
      const res = await fetch('/api/gallery');
      const data = await res.json();
      setGalleryFiles(data.files ?? []);
      setGalleryIndex(0);
    } catch {
      // ignore
    } finally {
      setGalleryLoading(false);
    }
  };

  const handleResetDb = async () => {
    await dbApi.resetDb();
    setGeneratedWildcards([]);
    setSavedWildcards([]);
    setAllTimeCost(0);
    setSessionCost(0);
    setLastCallCost(0);
    setApiKey('');
    setApiKeyInput('');
    setGalleryPath('');
    setGalleryPathInput('');
    setGalleryFiles([]);
    sessionIdRef.current = null;
    sessionCostRef.current = 0;
    setShowResetConfirm(false);
    setShowSettings(false);
  };

  // ── Filtered lists ───────────────────────────────────────────────────────
  const filteredGenerated = generatedWildcards.filter((w) =>
    w.text.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const filteredSaved = savedWildcards.filter((w) =>
    w.text.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      className="h-screen flex flex-col font-sans overflow-hidden transition-colors duration-300"
      style={{ backgroundColor: theme.bg, color: theme.text }}
    >
      <Header
        theme={theme}
        themeId={themeId}
        setThemeId={setThemeId}
        apiKey={apiKey}
        galleryEnabled={galleryEnabled}
        showSettings={showSettings}
        onToggleSettings={() => setShowSettings((v) => !v)}
        onShowGuide={() => setShowGuide(true)}
      />

      {/* Modals */}
      <ResetDbModal
        theme={theme}
        show={showResetConfirm}
        generatedCount={generatedWildcards.length}
        savedCount={savedWildcards.length}
        allTimeCost={allTimeCost}
        onClose={() => setShowResetConfirm(false)}
        onReset={handleResetDb}
      />
      <GuideModal theme={theme} show={showGuide} onClose={() => setShowGuide(false)} />

      {/* Settings overlay (absolute, sits below header) */}
      <SettingsOverlay
        theme={theme}
        show={showSettings}
        systemInstruction={systemInstruction}
        setSystemInstruction={setSystemInstruction}
        apiKeyInput={apiKeyInput}
        setApiKeyInput={setApiKeyInput}
        galleryPathInput={galleryPathInput}
        setGalleryPathInput={setGalleryPathInput}
        onApplyApiKey={handleApplyApiKey}
        onApplyGallery={handleApplyGallery}
        onClose={() => setShowSettings(false)}
        onShowResetConfirm={() => setShowResetConfirm(true)}
      />

      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          theme={theme}
          userPrompt={userPrompt}
          setUserPrompt={setUserPrompt}
          referenceImages={referenceImages}
          setReferenceImages={setReferenceImages as (updater: (prev: string[]) => string[]) => void}
          numToGenerate={numToGenerate}
          setNumToGenerate={setNumToGenerate}
          isLoading={isLoading}
          onGenerate={generateWildcards}
          onSurprise={() => {
            setUserPrompt('');
            setReferenceImages(() => []);
            setRefiningWildcard(null);
            generateWildcards();
          }}
          galleryEnabled={galleryEnabled}
          galleryLoading={galleryLoading}
          galleryFiles={galleryFiles}
          galleryIndex={galleryIndex}
          setGalleryIndex={setGalleryIndex}
          onGalleryRefresh={handleGalleryRefresh}
          onOpenSettings={() => setShowSettings(true)}
          lastCallCost={lastCallCost}
          sessionCost={sessionCost}
          allTimeCost={allTimeCost}
        />

        {/* Main Content */}
        <div
          className="flex-1 flex flex-col overflow-hidden transition-colors duration-300"
          style={{ backgroundColor: theme.bg }}
        >
          {/* Search Bar */}
          <div
            className="h-14 border-b flex items-center px-6 gap-4 shrink-0"
            style={{ borderColor: theme.border }}
          >
            <svg
              className="w-4 h-4 opacity-20"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search wildcards..."
              className="flex-1 bg-transparent border-none text-sm focus:ring-0 placeholder:opacity-20"
            />
          </div>

          {/* Generated + Saved columns */}
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 border-r overflow-hidden" style={{ borderColor: theme.border }}>
              <WildcardList
                theme={theme}
                title="Generated"
                items={filteredGenerated}
                fullList={generatedWildcards}
                onReorder={(merged) => {
                  setGeneratedWildcards(merged);
                  dbApi.reorder('generated', merged.map((w) => w.id));
                }}
                clearConfirm={clearGeneratedConfirm}
                onShowClearConfirm={() => setClearGeneratedConfirm(true)}
                onCancelClear={() => setClearGeneratedConfirm(false)}
                onClear={clearGenerated}
                copiedId={copiedId}
                lastGenerationTime={lastGenerationTime}
                galleryEnabled={galleryEnabled}
                galleryEmpty={galleryFiles.length === 0}
                currentGalleryImageUrl={currentGalleryImageUrl}
                onCopy={handleCopy}
                onSave={saveToSavedList}
                onRefine={(text) => setRefiningWildcard(text)}
                onSetPreview={(id, url) => setPreviewForWildcard(id, url, 'generated')}
                onRemove={removeGenerated}
                onHoverChange={handleHoverChange}
              />
            </div>

            <div className="flex-1 overflow-hidden">
              <WildcardList
                theme={theme}
                title="Saved"
                items={filteredSaved}
                fullList={savedWildcards}
                onReorder={(merged) => {
                  setSavedWildcards(merged);
                  dbApi.reorder('saved', merged.map((w) => w.id));
                }}
                clearConfirm={clearSavedConfirm}
                onShowClearConfirm={() => setClearSavedConfirm(true)}
                onCancelClear={() => setClearSavedConfirm(false)}
                onClear={clearSaved}
                copiedId={copiedId}
                galleryEnabled={galleryEnabled}
                galleryEmpty={galleryFiles.length === 0}
                currentGalleryImageUrl={currentGalleryImageUrl}
                onCopy={handleCopy}
                onRefine={(text) => setRefiningWildcard(text)}
                onSetPreview={(id, url) => setPreviewForWildcard(id, url, 'saved')}
                onRemove={removeSaved}
                onHoverChange={handleHoverChange}
              />
            </div>
          </div>
        </div>
      </main>

      <RefineBar
        theme={theme}
        refiningWildcard={refiningWildcard}
        onClear={() => setRefiningWildcard(null)}
      />
      <PreviewHover theme={theme} previewHover={previewHover} />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: ${theme.scrollbar}; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: ${theme.accent}40; }
      `}</style>
    </div>
  );
}
