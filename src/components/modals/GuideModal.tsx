/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  HelpCircle,
  X,
  Settings2,
  Sparkles,
  Save,
  Image as ImageIcon,
  Search,
  Copy,
  Trash2,
  ZoomIn,
  Shuffle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Theme } from '../../types';

interface Props {
  theme: Theme;
  show: boolean;
  onClose: () => void;
}

function Step({ number, icon, title, children }: {
  number: number;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold tabular-nums opacity-30">0{number}</span>
        <span className="opacity-60">{icon}</span>
        <h3 className="text-xs font-bold uppercase tracking-widest">{title}</h3>
      </div>
      <div className="text-[12px] leading-relaxed opacity-60 space-y-1 pl-6">
        {children}
      </div>
    </section>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-0.5 font-semibold opacity-90">{children}</span>
  );
}

export function GuideModal({ theme, show, onClose }: Props) {
  const divider = <div className="border-t opacity-10 my-4" style={{ borderColor: theme.text }} />;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{ backgroundColor: theme.card, color: theme.text, maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b flex items-center justify-between shrink-0" style={{ borderColor: theme.border }}>
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5" style={{ color: theme.accent }} />
                <h2 className="text-sm font-bold uppercase tracking-wider">How to use Wildcard Studio</h2>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-full transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body — two columns */}
            <div className="overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0">

                {/* ── Left column ── */}
                <div className="p-8 space-y-6 border-r" style={{ borderColor: theme.border }}>

                  <Step number={1} icon={<Settings2 className="w-3.5 h-3.5" />} title="First-time setup">
                    <p>
                      Click the <Tag><Settings2 className="w-3 h-3" /> Settings</Tag> icon in the top-right corner.
                    </p>
                    <p>
                      Paste your <Tag>Gemini API Key</Tag> — this is required to generate wildcards. The key is saved locally in your database and never sent anywhere except the Gemini API itself.
                    </p>
                    <p>
                      Optionally set a <Tag>Gallery Folder</Tag> — point it to any folder of images on your computer (e.g. your ComfyUI output folder). This enables the image gallery in the sidebar. Leave it blank if you don't need image previews.
                    </p>
                    <p className="opacity-50 text-[11px]">
                      A warning badge in the header reminds you if the API key is missing.
                    </p>
                  </Step>

                  {divider}

                  <Step number={2} icon={<Sparkles className="w-3.5 h-3.5" />} title="Generate wildcards">
                    <p>
                      Type a description in the <Tag>Request</Tag> box on the left sidebar — for example: <em>"cinematic lighting styles"</em> or <em>"fantasy creature adjectives"</em>.
                    </p>
                    <p>
                      Optionally upload up to <Tag>4 reference images</Tag> to visually guide the AI (drag & drop or click the image area).
                    </p>
                    <p>
                      Set the <Tag>Count</Tag> slider for how many wildcards to generate, then hit <Tag>Generate</Tag>.
                    </p>
                    <p>
                      The <Tag><Shuffle className="w-3 h-3" /> Surprise</Tag> button clears your prompt and generates a random batch — great for inspiration.
                    </p>
                    <p>
                      New wildcards appear at the top of the <Tag>Generated</Tag> column on the right, highlighted briefly so you can spot them.
                    </p>
                    <p className="opacity-50 text-[11px] bg-black/5 rounded-lg px-3 py-2 leading-relaxed">
                      <strong className="opacity-80">Note:</strong> By default the AI is instructed to generate <strong className="opacity-80">clothing &amp; pose</strong> wildcards. If you want to generate something else (lighting styles, moods, locations…) open <Tag><Settings2 className="w-3 h-3" /> Settings</Tag> and edit the <strong className="opacity-80">System Instruction</strong> to describe what kind of wildcards you need.
                    </p>
                  </Step>

                  {divider}

                  <Step number={3} icon={<Sparkles className="w-3.5 h-3.5" />} title="Refine a wildcard">
                    <p>
                      Click <Tag>Refine</Tag> on any wildcard card. A bar appears at the bottom of the screen showing the selected wildcard as the base.
                    </p>
                    <p>
                      Type refinement instructions in the <Tag>Request</Tag> box (e.g. <em>"make it more dramatic"</em>) and click <Tag>Generate</Tag>. The AI will produce variations based on that specific wildcard.
                    </p>
                    <p>
                      Click the <Tag><X className="w-3 h-3" /></Tag> on the refine bar to cancel and go back to normal generation.
                    </p>
                  </Step>

                </div>

                {/* ── Right column ── */}
                <div className="p-8 space-y-6">

                  <Step number={4} icon={<Copy className="w-3.5 h-3.5" />} title="Copy & save">
                    <p>
                      <Tag>Click anywhere on the text</Tag> of a wildcard card to instantly copy it to your clipboard. A brief confirmation flashes on the card.
                    </p>
                    <p>
                      Click <Tag><Save className="w-3 h-3" /> Save</Tag> on a Generated card to move it into your permanent <Tag>Saved</Tag> list. Saved wildcards persist across sessions and won't be lost when you clear Generated.
                    </p>
                    <p>
                      Use the <Tag><Trash2 className="w-3 h-3" /> Delete</Tag> button to remove a single card, or the <Tag>Clear</Tag> button in the column header to delete all at once (a confirmation step prevents accidents).
                    </p>
                  </Step>

                  {divider}

                  <Step number={5} icon={<Search className="w-3.5 h-3.5" />} title="Search">
                    <p>
                      Use the <Tag>Search bar</Tag> at the top of the main area to filter both columns simultaneously. Results update as you type (with a short debounce). Both Generated and Saved wildcards are searched in the database — not just what's currently loaded.
                    </p>
                    <p>
                      Clear the search box to see all wildcards again.
                    </p>
                  </Step>

                  {divider}

                  <Step number={6} icon={<ImageIcon className="w-3.5 h-3.5" />} title="Gallery & image previews">
                    <p>
                      If a gallery folder is configured, a panel in the left sidebar shows all images in that folder. Use the <Tag>arrows</Tag> to browse or click the <Tag>refresh</Tag> icon after adding new images.
                    </p>
                    <p>
                      Navigate to an image you want to associate with a wildcard, then click <Tag><ImageIcon className="w-3 h-3" /> Preview</Tag> on that card. A thumbnail will appear on the right side of the card.
                    </p>
                    <p>
                      <Tag>Hover over a card</Tag> that has a preview — the full image appears as a blurred overlay on the opposite column so it doesn't cover the card you're looking at.
                    </p>
                    <p>
                      Click the <Tag>×</Tag> button on a thumbnail to remove the preview link from that card.
                    </p>
                  </Step>

                  {divider}

                  <Step number={7} icon={<ZoomIn className="w-3.5 h-3.5" />} title="Gallery lightbox">
                    <p>
                      Click any image in the sidebar gallery to open it fullscreen. Navigate between images using the <Tag>← →</Tag> arrow buttons, your <Tag>keyboard arrow keys</Tag>, or <Tag>scroll wheel</Tag>. Images slide in with a Tinder-style animation showing the direction you're navigating. Click outside the image or press <Tag>Esc</Tag> to close.
                    </p>
                  </Step>

                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t flex items-center justify-between shrink-0" style={{ borderColor: theme.border }}>
              <p className="text-[11px] opacity-30">All data is stored locally — nothing is sent to the cloud except your prompts to the Gemini API.</p>
              <button
                onClick={onClose}
                className="px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shrink-0"
                style={{ backgroundColor: theme.accent, color: theme.id === 'dark' ? '#000' : '#fff' }}
              >
                Got it
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

