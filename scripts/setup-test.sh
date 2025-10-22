#!/bin/bash

# Script para configurar e testar a integração ClickUp
echo "🔧 Configurando ambiente de teste..."

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Instale Node.js 20+ primeiro."
    exit 1
fi

# Verificar se npm está instalado
if ! command -v npm &> /dev/null; then
    echo "❌ npm não encontrado. Instale npm primeiro."
    exit 1
fi

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Verificar se .env existe
if [ ! -f .env ]; then
    echo "📝 Criando arquivo .env..."
    cp env.example .env
    echo "⚠️  Configure o arquivo .env com suas credenciais do ClickUp"
    echo "   - CLICKUP_TOKEN=pk_your_token_here"
    echo "   - CLICKUP_LIST_ID=901321558663"
    exit 1
fi

# Verificar se as variáveis estão configuradas
source .env

if [ -z "$CLICKUP_TOKEN" ] || [ "$CLICKUP_TOKEN" = "pk_your_token_here" ]; then
    echo "❌ CLICKUP_TOKEN não configurado no .env"
    exit 1
fi

if [ -z "$CLICKUP_LIST_ID" ] || [ "$CLICKUP_LIST_ID" = "901321558663" ]; then
    echo "⚠️  Usando LIST_ID padrão: 901321558663"
fi

echo "✅ Ambiente configurado com sucesso!"
echo ""
echo "🚀 Para testar:"
echo "   1. npm start          # Iniciar a API"
echo "   2. ./scripts/test-api.sh  # Testar integração"
echo ""
echo "📋 Para usar no GitHub Actions:"
echo "   1. Adicione CLICKUP_TOKEN nas Secrets do repositório"
echo "   2. Use o workflow em examples/workflow-example.yml"
