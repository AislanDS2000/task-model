# Integrações locais

## Registros e skill

Agora oferece registro manual (sem inventar consumo), correção de identificador com original preservado e restauração. Correções persistem nas importações. O seletor continua sendo filtro, não controle do modelo executado. Não há catálogo confirmado da conta.

Exportar pacote cria uma pasta datada Task-Model-Advisor-v1 com task-model-advisor/SKILL.md e referências. Instalar/atualizar solicita aplicativo, escopo pessoal/projeto e confirmação do caminho. Usa .agents/skills para Codex, .claude/skills para Claude Code e .cursor/skills para Cursor. Atualiza apenas destino com marcador task-model.json; versões antigas sem marcador são recusadas para evitar sobrescrita indevida. Backup fica no diretório de dados do Task Model em skill-backups. Recarregue o agente depois da instalação. Não há sincronização automática da conta nem instalação pelo navegador de demonstração.

## Estado da implementação

- Codex: importação existente de sessions, com contadores cumulativos e feedback explícito.
- Claude Code: importação de projects/**/*.jsonl. Deduplicação por message.id; cada resposta representa um registro, não necessariamente uma tarefa inteira. Entrada normalizada = input_tokens + cache_read_input_tokens + cache_creation_input_tokens. Campo ausente fica indisponível. Subagentes são excluídos nesta versão para evitar atribuição ambígua; totais não representam toda a conta. Feedback automático ainda não extraído neste adaptador.
- Cursor: ingestão de eventos stop do hook local. Modelo e término são registrados; título genérico, sem importar o transcript. Tokens ficam indisponíveis até validar um contrato de contadores. Não importa histórico anterior à ativação. Não inclui Tab nem subagentes.

Não há catálogo de todos os modelos oferecidos pelos serviços. Filtros descobrem modelos efetivamente registrados e preservam IDs exatos. Cota permanece exclusiva do Codex. Comparações são observacionais, não benchmarks equivalentes.

## Ativar Cursor (opcional)

O coletor está em desktop/cursor-hook.cjs e requer Node.js. Adicione um evento stop ao hooks.json do usuário do Cursor, preservando todos os eventos existentes:

```json
{
  "version": 1,
  "hooks": {
    "stop": [
      {
        "command": "node \"CAMINHO_ABSOLUTO/desktop/cursor-hook.cjs\""
      }
    ]
  }
}
```

Substitua o caminho pelo arquivo local. O script grava somente identificadores, modelo, status e horário em %USERPROFILE%/.task-model/cursor/events.jsonl. Não grava e-mail, credenciais nem conversa. No Task Model, selecione Cursor → Conectar Cursor → essa pasta. Nenhuma configuração pessoal foi alterada automaticamente. A integração exige validação com uma execução real antes de distribuir.

## Fontes verificadas em 22/09/2026

- https://code.claude.com/docs/en/claude-directory
- https://code.claude.com/docs/en/monitoring-usage
- https://cursor.com/docs/hooks

Os adaptadores novos foram testados com fixtures sintéticas. Claude Code e Cursor ainda precisam de validação com registros reais da versão instalada. O Task Model continua local, sem API de IA para análise.
