# 💼 Nexo — Gerenciador de Finanças Pessoais

Sistema moderno de gestão financeira pessoal e fluxo de caixa antecipado integrado diretamente ao **Open Finance Brasil** via **Pluggy API**.

Projetado com estética moderna (padrão Linear/Mercury), o Nexo vai além do extrato tradicional bancário: ele calcula o **"Raio-X do Salário"**, descontando automaticamente suas faturas de cartão de crédito e contas fixas recorrentes para entregar a sua métrica mais importante: **o seu Saldo Livre Real e limite de gastos diários seguros**.

---

## 🚀 Funcionalidades Principais

- **📊 Raio-X do Salário (Fluxo de Caixa Antecipado):**
  - Dedução em tempo real: `(Salário + Saldo Bancário) - Fatura do Cartão - Contas Fixas = Saldo Livre Real`.
  - Orçamento de sobrevivência diário (`R$ / dia` até o próximo ciclo).
  - Alerta inteligente de comprometimento de renda.
- **🎯 Simulador "Cabe no meu bolso?":**
  - Teste qualquer compra antes de passar o cartão e veja instantaneamente o impacto no seu saldo livre.
- **📌 Contas Fixas & Recorrentes:**
  - Gestão de compromissos mensais (aluguel, água, luz, internet, ajuda à família).
  - Checkbox interativo para marcar/desmarcar contas pagas no mês.
- **📈 Gráfico de Gastos por Categoria (Donut Chart):**
  - Visualização interativa com Recharts e detalhamento ordenado por categoria.
- **✨ Extrato Inteligente com Open Finance:**
  - Conexão oficial com bancos brasileiros (Mercado Pago, Nubank, Itaú, Bradesco, Inter, etc.).
  - Switch iOS para ignorar movimentações internas ou reembolsos do orçamento.
  - Exportação de extrato em CSV.
- **🎯 Metas Financeiras:**
  - Acompanhamento visual de objetivos de poupança com barra de progresso.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** Next.js 14, React 18, Tailwind CSS, Recharts, Lucide Icons.
- **Backend:** FastAPI (Python), SQLAlchemy, Pydantic v2, Uvicorn.
- **Banco de Dados:** SQLite (padrão local, zero configuração) ou PostgreSQL (opcional).
- **Open Finance:** Pluggy API (Connect Widget oficial).

---

## ⚡ Como Rodar o Projeto

### 1. Pré-requisitos
- **Node.js** 18+ e **npm**
- **Python** 3.10+

### 2. Configuração do Ambiente
Clone o repositório e crie o seu arquivo `.env`:
```bash
cp .env.example .env
```

Abra o `.env` e preencha suas credenciais gratuitas da **Pluggy**:
1. Cadastre-se gratuitamente em [dashboard.pluggy.ai](https://dashboard.pluggy.ai/).
2. Copie o **Client ID** e **Client Secret** na aba de credenciais e cole no `.env`:
```env
PLUGGY_CLIENT_ID=seu_client_id_aqui
PLUGGY_CLIENT_SECRET=seu_client_secret_aqui
```

### 3. Iniciar o Sistema
Basta executar o script único de inicialização:

**No Linux / macOS:**
```bash
./start.sh
```

**No Windows:**
```bat
start_windows.bat
```

O script cuidará de tudo:
- Cria o ambiente virtual Python (`.venv`) e instala os pacotes do backend.
- Instala os pacotes do frontend (`npm install`).
- Inicia o backend FastAPI em `http://localhost:8000`.
- Inicia o frontend Next.js em `http://localhost:3000`.

### 4. Conectar seu Banco
Com os serviços rodando:
1. Acesse **[http://localhost:8000/connect](http://localhost:8000/connect)** no seu navegador.
2. O conector oficial seguro da Pluggy abrirá para você autenticar sua instituição bancária via Open Finance.
3. Acesse **[http://localhost:3000](http://localhost:3000)** e acompanhe seu painel financeiro atualizado!

---

## 🔒 Segurança e Privacidade
- O arquivo `.env` contendo suas credenciais de API é ignorado pelo `.gitignore` e **nunca** é enviado ao repositório.
- O banco de dados local (`*.db`) é mantido estritamente em sua máquina local para preservar o sigilo das suas informações financeiras.

---

## 📝 Licença
Distribuído sob a licença MIT. Sinta-se livre para usar, estudar e contribuir.

