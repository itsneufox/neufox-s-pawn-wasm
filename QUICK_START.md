# Quick Start Guide

## 1. Install Emscripten (One-time setup)

```bash
# Clone and install Emscripten
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest

# Activate Emscripten (do this in each new terminal)
source ./emsdk_env.sh
```

## 2. Build WASM Compiler

```bash
# Clone the repository with submodules
git clone --recursive https://github.com/itsneufox/neufox-s-pawn-wasm.git
cd neufox-s-pawn-wasm

# Install dependencies and build
npm install
npm run build
```

If you forgot `--recursive`:
```bash
git submodule update --init --recursive
```

## 3. Use in Your Code

```typescript
import {
  initCompiler,
  compile,
  addIncludeFile,
  addIncludeFiles,
  loadIncludeFiles
} from '@pawn-fiddle/pawn-wasm';

// Initialize (once, at app startup)
await initCompiler();

// Load your baseline include pack (hosted locally, CDN, etc.)
await loadIncludeFiles('https://cdn.example.com/includes', [
  'a_samp.inc',
  'core.inc',
  'float.inc'
]);

// Add/override includes dynamically (e.g., user uploads)
addIncludeFiles([
  { filename: 'streamer.inc', content: streamerIncludeContent },
  { filename: 'sscanf2.inc', content: sscanfIncludeContent }
]);

// Compile code
const result = await compile(`
  #include <a_samp>
  main() {
    print("Hello!");
  }
`, {
  optimizationLevel: 2,
  debugLevel: 2
});

if (result.success) {
  console.log('✅ Compilation successful!');
  console.log('AMX size:', result.amxSize, 'bytes');
} else {
  console.error('❌ Compilation failed');
  console.error('Errors:', result.errors);
}
```

## Build Commands

```bash
# Clean and rebuild everything
npm run clean && npm run build

# Build only WASM (C to WebAssembly)
npm run build:wasm

# Build only TypeScript wrapper
npm run build:js
```

## File Sizes

- `pawnc.js`: ~200KB
- `pawnc.wasm`: ~1-2MB
- Total: ~2MB (cached after first load)

## Troubleshooting

**Problem:** `emcc: command not found`
**Solution:** Activate Emscripten: `source ~/emsdk/emsdk_env.sh`

**Problem:** Build fails
**Solution:**
```bash
npm run clean
rm -rf build/output
npm run build
```

**Problem:** Module not found in browser
**Solution:** Ensure all files in `dist/` are properly deployed/served

**Problem:** Missing include files
**Solution:** You must provide your own include files. The compiler does not bundle SA-MP, open.mp, or plugin includes. Use `addIncludeFile()` or `loadIncludeFiles()` to add them.

## Include Files

**Important:** This package does NOT bundle SA-MP, open.mp, or third-party plugin includes due to licensing and distribution constraints. Everything your script `#include`s has to be added manually before compiling.

### How to Add Includes to the Compiler

```typescript
import { initCompiler, addIncludeFile, addIncludeFiles, loadIncludeFiles } from '@pawn-fiddle/pawn-wasm';

await initCompiler();

// Option 1: Add a single file (useful for user uploads). Paths map to /include/ inside WASM.
addIncludeFile('a_samp.inc', includeFileContent);

// Option 2: Add multiple files at once (recommended for bulk loading)
addIncludeFiles([
  { filename: 'a_samp.inc', content: sampContent },
  { filename: 'core.inc', content: coreContent },
  { filename: 'float.inc', content: floatContent }
]);

// Option 3: Load from a remote server/CDN (async). Provide the base URL, filenames are appended.
await loadIncludeFiles('https://cdn.example.com/includes', ['a_samp.inc', 'core.inc']);
```

**Checklist before compiling**
- `initCompiler()` has resolved
- Every required `.inc` has been added (or fetched) and matches the name in your `#include`
- Optional: call `cleanup()` if you need to remove/reload everything

## Next Steps

1. Build the WASM package
2. Integrate into your project
3. Set up include file management (upload, CDN, or bundled)
4. Test compilation with your Pawn scripts

See [README.md](README.md) for full API documentation.
