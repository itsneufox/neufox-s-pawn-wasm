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
# Clone the repository
git clone https://github.com/yourusername/pawn-wasm.git
cd pawn-wasm

# Initialize submodules (open.mp Pawn Compiler)
git submodule update --init --recursive

# Install dependencies and build
npm install
npm run build
```

## 3. Use in Your Code

```typescript
import { initCompiler, compile, addIncludeFile } from '@pawn-fiddle/pawn-wasm';

// Initialize (once, at app startup)
await initCompiler();

// Add any include files you need
addIncludeFile('a_samp.inc', sampIncludeContent);

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

This package does NOT include SA-MP, open.mp, or third-party plugin includes. You need to:

1. **Obtain include files** from the appropriate sources:
   - SA-MP: https://www.sa-mp.com/download.php
   - open.mp: https://github.com/openmultiplayer/open.mp
   - Plugins: From their respective repositories

2. **Add them to the compiler**:
   ```typescript
   // Option 1: Add files directly (e.g., from user upload)
   addIncludeFile('a_samp.inc', includeContent);

   // Option 2: Add multiple files at once
   addIncludeFiles([
     { filename: 'a_samp.inc', content: sampContent },
     { filename: 'core.inc', content: coreContent }
   ]);

   // Option 3: Load from a server/CDN
   await loadIncludeFiles('/includes', ['a_samp.inc', 'core.inc']);
   ```

## Next Steps

1. Build the WASM package
2. Integrate into your project
3. Set up include file management (upload, CDN, or bundled)
4. Test compilation with your Pawn scripts

See [README.md](README.md) for full API documentation.
