/* EgoWheel release channel.
 * 'preview' = the overhaul preview build: its saves, backups and offline cache are namespaced
 * ('egowheel.preview.*', 'egowheel-preview-*') so it can never overwrite the live game's data,
 * even when served from the same origin (e.g. github.io/egowheel/preview/).
 * Switch to 'stable' only when the overhaul is merged and becomes the live game. */
(function (root) {
  'use strict';
  const EW = root.EW = root.EW || {};
  EW.channel = 'preview';
  EW.release = 'v26.1';
  EW.build = EW.build || { version: 'v26-preview', commit: 'local', date: '' };
  if (typeof module !== 'undefined' && module.exports) module.exports = EW.channel;
})(typeof globalThis !== 'undefined' ? globalThis : this);
