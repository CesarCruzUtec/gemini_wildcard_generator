/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type WildcardItem = {
  id: string;
  text: string;
  createdAt: number;
  previewUrl?: string;
  /** All preview images linked to this wildcard, oldest first. */
  previewUrls?: string[];
};

export type Theme = {
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
