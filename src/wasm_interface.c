/*
 * WASM Interface for Pawn Compiler
 * Provides a simple C interface to call the compiler from JavaScript
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "sc.h"

/* External function from libpawnc.c */
extern int pc_compile(int argc, char **argv);

/*
 * Compile Pawn source code
 *
 * @param source_code - The Pawn source code to compile
 * @param options - Compiler options (e.g., "-O2 -d3")
 * @return Compilation result as a string (must be freed by caller)
 */
char* pawncl_compile(const char* source_code, const char* options) {
    // Write source code to virtual filesystem
    FILE *fp = fopen("/input.pwn", "w");
    if (fp == NULL) {
        return strdup("Error: Could not create input file");
    }
    fprintf(fp, "%s", source_code);
    fclose(fp);

    // Build argument list
    char *argv[32];
    int argc = 0;

    argv[argc++] = "pawncc";
    argv[argc++] = "-o/output.amx";

    // Parse options string
    if (options != NULL && strlen(options) > 0) {
        char *options_copy = strdup(options);
        char *token = strtok(options_copy, " ");
        while (token != NULL && argc < 30) {
            argv[argc++] = strdup(token);
            token = strtok(NULL, " ");
        }
        free(options_copy);
    }

    argv[argc++] = "/input.pwn";
    argv[argc] = NULL;

    // Print custom header
    printf("WasmPawn Compiler by itsneufox - WebAssembly Port (c) 2025\n");

    // Call the compiler
    // Note: Output will go to stdout/stderr which Emscripten captures
    int result = pc_compile(argc, argv);

    // Build result message
    char *output = (char*)malloc(512);
    if (output == NULL) {
        return strdup("Error: Memory allocation failed");
    }

    if (result == 0) {
        // Read the compiled output file size
        FILE *amx_file = fopen("/output.amx", "rb");
        if (amx_file != NULL) {
            fseek(amx_file, 0, SEEK_END);
            long amx_size = ftell(amx_file);
            fclose(amx_file);

            snprintf(output, 512, "Compilation successful! AMX file size: %ld bytes\n", amx_size);
        } else {
            snprintf(output, 512, "Compilation completed but AMX file not found\n");
        }
    } else {
        snprintf(output, 512, "Compilation failed with error code: %d\n", result);
    }

    // Free dynamically allocated option strings
    for (int i = 3; i < argc - 1; i++) {
        free(argv[i]);
    }

    return output;
}

/*
 * Free memory allocated by pawncl_compile
 */
void pawncl_free(char* ptr) {
    if (ptr != NULL) {
        free(ptr);
    }
}
