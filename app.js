/**
 * FORECOURT WORKS LTD – Digital Technical Service JOB CARD
 * Progressive web form with auto-population, GPS, camera, signatures & PDF export
 */

(function () {
  'use strict';

  // ---------- State ----------
  const state = {
    currentStep: 0,
    totalSteps: 10,
    photos: [],
    signatures: {},
    sigImages: {},
    sigImageSource: {},
    autoPopulated: false,
    pdfBlob: null,
    pdfFileName: '',
    pdfBackedUp: false,
    _gpsWatchId: null
  };

  /** Default Associated Work Order No (replaces the old random WO-2026-XXXX numbers). */
  const DEFAULT_WO_NUMBER = 'WO#00067';

  // ── AI drafting of web Steps 3–8 (Scope, Findings, QC, Parts, Recommendations, Final Status) ──
  const AI_SUGGEST_URL = 'https://jobcard-grok-worker.forecourtmails1986.workers.dev';

  /** Supervisor name that used to be seeded by default, and its replacement. */
  const LEGACY_DEFAULT_SUPERVISOR = 'ISAAK MOHAMMED';
  const DEFAULT_SUPERVISOR = 'B.O';

  // PLACEHOLDER - CONTENT TOO LARGE FOR SINGLE MESSAGE
  // This is a temporary marker - will be replaced
  console.error('app.js incomplete - please wait for full restore');
})();
