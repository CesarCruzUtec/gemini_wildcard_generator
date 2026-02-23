/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  HelpCircle,
  X,
  Settings2,
  RefreshCw,
  Save,
  Upload,
  Download,
  Image as ImageIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Theme } from '../../types';

interface Props {
  theme: Theme;
  show: boolean;
  onClose: () => void;
}

export function GuideModal({ theme, show, onClose }: Props) {
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
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
            style={{ backgroundColor: theme.card, color: theme.text }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: theme.border }}>
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5" style={{ color: theme.accent }} />
                <h2 className="text-sm font-bold uppercase tracking-wider">How to use Wildcard Studio</h2>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-black/5 rounded-full transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-widest opacity-40">0. First-time setup</h3>
                <p className="text-sm leading-relaxed opacity-70">
                  Open <Settings2 className="w-3 h-3 inline" /> <span className="font-bold">Settings</span> and
                  enter your <span className="font-bold">Gemini API Key</span> — the key is saved in the local
                  database and never leaves your machine. Optionally set a{' '}
                  <span className="font-bold">Gallery Folder</span> (e.g. your ComfyUI output path) to enable
                  the image gallery. Warning badges in the header will remind you if either is missing.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-widest opacity-40">1. Generate</h3>
                <p className="text-sm leading-relaxed opacity-70">
                  Enter a prompt in the <span className="font-bold">Request</span> box. Upload up to{' '}
                  <span className="font-bold">4 reference images</span> to guide the generation. Set the{' '}
                  <span className="font-bold">Count</span> and hit <span className="font-bold">Generate</span>.
                  Use the <RefreshCw className="w-3 h-3 inline" /> button to generate a random surprise prompt.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-widest opacity-40">2. Refine</h3>
                <p className="text-sm leading-relaxed opacity-70">
                  Hover over any wildcard and click <span className="font-bold">Refine</span>. A bar will appear
                  at the bottom of the screen showing the selected wildcard. Type your refinement instructions in
                  the <span className="font-bold">Request</span> sidebar and hit{' '}
                  <span className="font-bold">Generate</span> — the selected wildcard is used as the base for
                  the new generation. Click <X className="w-3 h-3 inline" /> on the bar to cancel.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-widest opacity-40">3. Organize &amp; Search</h3>
                <p className="text-sm leading-relaxed opacity-70">
                  The app is split into <span className="font-bold">Generated</span> and{' '}
                  <span className="font-bold">Saved</span> columns. Use the{' '}
                  <span className="font-bold">Search Bar</span> at the top to filter both simultaneously.{' '}
                  <span className="font-bold">Drag and drop</span> cards to reorder them within each column.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-widest opacity-40">4. Save &amp; Export</h3>
                <p className="text-sm leading-relaxed opacity-70">
                  Click <Save className="w-3 h-3 inline" /> <span className="font-bold">Save</span> on a
                  generated card to move it to your permanent list. Use{' '}
                  <Upload className="w-3 h-3 inline" /> <span className="font-bold">Import</span> or{' '}
                  <Download className="w-3 h-3 inline" /> <span className="font-bold">Export</span> in the
                  Saved header to manage{' '}
                  <code className="px-1.5 py-0.5 rounded bg-black/5 font-mono text-xs">.txt</code> files.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-widest opacity-40">5. Gallery &amp; Previews</h3>
                <p className="text-sm leading-relaxed opacity-70">
                  If a gallery folder is set, browse your output images in the left sidebar. Hover over a card
                  in the gallery then click <ImageIcon className="w-3 h-3 inline" />{' '}
                  <span className="font-bold">Preview</span> on a wildcard to link that image to it — a
                  thumbnail appears in the corner of the card and a larger preview pops up on hover.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-widest opacity-40">6. Costs &amp; Themes</h3>
                <p className="text-sm leading-relaxed opacity-70">
                  API usage is tracked at the bottom of the sidebar (last call, session total, all-time). Switch{' '}
                  <span className="font-bold">Themes</span> from the header dropdown.
                </p>
              </section>
            </div>

            {/* Footer */}
            <div className="p-6 border-t flex justify-end" style={{ borderColor: theme.border }}>
              <button
                onClick={onClose}
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
  );
}
