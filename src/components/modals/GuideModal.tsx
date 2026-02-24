/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HelpCircle, X, Settings2, Sparkles, Save, Image as ImageIcon, Search, Copy, Trash2, ZoomIn, Shuffle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Trans, useTranslation } from 'react-i18next';
import { Theme } from '../../types';

interface Props {
  theme: Theme;
  show: boolean;
  onClose: () => void;
}

// Shared Trans components for bold/italic text in guide paragraphs
const B = <strong />;
const I = <em />;
const transComponents = { b: B, i: I };

function Step({ number, icon, titleKey, children }: {
  number: number;
  icon: React.ReactNode;
  titleKey: string;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold tabular-nums opacity-30">0{number}</span>
        <span className="opacity-60">{icon}</span>
        <h3 className="text-xs font-bold uppercase tracking-widest">{t(titleKey)}</h3>
      </div>
      <div className="text-[12px] leading-relaxed opacity-60 space-y-1.5 pl-6">
        {children}
      </div>
    </section>
  );
}

export function GuideModal({ theme, show, onClose }: Props) {
  const { t } = useTranslation();
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
                <h2 className="text-sm font-bold uppercase tracking-wider">{t('guide.title')}</h2>
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

                  <Step number={1} icon={<Settings2 className="w-3.5 h-3.5" />} titleKey="guide.step1.title">
                    <p><Trans i18nKey="guide.step1.p1" components={transComponents} /></p>
                    <p><Trans i18nKey="guide.step1.p2" components={transComponents} /></p>
                    <p><Trans i18nKey="guide.step1.p3" components={transComponents} /></p>
                    <p className="opacity-50 text-[11px]">{t('guide.step1.p4')}</p>
                  </Step>

                  {divider}

                  <Step number={2} icon={<Sparkles className="w-3.5 h-3.5" />} titleKey="guide.step2.title">
                    <p><Trans i18nKey="guide.step2.p1" components={transComponents} /></p>
                    <p><Trans i18nKey="guide.step2.p2" components={transComponents} /></p>
                    <p><Trans i18nKey="guide.step2.p3" components={transComponents} /></p>
                    <p><Trans i18nKey="guide.step2.p4" components={transComponents} /></p>
                    <p><Trans i18nKey="guide.step2.p5" components={transComponents} /></p>
                    <p className="opacity-50 text-[11px] bg-black/5 rounded-lg px-3 py-2 leading-relaxed">
                      <Trans i18nKey="guide.step2.note" components={transComponents} />
                    </p>
                  </Step>

                  {divider}

                  <Step number={3} icon={<Sparkles className="w-3.5 h-3.5" />} titleKey="guide.step3.title">
                    <p><Trans i18nKey="guide.step3.p1" components={transComponents} /></p>
                    <p><Trans i18nKey="guide.step3.p2" components={transComponents} /></p>
                    <p><Trans i18nKey="guide.step3.p3" components={transComponents} /></p>
                  </Step>

                </div>

                {/* ── Right column ── */}
                <div className="p-8 space-y-6">

                  <Step number={4} icon={<Copy className="w-3.5 h-3.5" />} titleKey="guide.step4.title">
                    <p><Trans i18nKey="guide.step4.p1" components={transComponents} /></p>
                    <p><Trans i18nKey="guide.step4.p2" components={transComponents} /></p>
                    <p><Trans i18nKey="guide.step4.p3" components={transComponents} /></p>
                  </Step>

                  {divider}

                  <Step number={5} icon={<Search className="w-3.5 h-3.5" />} titleKey="guide.step5.title">
                    <p><Trans i18nKey="guide.step5.p1" components={transComponents} /></p>
                    <p>{t('guide.step5.p2')}</p>
                  </Step>

                  {divider}

                  <Step number={6} icon={<ImageIcon className="w-3.5 h-3.5" />} titleKey="guide.step6.title">
                    <p><Trans i18nKey="guide.step6.p1" components={transComponents} /></p>
                    <p><Trans i18nKey="guide.step6.p2" components={transComponents} /></p>
                    <p><Trans i18nKey="guide.step6.p3" components={transComponents} /></p>
                    <p><Trans i18nKey="guide.step6.p4" components={transComponents} /></p>
                    <p><Trans i18nKey="guide.step6.p5" components={transComponents} /></p>
                    <p><Trans i18nKey="guide.step6.p6" components={transComponents} /></p>
                  </Step>

                  {divider}

                  <Step number={7} icon={<ZoomIn className="w-3.5 h-3.5" />} titleKey="guide.step7.title">
                    <p><Trans i18nKey="guide.step7.p1" components={transComponents} /></p>
                  </Step>

                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t flex items-center justify-between shrink-0" style={{ borderColor: theme.border }}>
              <p className="text-[11px] opacity-30">{t('guide.footer')}</p>
              <button
                onClick={onClose}
                className="px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all shrink-0"
                style={{ backgroundColor: theme.accent, color: theme.id === 'dark' ? '#000' : '#fff' }}
              >
                {t('guide.gotIt')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
