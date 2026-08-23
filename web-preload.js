// web-preload.js - This MUST run before any other code
// Add this as a <script> tag before your main bundle

// Polyfill import.meta for the entire app
if (typeof window !== 'undefined') {
  // Define import.meta before any module loads
  if (!window.import) {
    window.import = {
      meta: {
        url: window.location.href,
        env: {},
      },
    };
  }
  
  if (!globalThis.import) {
    globalThis.import = window.import;
  }
  
  // Also polyfill __DEV__
  if (typeof __DEV__ === 'undefined') {
    window.__DEV__ = true;
    globalThis.__DEV__ = true;
  }
  
  // Polyfill process for webpack
  if (!window.process) {
    window.process = {
      env: {
        NODE_ENV: 'development',
        EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
        EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      },
      cwd: () => '/',
      argv: [],
      platform: 'web',
    };
    globalThis.process = window.process;
  }
}

console.log('✅ Web preload completed - import.meta polyfilled');