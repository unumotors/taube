#!/bin/sh -e

# This generate the type definitions for all files
npx -p typescript tsc lib/index.js lib/**/*.js --declaration --allowJs --emitDeclarationOnly --outFile lib/index.d.ts --module node16 --esModuleInterop --skipLibCheck
# Rename the library (we put "taube" instead of "@unu/taube")
sed -i 's/declare module "index" {/declare module "@unu\/taube" {/' lib/index.d.ts
# Remove all ".js" endings to fix the pathing. the generator adds these for some reason
sed -i 's/\.js//g' lib/index.d.ts
