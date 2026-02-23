/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  url: string | null;
}

export function ColumnPreviewOverlay({ url }: Props) {
  return (
    <AnimatePresence>
      {url && (
        <motion.div
          key={url}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
          style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', backgroundColor: 'rgba(0,0,0,0.35)' }}
        >
          <img
            src={url}
            alt="preview"
            className="max-w-[90%] max-h-[90%] object-contain rounded-xl shadow-2xl"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
