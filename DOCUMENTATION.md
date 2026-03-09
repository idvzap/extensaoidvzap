# Documentação da Extensão IDVZap

## 1. Visão Geral
A **Extensão IDVZap** é uma aplicação desenvolvida para funcionar como um **Painel Lateral (Side Panel)** em navegadores baseados no Chromium (como Google Chrome). O objetivo principal é centralizar a gestão de contratos, clientes, tarefas e processos jurídicos, integrando-se com serviços externos como **Advbox**, **ZapSign** e a própria plataforma **IDVZap**.

## 2. Tecnologias Utilizadas

### Frontend
- **React**: Biblioteca principal para construção da interface.
- **Vite**: Build tool e servidor de desenvolvimento.
- **TypeScript**: Superset JavaScript para tipagem estática.
- **Tailwind CSS**: Framework de estilização utilitária.
- **Shadcn/UI**: Biblioteca de componentes de interface reutilizáveis (baseada em Radix UI).
- **TanStack Query (React Query)**: Gerenciamento de estado assíncrono e cache de requisições.
- **React Router DOM**: Roteamento (embora o uso principal seja via navegação por abas locais).

### Backend / Infraestrutura
- **Supabase**: Backend-as-a-Service (BaaS).
  - **Edge Functions**: Funções serverless para intermediar chamadas a APIs externas (proxy seguro).
  - **Supabase Client**: Cliente JS para comunicação com o Supabase.

## 3. Arquitetura e Estrutura de Pastas

A estrutura do projeto segue o padrão moderno de aplicações React com Vite:

```
/
├── public/              # Arquivos estáticos (manifest.json, ícones)
├── src/
│   ├── components/      # Componentes React (UI e Painéis de Funcionalidade)
│   │   ├── ui/          # Componentes genéricos (botões, inputs, etc. - Shadcn)
│   │   ├── *Panel.tsx   # Painéis principais (Clients, Contracts, Tasks, etc.)
│   ├── hooks/           # Hooks personalizados (ex: use-toast)
│   ├── integrations/    # Configuração do Supabase
│   ├── lib/             # Lógica de negócios e integrações (API wrappers)
│   │   ├── advbox.ts    # Integração com Advbox
│   │   ├── idvzap.ts    # Integração com IDVZap
│   │   ├── zapsign.ts   # Integração com ZapSign
│   ├── pages/           # Páginas da aplicação (Index.tsx é a principal)
├── supabase/            # Configurações e Funções do Supabase
│   ├── functions/       # Código das Edge Functions (backend logic)
└── ...config files      # Arquivos de configuração (vite, tailwind, tsconfig)
```

## 4. Funcionalidades e Módulos

A aplicação é dividida em painéis, acessíveis através de uma barra de navegação lateral (`SideNav`):

### 4.1. Contratos (`ContractsPanel`)
Integração com **ZapSign**.
- **Listagem de Contratos**: Visualização de documentos enviados para assinatura.
- **Criação de Contratos**: Envio de novos documentos.
- **Modelos**: Uso de templates pré-definidos para geração de contratos.

### 4.2. Clientes (`ClientsPanel`)
Integração com **IDVZap** e **Advbox**.
- **Listagem de Contatos**: Visualização de contatos do IDVZap.
- **Busca**: Pesquisa de clientes.
- **Detalhes**: Exibição de informações extras e notas associadas.

### 4.3. Tarefas (`TasksPanel`)
Integração com **Advbox**.
- **Gestão de Tarefas**: Visualização de tarefas jurídicas com prazos, recompensas e responsáveis.
- **Vínculo com Processos**: Tarefas associadas a processos e clientes específicos.

### 4.4. Movimentações (`MovementsPanel`)
Integração com **Advbox**.
- **Acompanhamento Processual**: Visualização de movimentações em processos.
- **Publicações**: Monitoramento de publicações e intimações.

### 4.5. Resumo (`SummaryPanel`)
- Visão consolidada das atividades ou dashboard (implementação específica dependente do componente).

## 5. Integrações Externas (APIs)

A comunicação com serviços externos não é feita diretamente pelo frontend para proteger credenciais. O frontend chama `supabase.functions.invoke`, que por sua vez executa uma Edge Function no Supabase. Essas funções se comunicam com:

1.  **IDVZap**: Gestão de tickets, contatos e notas.
2.  **Advbox**: ERP Jurídico para tarefas, processos e clientes.
3.  **ZapSign**: Plataforma de assinatura eletrônica.

## 6. Instalação e Execução Local

### Pré-requisitos
- Node.js (versão LTS recomendada)
- Gerenciador de pacotes (npm, yarn, pnpm ou bun)

### Passos
1.  **Instalar dependências**:
    ```bash
    npm install
    # ou
    bun install
    ```

2.  **Executar em modo de desenvolvimento**:
    ```bash
    npm run dev
    ```
    Isso iniciará o servidor Vite. Você pode acessar via navegador para testar a interface, embora as APIs do Chrome (`chrome.runtime`) não estejam disponíveis fora da extensão.

3.  **Build para Produção**:
    ```bash
    npm run build
    ```
    Isso gerará a pasta `dist`.

4.  **Carregar no Chrome (Modo Desenvolvedor)**:
    - Acesse `chrome://extensions/`
    - Ative o "Modo do desenvolvedor" (canto superior direito).
    - Clique em "Carregar sem compactação".
    - Selecione a pasta `dist` gerada pelo build.

## 7. Scripts Disponíveis

- `dev`: Inicia o servidor de desenvolvimento.
- `build`: Compila o projeto para produção.
- `preview`: Visualiza o build de produção localmente.
- `lint`: Executa verificação de código (ESLint).
- `test`: Executa testes unitários (Vitest).
