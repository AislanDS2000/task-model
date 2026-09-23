# Task Model — Desktop 0.2

Copyright © 2026 Aislan dos Santos Barbosa Cruz. Código-fonte disponível sob [MIT License com Commons Clause](LICENSE): você pode usar, estudar, modificar e compartilhar o projeto dentro desses termos, mas não vender o Task Model em si. Esta não é uma licença open source aprovada pela OSI. Veja [como contribuir](CONTRIBUTING.md).

Aplicativo local para relacionar consumo, tipo de tarefa, modelo e resultado. Inclui janela compacta sempre visível, histórico local em SQLite e exportação de uma skill que consulta os resultados pessoais. Sem API de IA.

Requer Node.js 24.15+ para desenvolver. Usuários do instalador não precisam de Node.

```sh
npm ci
npm test
npm run desktop
```

Gere o instalador Windows com `npm run build:exe`. Ele fica em `release/Task-Model-Setup-0.2.0.exe`. Leia [funcionamento, limites e privacidade](docs/desktop.md) antes de usar ou contribuir. O instalador ainda não tem assinatura digital.

## Versão web anterior

As informações abaixo descrevem o diário manual do navegador, que continua disponível. Seus registros são separados da coleta desktop e não são migrados automaticamente.

Um observatório pessoal, local-first, para descobrir quais combinações de modelo e nível de raciocínio funcionam melhor no seu próprio trabalho com Codex.

## Executar localmente

Requer Node.js 20 ou superior.

```bash
npm install
npm run dev
```

Abra o endereço exibido pelo Vite (normalmente `http://localhost:5173`). Para validar a versão de produção:

```bash
npm test
npm run build
npm run preview
```

## O que está incluído

- Registro, edição e exclusão confirmada de testes
- Modelos Luna, Terra, Sol e Astra e seis níveis de raciocínio
- Painel com sucesso, primeira tentativa, tentativas médias, tempo, categorias e atividade
- Histórico pesquisável e filtrável
- Comparação entre modelos
- Inferências pessoais baseadas somente nos registros locais
- Dados de demonstração opcionais e explicitamente identificados
- Exportação JSON/CSV e importação JSON validada
- Interface responsiva, acessível por teclado e compatível com `prefers-reduced-motion`

## Arquitetura

Aplicação React 19 + TypeScript construída com Vite. A camada de domínio está separada em `data.ts`, `analytics.ts` e `types.ts`; a interface fica em `App.tsx`. Não existe backend, conta ou telemetria. A persistência usa uma chave versionada no `localStorage`, adequada ao volume pequeno e ao caráter local desta primeira versão.

## Privacidade e segurança dos dados

Os registros permanecem no navegador deste dispositivo. Eles não são enviados para nenhum servidor. Limpar os dados do navegador, trocar de perfil ou usar uma janela anônima pode apagá-los; faça exportações JSON periódicas para manter um backup. A importação substitui o conjunto atual somente após validar todos os registros.

## Evolução sugerida

1. Migrar para IndexedDB quando anexos ou volumes maiores forem necessários.
2. Adicionar visualização cruzada por categoria, complexidade e esforço.
3. Oferecer PWA instalável e backup local automático.
4. Permitir campos e categorias personalizados.
5. Considerar sincronização opcional com criptografia ponta a ponta, sem alterar o padrão local-first.
