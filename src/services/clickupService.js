import fetch from 'node-fetch';

const CLICKUP_API_BASE = 'https://api.clickup.com/api/v2';
const LIST_ID = process.env.CLICKUP_LIST_ID || '901321558663';

function getAuthHeader(token) {
  // Suporta tanto Personal Token (pk_...) quanto OAuth (Bearer)
  return token.startsWith('pk_') 
    ? { Authorization: token }
    : { Authorization: `Bearer ${token}` };
}

async function makeRequest(url, options = {}) {
  const token = process.env.CLICKUP_TOKEN;
  if (!token) {
    throw new Error('CLICKUP_TOKEN não configurado');
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeader(token),
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`ClickUp API Error: ${response.status} - ${JSON.stringify(data)}`);
  }

  return data;
}

export async function createGmud(casa, ambiente, status = 'EM ANÁLISE', usuario = 'Sistema', pipelineUrl = '') {
  const taskName = `[GMUD] ${casa} - ${ambiente} (por ${usuario})`;
  
  const payload = {
    name: taskName,
    status: status
  };

  try {
    const result = await makeRequest(`${CLICKUP_API_BASE}/list/${LIST_ID}/task`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    // Adicionar comentário com informações da pipeline
    if (pipelineUrl) {
      try {
        const comment = `🚀 **Pipeline iniciada por ${usuario}**\n\n📋 **Detalhes:**\n- Casa: ${casa}\n- Ambiente: ${ambiente}\n- Usuário: ${usuario}\n- Pipeline: ${pipelineUrl}\n\n⏳ **Aguardando aprovação...**`;
        await addComment(result.id, comment);
      } catch (error) {
        console.warn(`Falha ao adicionar comentário: ${error.message}`);
      }
    }

    return {
      taskId: result.id,
      name: result.name,
      status: result.status.status,
      url: result.url,
      message: 'GMUD criada com sucesso'
    };
  } catch (error) {
    throw new Error(`Falha ao criar GMUD: ${error.message}`);
  }
}

export async function getGmudStatus(taskId) {
  try {
    const result = await makeRequest(`${CLICKUP_API_BASE}/task/${taskId}`);
    return {
      taskId: result.id,
      name: result.name,
      status: result.status.status,
      url: result.url,
      assignees: result.assignees,
      dateCreated: result.date_created,
      dateUpdated: result.date_updated
    };
  } catch (error) {
    throw new Error(`Falha ao obter status da GMUD: ${error.message}`);
  }
}

export async function updateGmudStatus(taskId, status) {
  try {
    const result = await makeRequest(`${CLICKUP_API_BASE}/task/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });

    return {
      taskId: result.id,
      status: result.status.status,
      message: 'Status atualizado com sucesso'
    };
  } catch (error) {
    throw new Error(`Falha ao atualizar status: ${error.message}`);
  }
}

export async function waitForApproval(taskId, options = {}) {
  const {
    timeoutMinutes = 60,
    pollIntervalSeconds = 30,
    approvedStatus = 'APROVADAS',
    rejectedStatus = 'NEGADAS'
  } = options;

  const startTime = Date.now();
  const timeoutMs = timeoutMinutes * 60 * 1000;

  console.log(`⏳ Aguardando aprovação da GMUD ${taskId}...`);
  console.log(`⏰ Timeout: ${timeoutMinutes} minutos`);
  console.log(`🔄 Polling a cada ${pollIntervalSeconds} segundos`);

  while (Date.now() - startTime < timeoutMs) {
    try {
      const gmud = await getGmudStatus(taskId);
      const currentStatus = gmud.status.toUpperCase();
      
      console.log(`📊 Status atual: ${currentStatus}`);

      if (currentStatus === approvedStatus.toUpperCase()) {
        console.log('✅ GMUD aprovada!');
        return {
          approved: true,
          taskId,
          status: currentStatus,
          message: 'GMUD aprovada com sucesso'
        };
      }

      if (currentStatus === rejectedStatus.toUpperCase()) {
        console.log('❌ GMUD negada!');
        return {
          approved: false,
          taskId,
          status: currentStatus,
          message: 'GMUD negada'
        };
      }

      // Aguarda antes da próxima verificação
      await new Promise(resolve => setTimeout(resolve, pollIntervalSeconds * 1000));
    } catch (error) {
      console.error(`Erro ao verificar status: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, pollIntervalSeconds * 1000));
    }
  }

  throw new Error(`Timeout aguardando aprovação (${timeoutMinutes} minutos)`);
}

export async function completeGmud(taskId) {
  return await updateGmudStatus(taskId, 'COMPLETE');
}

export async function addComment(taskId, comment) {
  try {
    const result = await makeRequest(`${CLICKUP_API_BASE}/task/${taskId}/comment`, {
      method: 'POST',
      body: JSON.stringify({ comment_text: comment })
    });
    return result;
  } catch (error) {
    throw new Error(`Falha ao adicionar comentário: ${error.message}`);
  }
}

export async function getListFields() {
  try {
    const result = await makeRequest(`${CLICKUP_API_BASE}/list/${LIST_ID}/field`);
    return result;
  } catch (error) {
    throw new Error(`Falha ao obter campos da lista: ${error.message}`);
  }
}
