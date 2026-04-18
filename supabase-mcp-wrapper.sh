#!/bin/bash
# Forzar las rutas correctas de Mac
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

# Ejecutar el servidor de Supabase
/usr/local/bin/npx -y @supabase/mcp-server-supabase@latest --access-token "$1"
