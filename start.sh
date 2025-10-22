#!/bin/bash

# Script para iniciar a API e testar a integração
echo "🚀 Iniciando API ClickUp GMUD..."

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Instale Node.js 20+ primeiro."
    exit 1
fi

# Verificar se .env existe
if [ ! -f .env ]; then
    echo "📝 Criando arquivo .env..."
    cp env.example .env
    echo "⚠️  Configure o arquivo .env com suas credenciais do ClickUp"
    echo "   - CLICKUP_TOKEN=pk_your_token_here"
    echo "   - CLICKUP_LIST_ID=901321558663"
    exit 1
fi

# Instalar dependências se necessário
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
fi

# Iniciar a API em background
echo "🌐 Iniciando API na porta 3000..."
npm start &
API_PID=$!

# Aguardar a API inicializar
echo "⏳ Aguardando API inicializar..."
sleep 3

# Testar a API
echo "🧪 Testando integração..."
node scripts/test-api.js

# Parar a API
echo "🛑 Parando API..."
kill $API_PID 2>/dev/null

echo "✅ Teste concluído!"
