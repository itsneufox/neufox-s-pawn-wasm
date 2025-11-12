cmake_minimum_required(VERSION 3.10)
project(pawnc-wasm C)

# Set the Emscripten toolchain
if(NOT EMSCRIPTEN)
    message(FATAL_ERROR "This build must use Emscripten. Use: emcmake cmake ..")
endif()

set(CMAKE_C_STANDARD 99)
set(CMAKE_C_STANDARD_REQUIRED ON)

# Add compiler definitions
add_definitions(
    -DHAVE_STDINT_H
    -DHAVE_INTTYPES_H
    -DHAVE_UNISTD_H
    -DNO_MAIN
    -Dstricmp=strcasecmp
)

# Add compiler flags for compatibility
set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -Wno-implicit-function-declaration")

# Set version information
set(VERSION_MAJOR 3)
set(VERSION_MINOR 10)
set(VERSION_BUILD 11)
math(EXPR VERSION_INT "${VERSION_MAJOR} << 8 | ${VERSION_MINOR}")

# Configure version header
configure_file(
    ${CMAKE_SOURCE_DIR}/community-compiler/source/compiler/version.h.in
    ${CMAKE_BINARY_DIR}/version.h
)

include_directories(
    ${CMAKE_SOURCE_DIR}/community-compiler/source/compiler
    ${CMAKE_SOURCE_DIR}/community-compiler/source/compiler/hashtable
    ${CMAKE_BINARY_DIR}
)

# Source files from the community compiler
set(PAWNC_SRCS
    community-compiler/source/compiler/hashtable/wrap_hashtable.c
    community-compiler/source/compiler/libpawnc.c
    community-compiler/source/compiler/lstring.c
    community-compiler/source/compiler/memfile.c
    community-compiler/source/compiler/sc1.c
    community-compiler/source/compiler/sc2.c
    community-compiler/source/compiler/sc3.c
    community-compiler/source/compiler/sc4.c
    community-compiler/source/compiler/sc5.c
    community-compiler/source/compiler/sc6.c
    community-compiler/source/compiler/sc7.c
    community-compiler/source/compiler/sci18n.c
    community-compiler/source/compiler/sclist.c
    community-compiler/source/compiler/scmemfil.c
    community-compiler/source/compiler/scstate.c
    community-compiler/source/compiler/scvars.c
    ${CMAKE_SOURCE_DIR}/src/wasm_interface.c
)

# Create the WASM library
add_executable(pawnc ${PAWNC_SRCS})

# Emscripten-specific settings
set_target_properties(pawnc PROPERTIES
    SUFFIX ".js"
    LINK_FLAGS "\
        -s WASM=1 \
        -s EXPORTED_FUNCTIONS='[\"_pawncl_compile\",\"_pawncl_free\",\"_malloc\",\"_free\"]' \
        -s EXPORTED_RUNTIME_METHODS='[\"ccall\",\"cwrap\",\"FS\",\"UTF8ToString\"]' \
        -s MODULARIZE=1 \
        -s EXPORT_NAME='createPawnCompiler' \
        -s ALLOW_MEMORY_GROWTH=1 \
        -s INITIAL_MEMORY=67108864 \
        -s MAXIMUM_MEMORY=134217728 \
        -s STACK_SIZE=8388608 \
        -s NO_EXIT_RUNTIME=1 \
        -s ASSERTIONS=1 \
        -s SAFE_HEAP=0 \
        -s FILESYSTEM=1 \
        -s FORCE_FILESYSTEM=1 \
        -O3"
)

# Install to dist directory
install(TARGETS pawnc
    RUNTIME DESTINATION ${CMAKE_SOURCE_DIR}/dist
)

# Also install the .wasm file
install(FILES ${CMAKE_BINARY_DIR}/pawnc.wasm
    DESTINATION ${CMAKE_SOURCE_DIR}/dist
    OPTIONAL
)
