
# Diretrizes de Arquitetura React

### 

- **Evite Prop Drilling**
    - Não propague funções por vários níveis de componentes.
    - Componentes podem importar diretamente stores, actions e hooks compartilhados.
- **Componentes complexos devem ser separados em 3 camadas (composition, container e ui)**
    - Composition
        - Orquestra a funcionalidade.
        - Configura `Suspense`, `ErrorBoundary` e providers locais.
        - Compõe containers e layouts.
        - Não acessa API, Zustand ou React Query diretamente.
    - Container
        - Integra a aplicação com fontes externas.
        - Utiliza TanStack Query, Zustand, WebSocket e serviços.
        - Transforma e coordena dados.
        - Injeta dados e ações na UI.
        - Não contém detalhes visuais relevantes.
    - UI
        - Responsável pela renderização da interface.
        - Gerencia apenas estado local e comportamento visual.
        - Recebe dados e ações via props.
        - Não conhece API, React Query, WebSocket ou infraestrutura.

Fluxo: Composition → Container → UI

Não há necessidade de separacao em camadas para componentes simples sem interação com serviços externos. Evitar colocar regras de negocio e logica interna nas camadas de container e composition.

- **Priorize Testabilidade**
    - UI deve ser testável de forma isolada.
    - Dependências externas devem ser mockáveis.
    - Regras de renderização não devem depender de backend ou WebSocket.
- **Organize por Escopo**
    - Recursos usados apenas por um módulo ficam dentro do próprio módulo.
    - Recursos reutilizados por múltiplos módulos podem ser promovidos para a raiz.
    - Sempre seguir: **Local → Reutilização comprovada → Global**.
- **Mantenha Estrutura Consistente**
    - A mesma organização da raiz pode ser repetida em páginas e módulos:
        
        ```
        components/
        hooks/
        stores/
        services/
        types/
        utils/
        ```
        
    - O que muda é apenas o escopo (local ou global).
- **Evite Globalização Prematura**
    - Não criar componentes, hooks, stores ou serviços globais sem necessidade real.
    - Promova para a raiz apenas após reutilização comprovada.
- **Evite Nomes Redundantes**
    - O diretório já fornece contexto.
    - Prefira:
        
        ```
        pages/
          call/
            container.tsx
            view.tsx
            store.ts
            api.ts
            types.ts
        ```
        
    - Evite:
        
        ```
        CallPage/
        CallContainer.tsx
        CallStore.ts
        CallApi.ts
        ```
        

exemplo de diretorio store para gerenciamento de estados do zustand:

stores
├── call
│   ├── actions.ts
│   ├── simulation.ts
│   ├── state.ts
│   └── store.ts
└── user
├── actions.ts
├── simulation.ts
├── state.ts
└── store.ts

simulation devem guardar actions e mock do estado inicial referentes a simulação.

- **Dependências Externas Ficam na Borda**
    - API, WebSocket, React Query e Zustand devem ficar em containers, serviços ou hooks de integração.
    - Componentes visuais devem permanecer desacoplados dessas implementações.
- **Composição Acima de Acoplamento**
    - Prefira componentes pequenos, especializados e compostos entre si.
    - Mantenha regras de negócio e infraestrutura fora da camada visual.
- **Zustand para Estado de Aplicação**
    - Utilize Zustand para estados locais ou globais relacionados à lógica da aplicação.
    - Exemplos: autenticação, preferências do usuário, estado de modais, timers, seleção de itens, estado de interface e coordenação entre componentes.
    - Zustand não deve ser utilizado como cache de dados remotos.
- **TanStack Query para Estado Remoto**
    - Utilize TanStack Query para dados carregados por API ou qualquer fonte externa.
    - Responsável por cache, refetch, invalidação, sincronização, loading, error handling e atualizações otimistas.
    - Evite duplicar no Zustand dados já gerenciados pelo cache do TanStack Query.
- **Integração**
    - Stores podem armazenar parâmetros utilizados pelas queries.
    - Evite copiar resultados de queries para stores sem necessidade real.
- **Loading, Error e Suspense**
    - Sempre que um componente depender de dados carregados por TanStack Query, a UI deve ser envolvida por:
        - `Suspense` para estados de carregamento.
        - `ErrorBoundary` para tratamento de falhas.
- **Abstração de Infraestrutura**
    - Toda integração com API, WebSocket ou serviços externos deve ser encapsulada atrás de uma interface única.
    - A aplicação não deve depender diretamente da implementação concreta da infraestrutura.

**3 Cenários de Execução**

- **Simulation**
    - Não realiza chamadas externas.
    - APIs retornam dados mockados.
    - WebSockets são simulados localmente.
    - Mutations utilizam atualização otimista.
    - Permite desenvolvimento e testes sem dependência de backend.
- **Development**
    - Utiliza a infraestrutura local de desenvolvimento.
    - Conecta ao backend local.
    - Conecta a bancos, APIs e WebSockets do ambiente de desenvolvimento.
    - Permite validação da integração real durante o desenvolvimento.
- **Production**
    - Utiliza a infraestrutura de produção.
    - Conecta aos serviços reais da aplicação.
    - Deve refletir o comportamento final entregue aos usuários.
- **Troca de Cenário**
    - através de uma única variável de ambiente com o valores (simulation, development e production)
    - Toda dependência externa deve poder ser executada em Simulation, Development ou Production sem exigir alterações na UI, Containers ou regras de negócio.