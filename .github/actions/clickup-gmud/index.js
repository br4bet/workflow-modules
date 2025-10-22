// Usando fetch nativo do Node.js 20+

const core = {
  getInput: (key, options = {}) => {
    const value = process.env[`INPUT_${key.toUpperCase()}`];
    if (!value && options.required) {
      throw new Error(`Input required and not supplied: ${key}`);
    }
    return value || options.default || '';
  },
  setOutput: (key, value) => {
    console.log(`::set-output name=${key}::${value}`);
  },
  info: (message) => console.log(`ℹ️ ${message}`),
  warning: (message) => console.warn(`⚠️ ${message}`),
  error: (message) => console.error(`❌ ${message}`)
};

function getAuthHeader(token) {
  return token.startsWith('pk_') 
    ? { Authorization: token }
    : { Authorization: `Bearer ${token}` };
}

async function createTask(headers, listId, name, status) {
  const response = await fetch(`https://api.clickup.com/api/v2/list/${listId}/task`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, status })
  });

  const data = await response.json();
  
  if (!response.ok || !data?.id) {
    throw new Error(`Falha ao criar GMUD: HTTP ${response.status} ${JSON.stringify(data)}`);
  }
  
  return data.id;
}

async function getTaskStatus(headers, taskId) {
  const response = await fetch(`https://api.clickup.com/api/v2/task/${taskId}`, { 
    headers 
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Falha ao consultar GMUD: HTTP ${response.status} ${JSON.stringify(data)}`);
  }
  
  return data?.status?.status || '';
}

async function updateTaskStatus(headers, taskId, status) {
  const response = await fetch(`https://api.clickup.com/api/v2/task/${taskId}`, {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Falha ao atualizar status: HTTP ${response.status} ${text}`);
  }
}

async function addComment(headers, taskId, comment) {
  const response = await fetch(`https://api.clickup.com/api/v2/task/${taskId}/comment`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ comment_text: comment })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Falha ao adicionar comentário: HTTP ${response.status} ${text}`);
  }
}

async function sendDiscordNotification(webhookUrl, message) {
  if (!webhookUrl) {
    core.warning('DISCORD_WEBHOOK_URL não configurado, pulando notificação');
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: message })
    });

    if (!response.ok) {
      core.warning(`Falha ao enviar notificação Discord: HTTP ${response.status}`);
    } else {
      core.info('📢 Notificação enviada para Discord');
    }
  } catch (error) {
    core.warning(`Erro ao enviar notificação Discord: ${error.message}`);
  }
}

async function main() {
  try {
    // Inputs
    const token = core.getInput('clickup_token', { required: true });
    const listId = core.getInput('list_id', { required: true });
    const casa = core.getInput('casa', { required: true });
    const ambiente = core.getInput('ambiente', { required: true });
    const usuario = core.getInput('usuario') || 'Sistema';
    const pipelineUrl = core.getInput('pipeline_url') || '';
    
    const statusPending = core.getInput('status_pending') || 'EM ANÁLISE';
    const statusApproved = core.getInput('status_approved') || 'APROVADAS';
    const statusRejected = core.getInput('status_rejected') || 'NEGADAS';
    const statusComplete = core.getInput('status_complete') || 'COMPLETE';
    const pollIntervalSeconds = parseInt(core.getInput('poll_interval_seconds') || '30', 10);
    const timeoutMinutes = parseInt(core.getInput('timeout_minutes') || '60', 10);
    const completeOnSuccess = (core.getInput('complete_on_success') || 'true').toLowerCase() === 'true';
    const discordWebhookUrl = core.getInput('discord_webhook_url') || process.env.DISCORD_WEBHOOK_URL;
    core.info(`Discord webhook configurado: ${discordWebhookUrl ? 'Sim' : 'Não'}`);
    core.info(`Input discord_webhook_url: ${core.getInput('discord_webhook_url') || 'não fornecido'}`);
    core.info(`Env DISCORD_WEBHOOK_URL: ${process.env.DISCORD_WEBHOOK_URL || 'não definido'}`);

    const headers = getAuthHeader(token);
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    });
    const taskName = `[GMUD] ${casa} - ${ambiente} (por ${usuario}) - ${dateStr}`;

    // Criar GMUD
    core.info(`Criando GMUD: ${taskName} @ list ${listId} (status: ${statusPending})`);
    const taskId = await createTask(headers, listId, taskName, statusPending);
    core.info(`GMUD criada com ID: ${taskId}`);
    core.info(`🔗 Link da GMUD: https://app.clickup.com/t/${taskId}`);
    core.setOutput('task_id', taskId);

    // Notificar Discord - GMUD criada
    const gmudCreatedMessage = `🚀 **Nova GMUD Criada**\n\n**${casa}** → ${ambiente}\n👤 ${usuario}\n🔗 [Abrir no ClickUp](https://app.clickup.com/t/${taskId})\n\n⏳ **Aguardando aprovação...**`;
    await sendDiscordNotification(discordWebhookUrl, gmudCreatedMessage);

    // Adicionar comentário com informações da pipeline
    if (pipelineUrl) {
      try {
        const comment = `🚀 **Pipeline iniciada por ${usuario}**\n\n📋 **Detalhes:**\n- Casa: ${casa}\n- Ambiente: ${ambiente}\n- Usuário: ${usuario}\n- Pipeline: ${pipelineUrl}\n\n⏳ **Aguardando aprovação...**`;
        await addComment(headers, taskId, comment);
        core.info(`Comentário adicionado com link da pipeline`);
      } catch (error) {
        core.warning(`Falha ao adicionar comentário: ${error.message}`);
      }
    }

    // Polling para aguardar aprovação
    const deadline = Date.now() + timeoutMinutes * 60 * 1000;
    let finalStatus = '';
    
    core.info(`Aguardando aprovação (timeout: ${timeoutMinutes}min, polling: ${pollIntervalSeconds}s)`);
    
    while (Date.now() < deadline) {
      const currentStatus = (await getTaskStatus(headers, taskId)).toUpperCase();
      core.info(`Status atual: ${currentStatus}`);
      
      if (currentStatus === statusApproved.toUpperCase()) {
        core.info('✅ GMUD aprovada! Continuando o deploy...');
        core.info(`🔗 Link da GMUD aprovada: https://app.clickup.com/t/${taskId}`);
        
        // Notificar Discord - GMUD aprovada
        const gmudApprovedMessage = `✅ **GMUD Aprovada**\n\n**${casa}** → ${ambiente}\n👤 ${usuario}\n🔗 [Ver no ClickUp](https://app.clickup.com/t/${taskId})\n\n🚀 **Deploy iniciado**`;
        await sendDiscordNotification(discordWebhookUrl, gmudApprovedMessage);
        
        finalStatus = currentStatus;
        core.setOutput('approved', 'true');
        core.setOutput('status', currentStatus);
        break;
      }
      
      if (currentStatus === statusRejected.toUpperCase()) {
        core.error('❌ GMUD negada! Abortando deploy...');
        finalStatus = currentStatus;
        core.setOutput('approved', 'false');
        core.setOutput('status', currentStatus);
        process.exit(1);
      }
      
      await new Promise(resolve => setTimeout(resolve, pollIntervalSeconds * 1000));
    }
    
    if (!finalStatus) {
      throw new Error(`Timeout aguardando aprovação (${timeoutMinutes} minutos)`);
    }

    // Marcar como COMPLETE se solicitado
    if (completeOnSuccess && finalStatus === statusApproved.toUpperCase()) {
      try {
        await updateTaskStatus(headers, taskId, statusComplete);
        core.info(`GMUD marcada como ${statusComplete}`);
        core.info(`🔗 Link da GMUD finalizada: https://app.clickup.com/t/${taskId}`);
      } catch (error) {
        core.warning(`Falha ao marcar como ${statusComplete}: ${error.message}`);
      }
    }

  } catch (error) {
    core.error(error.message);
    process.exit(1);
  }
}

main();
