/**
 * TypeScript wrapper for the Pawn WASM Compiler
 */

export interface CompilationResult {
  success: boolean;
  output: string;
  errors: string[];
  warnings: string[];
  amxSize?: number;
}

export interface CompilerOptions {
  /** Optimization level (0-3, higher is more optimized) */
  optimizationLevel?: number;
  /** Debug information level (0-3, higher includes more debug info) */
  debugLevel?: number;
  /** Additional compiler flags to pass to the Pawn compiler */
  additionalFlags?: string[];
}

interface PawnCompilerModule extends EmscriptenModule {
  ccall: typeof ccall;
  cwrap: typeof cwrap;
  FS: typeof FS;
  UTF8ToString(ptr: number): string;
}

let compilerModule: PawnCompilerModule | null = null;
let compilerReady = false;
const readyCallbacks: Array<() => void> = [];

/**
 * Initialize the WASM compiler module.
 * Must be called before any compilation or file operations.
 * Safe to call multiple times - subsequent calls wait for the first initialization.
 */
export async function initCompiler(): Promise<void> {
  if (compilerReady) return;

  if (compilerModule) {
    // Already initializing, wait for initialization to complete
    return new Promise((resolve) => {
      readyCallbacks.push(resolve);
    });
  }

  try {
    // @ts-ignore - Dynamic import of Emscripten-generated WASM module
    const createPawnCompiler = (await import('../../dist/pawnc.js')).default;

    compilerModule = await createPawnCompiler({
      locateFile: (path: string) => {
        // Resolve the .wasm file location
        if (path.endsWith('.wasm')) {
          return new URL('../../dist/pawnc.wasm', import.meta.url).href;
        }
        return path;
      },
      print: (text: string) => {
        console.log('[Pawn Compiler]', text);
      },
      printErr: (text: string) => {
        console.error('[Pawn Compiler]', text);
      },
    });

    // Create the virtual filesystem directory for include files
    if (compilerModule) {
      compilerModule.FS.mkdir('/include');
    }

    compilerReady = true;

    // Resolve all pending initialization promises
    readyCallbacks.forEach(cb => cb());
    readyCallbacks.length = 0;

  } catch (error) {
    console.error('Failed to initialize Pawn compiler:', error);
    throw new Error(`Compiler initialization failed: ${error}`);
  }
}

/**
 * Add a single include file to the virtual filesystem.
 * Supports subdirectories (e.g., 'sampstdlib/a_samp.inc').
 * If the file already exists, it will be replaced.
 *
 * @param filename - The include file path (e.g., 'a_samp.inc' or 'subdir/mylib.inc')
 * @param content - The file content as a string
 * @throws {Error} If compiler is not initialized or file operations fail
 */
export function addIncludeFile(filename: string, content: string): void {
  if (!compilerModule) {
    throw new Error('Compiler not initialized. Call initCompiler() first.');
  }

  // Create subdirectories if the filename contains slashes
  const parts = filename.split('/');
  if (parts.length > 1) {
    let currentPath = '/include';
    for (let i = 0; i < parts.length - 1; i++) {
      currentPath = `${currentPath}/${parts[i]}`;
      try {
        compilerModule.FS.mkdir(currentPath);
      } catch (err: any) {
        const errno = err?.errno ?? err?.code;
        // Ignore "File exists" errors (errno 17)
        if (errno === 17 || err?.message?.includes('File exists')) {
          continue;
        }
        // Double-check if directory exists before rethrowing
        const analysis = compilerModule.FS.analyzePath(currentPath);
        if (!analysis.exists) {
          throw err;
        }
      }
    }
  }

  const path = `/include/${filename}`;

  try {
    // Replace existing file if it exists
    if (compilerModule.FS.analyzePath(path).exists) {
      compilerModule.FS.unlink(path);
    }

    // Write the file to the virtual filesystem
    compilerModule.FS.writeFile(path, content);
  } catch (error) {
    console.error(`Failed to add include file ${filename}:`, error);
    throw error;
  }
}

/**
 * Add multiple include files to the virtual filesystem at once.
 * Convenience function for bulk uploading include files.
 *
 * @param files - Array of objects with filename and content properties
 * @example
 * ```typescript
 * addIncludeFiles([
 *   { filename: 'a_samp.inc', content: sampContent },
 *   { filename: 'core.inc', content: coreContent }
 * ]);
 * ```
 */
export function addIncludeFiles(files: Array<{ filename: string; content: string }>): void {
  for (const file of files) {
    addIncludeFile(file.filename, file.content);
  }
}

/**
 * Load include files from a remote directory via HTTP(S).
 * Fetches multiple files in parallel and adds them to the virtual filesystem.
 * Failed fetches are logged as warnings but don't stop other files from loading.
 *
 * @param includesPath - Base URL where include files are hosted
 * @param filenames - Array of filenames to fetch (e.g., ['a_samp.inc', 'core.inc'])
 * @example
 * ```typescript
 * // Load files from a CDN or static server
 * await loadIncludeFiles('https://example.com/includes', [
 *   'a_samp.inc',
 *   'core.inc',
 *   'float.inc'
 * ]);
 * ```
 */
