#!/bin/bash

# Script para testar a API de integração com ClickUp
# Certifique-se de que a API está rodando na porta 3000

API_BASE="http://localhost:3000"
CASA="br4bet"
AMBIENTE="hml"

echo "🧪 Testando API de integração ClickUp"
echo "======================================"

# Teste 1: Health check
echo "1. Health check..."
curl -s "$API_BASE/health" | jq .
echo ""

# Teste 2: Criar GMUD
echo "2. Criando GMUD para $CASA - $AMBIENTE..."
RESPONSE=$(curl -s -X POST "$API_BASE/gmud" \
  -H "Content-Type: application/json" \
  -d "{\"casa\":\"$CASA\",\"ambiente\":\"$AMBIENTE\"}")

echo "$RESPONSE" | jq .

# Extrair task_id da resposta
TASK_ID=$(echo "$RESPONSE" | jq -r '.taskId')

if [ "$TASK_ID" = "null" ] || [ -z "$TASK_ID" ]; then
  echo "❌ Falha ao criar GMUD"
  exit 1
fi

echo "✅ GMUD criada com ID: $TASK_ID"
echo ""

# Teste 3: Verificar status
echo "3. Verificando status da GMUD..."
curl -s "$API_BASE/gmud/$TASK_ID/status" | jq .
echo ""

# Teste 4: Aguardar aprovação (com timeout baixo para teste)
echo "4. Aguardando aprovação (timeout: 2 minutos)..."
curl -s -X POST "$API_BASE/gmud/$TASK_ID/wait" \
  -H "Content-Type: application/json" \
  -d '{"timeoutMinutes":2,"pollIntervalSeconds":10}' | jq .
echo ""

echo "🎯 Teste concluído!"
echo "📋 Acesse o ClickUp para aprovar/negar a GMUD:"
echo "   https://app.clickup.com/9013334553/v/b/li/901321558663"
