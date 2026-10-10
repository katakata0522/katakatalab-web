'use strict';

// 本番環境ではCloud Runの検証API URLへ差し替える。
window.__QR_PRO_CONFIG__ = Object.assign({
  licenseApiUrl: '',
  verifyTimeoutMs: 7000,
  strictVerification: true,
  allowManualPlanSwitch: false,
  allowLocalLicenseFallback: false
}, window.__QR_PRO_CONFIG__ || {});