export async function loadIncludeFiles(
  includesPath: string,
  filenames: string[]
): Promise<void> {
  const results = await Promise.allSettled(
    filenames.map(async (filename) => {
      try {
        const response = await fetch(`${includesPath}/${filename}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch ${filename}: ${response.statusText}`);
        }
        const content = await response.text();
        addIncludeFile(filename, content);
      } catch (err) {
        console.warn(`Could not load include ${filename}:`, err);
        throw err;
      }
    })
  );

  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length > 0) {
    console.warn(`Failed to load ${failed.length} include file(s)`);
  }
}

/**
 * Compile Pawn source code to AMX bytecode.
 *
 * @param sourceCode - The Pawn source code to compile
 * @param options - Compiler options (optimization, debug level, additional flags)
 * @returns Promise resolving to compilation result with success status, output, errors, and warnings
 * @throws {Error} If compiler is not initialized
 * @example
 * ```typescript
 * const result = await compile(`
 *   #include <a_samp>
 *   main() {
 *     print("Hello, World!");
 *   }
 * `, {
 *   optimizationLevel: 2,
 *   debugLevel: 2
 * });
 * ```
 */
export async function compile(
  sourceCode: string,
  options: CompilerOptions = {}
): Promise<CompilationResult> {
  if (!compilerReady || !compilerModule) {
    throw new Error('Compiler not initialized. Call initCompiler() first.');
  }

  // Build compiler flags array
  const optionsArray: string[] = [];

  if (options.optimizationLevel !== undefined) {
    optionsArray.push(`-O${options.optimizationLevel}`);
  }

  if (options.debugLevel !== undefined) {
    optionsArray.push(`-d${options.debugLevel}`);
  }

  // Point compiler to the virtual filesystem include directory
  optionsArray.push('-i/include');

  // Append any additional custom flags
  if (options.additionalFlags) {
    optionsArray.push(...options.additionalFlags);
  }

  const optionsString = optionsArray.join(' ');

  try {
    // Call the WASM-exposed C compilation function
    const outputPtr = compilerModule.ccall(
      'pawncl_compile',
      'number',
      ['string', 'string'],
      [sourceCode, optionsString]
    );

    // Convert C string pointer to JavaScript string
    const output = compilerModule.UTF8ToString(outputPtr);

    // Free the C-allocated memory
    compilerModule.ccall('pawncl_free', null, ['number'], [outputPtr]);

    // Parse compiler output into structured result
    const result = parseCompilerOutput(output);

    return result;
  } catch (error) {
    console.error('Compilation error:', error);
    return {
      success: false,
      output: String(error),
      errors: [String(error)],
      warnings: [],
    };
  }
}

/**
 * Parse compiler output text to extract structured information.
 * Identifies success/failure, errors, warnings, and AMX file size.
 *
 * @param output - Raw compiler output text
 * @returns Structured compilation result
 */
function parseCompilerOutput(output: string): CompilationResult {
  const lines = output.split('\n');
  const errors: string[] = [];
  const warnings: string[] = [];
  let success = false;
  let amxSize: number | undefined;

  for (const line of lines) {
    // Detect successful compilation and extract AMX size
    if (line.includes('Compilation successful')) {
      success = true;
      const match = line.match(/AMX file size: (\d+) bytes/);
      if (match) {
        amxSize = parseInt(match[1], 10);
      }
    }

    // Extract error messages (format: "file(line) : error XXX: message")
    if (line.includes('error') && line.includes(':')) {
      errors.push(line.trim());
    }

    // Extract warning messages (format: "file(line) : warning XXX: message")
    if (line.includes('warning') && line.includes(':')) {
      warnings.push(line.trim());
    }
  }

  return {
    success,
    output,
    errors,
    warnings,
    amxSize,
  };
}

/**
 * Retrieve the compiled AMX binary from the virtual filesystem.
 * Returns null if no AMX file exists (i.e., compilation failed or hasn't been run).
 *
 * @returns The compiled AMX binary as a Uint8Array, or null if not found
 * @throws {Error} If compiler is not initialized
 */
export function getCompiledAMX(): Uint8Array | null {
  if (!compilerModule) {
    throw new Error('Compiler not initialized.');
  }

  try {
    const path = '/output.amx';
    if (!compilerModule.FS.analyzePath(path).exists) {
      return null;
    }

    return compilerModule.FS.readFile(path);
  } catch (error) {
    console.error('Failed to read compiled AMX:', error);
    return null;
  }
}

/**
 * Clean up temporary compilation artifacts from the virtual filesystem.
 * Removes input source file, output AMX, and compiler log files.
 * Safe to call even if files don't exist.
 */
export function cleanup(): void {
  if (!compilerModule) return;

  try {
    const files = ['/input.pwn', '/output.amx', '/output.txt'];
    for (const file of files) {
      if (compilerModule.FS.analyzePath(file).exists) {
        compilerModule.FS.unlink(file);
      }
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}
