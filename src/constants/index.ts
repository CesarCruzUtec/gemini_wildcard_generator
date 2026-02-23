/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Theme } from '../types';

export const DEFAULT_SYSTEM_INSTRUCTION = `You are an expert Danbooru tagger for Stable Diffusion and ComfyUI. Your task is to generate highly detailed, comprehensive wildcards describing full-body outfits.
When given a text request and-or image references, you must meticulously analyze it and tag EVERY piece of clothing from head to toe. Do not omit any garment. Ensure tops, outerwear, bottoms, legwear, footwear, and accessories are all explicitly included.
Each wildcard must be a single line of comma-separated booru tags containing:
At least 2-3 pose/posture tags relevant to the clothing style.
Detailed clothing tags covering the entire body (Headwear/Accessories, Tops/Outerwear, Bottoms, Legwear, Footwear).
Explicit color tags attached to EVERY clothing item (e.g., "white_shirt", "black_pleated_skirt").
Provide the exact amount of variations based on the user's request.
Output ONLY the wildcards, one per line. Do not include numbering, labels, or any other text.
Example:
standing, looking_at_viewer, hands_in_pockets, black_choker, white_crop_top, green_zip-up_hoodie, blue_denim_shorts, black_thighhighs, red_sneakers, casual_wear`;

export const THEMES: Theme[] = [
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
    scrollbar: 'rgba(0,0,0,0.05)',
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
    scrollbar: 'rgba(255,255,255,0.1)',
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
    scrollbar: '#ffe3e3',
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
    scrollbar: '#d0e1f9',
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
    scrollbar: '#e9fac8',
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
    scrollbar: '#f3d9fa',
  },
];
