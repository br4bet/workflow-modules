#!/usr/bin/env node

// Script de teste da API ClickUp em JavaScript
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const CASA = process.argv[2] || 'br4bet';
const AMBIENTE = process.argv[3] || 'hml';

console.log('🧪 Testando API de integração ClickUp');
console.log('=====================================');

async function testHealthCheck() {
  console.log('\n1. Health check...');
  try {
    const response = await fetch(`${API_BASE}/health`);
    const data = await response.json();
    console.log('✅ API funcionando:', data);
    return true;
  } catch (error) {
    console.error('❌ API não está rodando:', error.message);
    console.log('💡 Execute "npm start" primeiro');
    return false;
  }
}

async function testCreateGmud() {
  console.log(`\n2. Criando GMUD para ${CASA} - ${AMBIENTE}...`);
  try {
    const response = await fetch(`${API_BASE}/gmud`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        casa: CASA, 
        ambiente: AMBIENTE,
        usuario: 'rafael.silva',
        pipelineUrl: 'https://github.com/cometagaming/workflow-modules/actions/runs/123456'
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ GMUD criada:', data);
      return data.taskId;
    } else {
      console.error('❌ Falha ao criar GMUD:', data);
      return null;
    }
  } catch (error) {
    console.error('❌ Erro ao criar GMUD:', error.message);
    return null;
  }
}

async function testGetStatus(taskId) {
  console.log('\n3. Verificando status da GMUD...');
  try {
    const response = await fetch(`${API_BASE}/gmud/${taskId}/status`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Status atual:', data);
      return data;
    } else {
      console.error('❌ Falha ao verificar status:', data);
      return null;
    }
  } catch (error) {
    console.error('❌ Erro ao verificar status:', error.message);
    return null;
  }
}

async function testWaitApproval(taskId) {
  console.log('\n4. Aguardando aprovação (timeout: 2 minutos)...');
  try {
    const response = await fetch(`${API_BASE}/gmud/${taskId}/wait`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timeoutMinutes: 2,
        pollIntervalSeconds: 10
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Resultado da aprovação:', data);
      return data;
    } else {
      console.error('❌ Falha ao aguardar aprovação:', data);
      return null;
    }
  } catch (error) {
    console.error('❌ Erro ao aguardar aprovação:', error.message);
    return null;
  }
}

async function main() {
  try {
    // Teste 1: Health check
    const isApiRunning = await testHealthCheck();
    if (!isApiRunning) {
      process.exit(1);
    }

    // Teste 2: Criar GMUD
    const taskId = await testCreateGmud();
    if (!taskId) {
      process.exit(1);
    }

    // Teste 3: Verificar status
    await testGetStatus(taskId);

    // Teste 4: Aguardar aprovação
    await testWaitApproval(taskId);

    console.log('\n🎯 Teste concluído!');
    console.log('📋 Acesse o ClickUp para aprovar/negar a GMUD:');
    console.log('   https://app.clickup.com/9013334553/v/b/li/901321558663');
    console.log('\n💡 Para testar com diferentes parâmetros:');
    console.log('   node scripts/test-api.js <casa> <ambiente>');
    console.log('   Exemplo: node scripts/test-api.js br4bet prd');

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    process.exit(1);
  }
}

main();
