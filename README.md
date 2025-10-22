# Workflow Modules - ClickUp GMUD Integration

Sistema completo para automação de GMUDs (Gestão de Mudanças) via ClickUp, integrado com GitHub Actions.

## 🚀 Funcionalidades

- **API REST** para integração com ClickUp
- **GitHub Action customizada** para pipelines
- **Polling automático** de aprovação
- **Webhooks** para notificações em tempo real
- **Suporte completo** aos status: EM ANÁLISE → APROVADAS/NEGADAS → COMPLETE

## 📋 Pré-requisitos

1. **ClickUp configurado** com:
   - Space: Change Management
   - List: GMUDs Simples (ID: 901321558663)
   - Status: EM ANÁLISE, APROVADAS, NEGADAS, COMPLETE

2. **Token ClickUp** (Personal Token ou OAuth)
3. **Node.js 20+**

## 🛠️ Instalação

```bash
# Clone o repositório
git clone <repo-url>
cd workflow-modules

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp env.example .env
# Edite o .env com suas credenciais
```

## 🔧 Configuração

### 1. Variáveis de Ambiente

```bash
# .env
CLICKUP_TOKEN=pk_your_token_here
CLICKUP_LIST_ID=901321558663
PORT=3000
NODE_ENV=development
```

### 2. GitHub Secrets

No seu repositório GitHub, adicione:

- `CLICKUP_TOKEN`: Seu token do ClickUp

## 🚀 Uso

### Opção 1: API REST

```bash
# Iniciar a API
npm start

# Criar GMUD
curl -X POST http://localhost:3000/gmud \
  -H "Content-Type: application/json" \
  -d '{"casa":"br4bet","ambiente":"hml"}'

# Aguardar aprovação
curl -X POST http://localhost:3000/gmud/{taskId}/wait \
  -H "Content-Type: application/json" \
  -d '{"timeoutMinutes":60}'
```

### Opção 2: GitHub Action

```yaml
# .github/workflows/deploy.yml
name: Deploy com GMUD

on:
  workflow_dispatch:
    inputs:
      casa:
        description: 'Nome da casa'
        required: true
      ambiente:
        description: 'Ambiente'
        required: true

jobs:
  gmud-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: ClickUp GMUD Gate
        uses: ./.github/actions/clickup-gmud
        with:
          clickup_token: ${{ secrets.CLICKUP_TOKEN }}
          list_id: '901321558663'
          casa: ${{ inputs.casa }}
          ambiente: ${{ inputs.ambiente }}
          usuario: ${{ github.actor }}
          pipeline_url: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}

  deploy:
    runs-on: ubuntu-latest
    needs: gmud-gate
    steps:
      - name: Deploy
        run: ./deploy.sh
```

## 📚 API Endpoints

### POST /gmud
Cria uma nova GMUD

**Body:**
```json
{
  "casa": "br4bet",
  "ambiente": "hml",
  "status": "EM ANÁLISE",
  "usuario": "rafael.silva",
  "pipelineUrl": "https://github.com/org/repo/actions/runs/123456"
}
```

**Response:**
```json
{
  "taskId": "123456789",
  "name": "[GMUD] br4bet - hml",
  "status": "EM ANÁLISE",
  "url": "https://app.clickup.com/...",
  "message": "GMUD criada com sucesso"
}
```

### GET /gmud/:taskId/status
Verifica o status atual da GMUD

### POST /gmud/:taskId/wait
Aguarda aprovação (polling)

**Body:**
```json
{
  "timeoutMinutes": 60,
  "pollIntervalSeconds": 30,
  "approvedStatus": "APROVADAS",
  "rejectedStatus": "NEGADAS"
}
```

### PUT /gmud/:taskId/status
Atualiza o status da GMUD

**Body:**
```json
{
  "status": "COMPLETE"
}
```

## 🧪 Testes

```bash
# Opção 1: Script completo (recomendado)
./start.sh

# Opção 2: Teste manual
npm start                    # Terminal 1: Iniciar API
node scripts/test-api.js     # Terminal 2: Testar API

# Opção 3: Script bash
./scripts/test-api.sh

# Opção 4: Teste com parâmetros
node scripts/test-api.js br4bet prd
```

## 🔄 Fluxo Completo

1. **Pipeline inicia** → Cria GMUD no ClickUp
2. **GMUD fica EM ANÁLISE** → Aguarda aprovação manual
3. **Aprovador decide** → APROVADAS ou NEGADAS
4. **Pipeline continua** → Se aprovada, executa deploy
5. **Deploy concluído** → Marca GMUD como COMPLETE

## 🛡️ Segurança

- Tokens armazenados apenas em GitHub Secrets
- Validação de inputs obrigatórios
- Timeout configurável para evitar loops infinitos
- Logs detalhados para auditoria

## 📖 Exemplos

Veja a pasta `examples/` para:
- Workflow completo do GitHub Actions
- Scripts de uso da API
- Casos de uso avançados

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

MIT License - veja o arquivo LICENSE para detalhes.