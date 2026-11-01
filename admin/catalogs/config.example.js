// Example for a LOCAL/ISOLATED staging deployment only.
// Save a configured version OUTSIDE public GitHub if it contains credentials.
// Never put service_role or iiko password in this file.
window.STOLOVAYA_CATALOGS_CONFIG = {
  rpcBase: "https://TEST-ONLY.example.ru/rest/v1/rpc",
  catalogSyncUrl: "https://TEST-ONLY.example.ru/functions/v1/stolovaya-catalogs-sync",
  publishableKey: "PUBLISHABLE-KEY-FOR-STAGING-ONLY"
};
