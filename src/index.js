import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createGmud, getGmudStatus, updateGmudStatus, waitForApproval } from './services/clickupService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Criar GMUD
app.post('/gmud', async (req, res) => {
  try {
    const { casa, ambiente, status = 'EM ANÁLISE', usuario = 'Sistema', pipelineUrl = '' } = req.body;
    
    if (!casa || !ambiente) {
      return res.status(400).json({ 
        error: 'Casa e ambiente são obrigatórios' 
      });
    }

    const result = await createGmud(casa, ambiente, status, usuario, pipelineUrl);
    res.json(result);
  } catch (error) {
    console.error('Erro ao criar GMUD:', error);
    res.status(500).json({ 
      error: 'Falha ao criar GMUD', 
      details: error.message 
    });
  }
});

// Verificar status da GMUD
app.get('/gmud/:taskId/status', async (req, res) => {
  try {
    const { taskId } = req.params;
    const status = await getGmudStatus(taskId);
    res.json({ taskId, status });
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    res.status(500).json({ 
      error: 'Falha ao verificar status', 
      details: error.message 
    });
  }
});

// Aguardar aprovação (polling)
app.post('/gmud/:taskId/wait', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { 
      timeoutMinutes = 60, 
      pollIntervalSeconds = 30,
      approvedStatus = 'APROVADAS',
      rejectedStatus = 'NEGADAS'
    } = req.body;

    const result = await waitForApproval(taskId, {
      timeoutMinutes,
      pollIntervalSeconds,
      approvedStatus,
      rejectedStatus
    });

    res.json(result);
  } catch (error) {
    console.error('Erro ao aguardar aprovação:', error);
    res.status(500).json({ 
      error: 'Falha ao aguardar aprovação', 
      details: error.message 
    });
  }
});

// Atualizar status da GMUD
app.put('/gmud/:taskId/status', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ 
        error: 'Status é obrigatório' 
      });
    }

    await updateGmudStatus(taskId, status);
    res.json({ taskId, status, message: 'Status atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ 
      error: 'Falha ao atualizar status', 
      details: error.message 
    });
  }
});

// Webhook para receber notificações do ClickUp
app.post('/webhook/clickup', (req, res) => {
  try {
    const { event, task_id, status } = req.body;
    console.log(`Webhook ClickUp: ${event} - Task ${task_id} - Status: ${status}`);
    
    // Aqui você pode implementar lógica para notificar GitHub Actions
    // ou outros sistemas quando o status mudar
    
    res.json({ received: true });
  } catch (error) {
    console.error('Erro no webhook:', error);
    res.status(500).json({ error: 'Falha no webhook' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API rodando na porta ${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
});
