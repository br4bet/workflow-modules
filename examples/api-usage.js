// Exemplo de uso da API para integração com ClickUp
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000';

// Exemplo 1: Criar GMUD
async function createGmud(casa, ambiente, usuario = 'Sistema', pipelineUrl = '') {
  try {
    const response = await fetch(`${API_BASE}/gmud`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        casa, 
        ambiente, 
        usuario, 
        pipelineUrl 
      })
    });
    
    const result = await response.json();
    console.log('GMUD criada:', result);
    return result.taskId;
  } catch (error) {
    console.error('Erro ao criar GMUD:', error);
    throw error;
  }
}

// Exemplo 2: Aguardar aprovação
async function waitForApproval(taskId) {
  try {
    const response = await fetch(`${API_BASE}/gmud/${taskId}/wait`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timeoutMinutes: 60,
        pollIntervalSeconds: 30
      })
    });
    
    const result = await response.json();
    console.log('Resultado da aprovação:', result);
    return result.approved;
  } catch (error) {
    console.error('Erro ao aguardar aprovação:', error);
    throw error;
  }
}

// Exemplo 3: Verificar status
async function checkStatus(taskId) {
  try {
    const response = await fetch(`${API_BASE}/gmud/${taskId}/status`);
    const result = await response.json();
    console.log('Status atual:', result);
    return result.status;
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    throw error;
  }
}

// Exemplo 4: Fluxo completo
async function deployWithGmud(casa, ambiente, usuario = 'Sistema', pipelineUrl = '') {
  try {
    console.log(`🚀 Iniciando deploy de ${casa} para ${ambiente} por ${usuario}`);
    
    // 1. Criar GMUD
    const taskId = await createGmud(casa, ambiente, usuario, pipelineUrl);
    console.log(`📋 GMUD criada: ${taskId}`);
    
    // 2. Aguardar aprovação
    console.log('⏳ Aguardando aprovação...');
    const approved = await waitForApproval(taskId);
    
    if (approved) {
      console.log('✅ GMUD aprovada! Executando deploy...');
      // Aqui você executa seu deploy real
      await executeDeploy(casa, ambiente);
      
      // 3. Marcar como completa
      await fetch(`${API_BASE}/gmud/${taskId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETE' })
      });
      
      console.log('🎉 Deploy concluído com sucesso!');
    } else {
      console.log('❌ GMUD negada. Deploy cancelado.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Erro no fluxo de deploy:', error);
    process.exit(1);
  }
}

// Simulação de deploy
async function executeDeploy(casa, ambiente) {
  console.log(`🔧 Executando deploy de ${casa} para ${ambiente}...`);
  // Simular tempo de deploy
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log('✅ Deploy executado com sucesso!');
}

// Executar exemplo
if (import.meta.url === `file://${process.argv[1]}`) {
  const casa = process.argv[2] || 'br4bet';
  const ambiente = process.argv[3] || 'hml';
  const usuario = process.argv[4] || 'rafael.silva';
  const pipelineUrl = process.argv[5] || 'https://github.com/org/repo/actions/runs/123456';
  
  deployWithGmud(casa, ambiente, usuario, pipelineUrl);
}
