# neufox's pawn-wasm

WebAssembly build of the [open.mp Pawn Compiler](https://github.com/openmultiplayer/compiler) for use in browsers and Node.js.

## Features

- Client-side compilation (no server required)
- Fast compilation directly in the browser
- Privacy-friendly (code never leaves the browser)

## Installation

### Clone the Repository

```bash
git clone https://github.com/yourusername/pawn-wasm.git
cd pawn-wasm
```

### Initialize Submodules

This project uses the open.mp Pawn Compiler as a git submodule:

```bash
git submodule update --init --recursive
```

### Install Emscripten

To build this package, you need [Emscripten](https://emscripten.org/) installed:

```bash
# Install Emscripten
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk
./emsdk install latest
./emsdk activate latest
source ./emsdk_env.sh
```

### Install Dependencies

```bash
npm install
```

## Building

```bash
npm run build
```

This will:
1. Compile the Pawn compiler C code to WebAssembly
2. Generate TypeScript bindings
3. Output files to `dist/`

You can also run individual build steps:

```bash
npm run build:wasm  # Build WASM only
npm run build:js    # Build TypeScript only
npm run clean       # Clean build artifacts
```

## Usage

```typescript
import { initCompiler, compile, addIncludeFile, addIncludeFiles } from '@pawn-fiddle/pawn-wasm';

// Initialize the compiler (do this once)
await initCompiler();

// Add include files to the virtual filesystem
// Option 1: Add a single include file
addIncludeFile('a_samp.inc', includeFileContent);

// Option 2: Add multiple include files at once
addIncludeFiles([
  { filename: 'a_samp.inc', content: sampIncludeContent },
  { filename: 'core.inc', content: coreIncludeContent },
  { filename: 'float.inc', content: floatIncludeContent }
]);

// Option 3: Load from a remote directory
await loadIncludeFiles('/includes', ['a_samp.inc', 'core.inc', 'float.inc']);

// Compile some code
const result = await compile(`
  #include <a_samp>

  main() {
    print("Hello, World!");
  }
`, {
  optimizationLevel: 2,
  debugLevel: 2
});

console.log(result.success); // true/false
console.log(result.output);  // Compiler output
console.log(result.errors);  // Array of errors
console.log(result.warnings); // Array of warnings
```

## API

### `initCompiler(): Promise<void>`
Initializes the WASM compiler module. Must be called before any other functions.

### `compile(sourceCode: string, options?: CompilerOptions): Promise<CompilationResult>`
Compiles Pawn source code.

**Options:**
- `optimizationLevel` (0-3): Optimization level
- `debugLevel` (0-3): Debug information level
- `additionalFlags`: Array of additional compiler flags

**Returns:**
- `success`: Boolean indicating compilation success
- `output`: Full compiler output
- `errors`: Array of error messages
- `warnings`: Array of warning messages
- `amxSize`: Size of compiled AMX file (if successful)

### `addIncludeFile(filename: string, content: string): void`
Adds a single include file to the virtual filesystem.

**Parameters:**
- `filename`: The name/path of the include file (e.g., 'a_samp.inc' or 'subdir/mylib.inc')
- `content`: The file content as a string

### `addIncludeFiles(files: Array<{ filename: string; content: string }>): void`
Adds multiple include files to the virtual filesystem at once.

**Parameters:**
- `files`: Array of objects containing `filename` and `content` properties

**Example:**
```typescript
addIncludeFiles([
  { filename: 'a_samp.inc', content: sampContent },
  { filename: 'streamer.inc', content: streamerContent }
]);
```

### `loadIncludeFiles(includesPath: string, filenames: string[]): Promise<void>`
Loads include files from a remote directory.

**Parameters:**
- `includesPath`: Base URL where include files are hosted
- `filenames`: Array of filenames to fetch and load

**Example:**
```typescript
await loadIncludeFiles('/includes', ['a_samp.inc', 'core.inc', 'float.inc']);
```

### `getCompiledAMX(): Uint8Array | null`
Returns the compiled AMX binary (if compilation was successful).

### `cleanup(): void`
Cleans up temporary files from the virtual filesystem.

## File Structure

```
pawn-wasm/
├── community-compiler/      # Git submodule - open.mp Pawn Compiler
├── src/
│   ├── wasm_interface.c    # C interface for WASM
│   └── pawn-compiler.ts    # TypeScript wrapper
├── build/                   # Build artifacts (generated)
├── dist/                    # Output files (generated)
│   ├── pawnc.js            # Emscripten generated JS
│   ├── pawnc.wasm          # WebAssembly binary
│   ├── pawn-compiler.js    # TypeScript compiled output
│   └── pawn-compiler.d.ts  # TypeScript declarations
├── CMakeLists.txt          # CMake configuration
├── build.sh                # Build script
├── .gitmodules             # Git submodules configuration
├── LICENSE                 # MIT License
├── package.json
└── README.md
```

## Using in Your Project

### From GitHub (Recommended)

Install directly from GitHub:

```bash
npm install github:yourusername/pawn-wasm
```

Or add to your `package.json`:

```json
{
  "dependencies": {
    "@pawn-fiddle/pawn-wasm": "github:yourusername/pawn-wasm"
  }
}
```

### Local Development

If you want to use a local version in your project:

```bash
cd your-project
npm install ../path/to/pawn-wasm
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

This package uses the [open.mp Pawn Compiler](https://github.com/openmultiplayer/compiler), which is licensed under the zLib/libpng license.
