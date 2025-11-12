#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Building Pawn Compiler to WebAssembly...${NC}"

# Check if community-compiler submodule exists
if [ ! -d "community-compiler" ]; then
    echo -e "${YELLOW}Warning: community-compiler submodule not found!${NC}"
    echo -e "${YELLOW}Make sure to initialize the submodule:${NC}"
    echo "  git submodule update --init --recursive"
    exit 1
fi

# Source Emscripten environment if it exists
# Try common locations
if [ -f "$HOME/emsdk/emsdk_env.sh" ]; then
    source "$HOME/emsdk/emsdk_env.sh" > /dev/null 2>&1
elif [ -f "/home/itsneufox/emsdk/emsdk_env.sh" ]; then
    source "/home/itsneufox/emsdk/emsdk_env.sh" > /dev/null 2>&1
elif [ -f "./emsdk/emsdk_env.sh" ]; then
    source "./emsdk/emsdk_env.sh" > /dev/null 2>&1
fi

# Check if Emscripten is installed
if ! command -v emcc &> /dev/null; then
    echo -e "${RED}Error: Emscripten (emcc) not found!${NC}"
    echo "Please install Emscripten from: https://emscripten.org/docs/getting_started/downloads.html"
    echo ""
    echo "Quick install:"
    echo "  git clone https://github.com/emscripten-core/emsdk.git"
    echo "  cd emsdk"
    echo "  ./emsdk install latest"
    echo "  ./emsdk activate latest"
    echo "  source ./emsdk_env.sh"
    exit 1
fi

echo -e "${GREEN}✓ Emscripten found${NC}"

# Create build directories
mkdir -p build/output
mkdir -p dist

# Navigate to build directory
cd build/output

echo -e "${BLUE}Running CMake configuration...${NC}"
emcmake cmake ../..

echo -e "${BLUE}Compiling to WebAssembly...${NC}"
emmake make

echo -e "${BLUE}Installing output files...${NC}"
make install

cd ../..

# Check if build was successful
if [ -f "dist/pawnc.js" ] && [ -f "dist/pawnc.wasm" ]; then
    echo -e "${GREEN}✓ Build successful!${NC}"
    echo -e "  Output: dist/pawnc.js"
    echo -e "  Output: dist/pawnc.wasm"

    # Get file sizes
    JS_SIZE=$(du -h dist/pawnc.js | cut -f1)
    WASM_SIZE=$(du -h dist/pawnc.wasm | cut -f1)
    echo -e "${BLUE}File sizes:${NC}"
    echo -e "  JavaScript: $JS_SIZE"
    echo -e "  WebAssembly: $WASM_SIZE"
else
    echo -e "${RED}✗ Build failed!${NC}"
    exit 1
fi
