# Acompanhamento local

## Primeiro uso

1. Clique em **Conectar pasta do Codex** e selecione `.codex/sessions` no perfil do usuário (ou equivalente em CODEX_HOME).
2. O aplicativo lê até 200 arquivos de sessão mais recentemente modificados e reavalia os arquivos alterados a cada 15 segundos.
3. Confira a etapa e sua categoria; avalie **De primeira**, **Com ajustes** ou **Não funcionou**. A avaliação é manual.
4. Em **Aprendizados**, exporte a skill para a pasta de skills do agente e recarregue as skills nele.

Fechar a janela a recolhe à bandeja. O menu da bandeja oferece painel, modo compacto e Sair. O modo compacto fica acima das outras janelas e pode ser movido pela barra nativa do Windows. O diário manual anterior continua acessível pelo painel expandido.

## Medição

Cada pedido `event_msg/user_message` define uma etapa observada. Mudanças de modelo/esforço geram registros distintos. Deltas dos contadores acumulados de `token_count` evitam duplicação. Na primeira observação e após reset, somente `last_token_usage` é atribuído para evitar importar consumo herdado de forks.

Entrada inclui cache; saída não soma novamente raciocínio. A última entrada e a janela de contexto são exibidas separadamente dos tokens processados na etapa. Cota vem do último `rate_limits` presente no registro, acompanhada de horário. Não é consulta ao vivo da conta nem atribuição de cota por etapa.

Trechos anteriores à primeira observação válida podem não ser contados. Etapas não equivalem necessariamente a tarefas completas. Subagentes não são agregados aos pais nesta versão. O formato dos arquivos locais pode mudar. Arquivos sem os eventos necessários não produzem métricas fictícias. Claude Code, Cursor e conversas comuns do ChatGPT ainda não têm coletores.

## Recomendações

O SQLite gera automaticamente `evidence.json` com agregados das avaliações. A skill exportada aponta para esse arquivo atualizado, sem copiar conversas. Agentes com suporte a SKILL.md e arquivos locais podem utilizá-la; clientes web sem acesso local não conseguem consultar o arquivo.

Grupos por categoria, modelo exato e esforço precisam de cinco avaliações e 80% de sucesso para serem elegíveis. A mediana inclui todas as etapas avaliadas, inclusive falhas. O limiar é uma heurística inicial, não prova estatística. Diferenças de contexto e dificuldade podem explicar diferenças de consumo. A skill informa a amostra, não promete economia exata, não troca o modelo e respeita a escolha do usuário. Categorias e resultados podem ser corrigidos no painel. Novos tokens na mesma etapa voltam a deixá-la pendente de avaliação.

## Dados

`task-model.sqlite` fica no diretório userData do Electron (Windows: normalmente `%APPDATA%/task-model`). Guarda contadores, modelo, categoria, avaliação e até 220 caracteres do pedido, que podem ser sensíveis. Não há envio desses dados para servidores, leitura de auth.json nem uso de cookies. Para backup, feche o aplicativo e copie o banco. O arquivo de evidências contém apenas agregados.

Pausar interrompe novas leituras, sem apagar dados. Desinstalar pode manter o diretório de dados. Limpeza seletiva, criptografia do banco e migração de registros do navegador ficam para versões futuras.

## Desenvolvimento e validação

- `src/Companion.tsx`: janela compacta e painel.
- `desktop/analysis.cjs`: parser e agregação independentes do Electron.
- `desktop/store.cjs`: SQLite via sql.js e escrita atômica.
- `desktop/main.cjs`: bandeja, coleta e exportação da skill.
- `skills/task-model-advisor/SKILL.md`: template; a exportação substitui o caminho das evidências.

`npm test` verifica o diário anterior, deduplicação, forks, resets, modelo, separação de pedidos, elegibilidade e persistência. Após `npm run build`, execute `npx electron . --compact --smoke-test`: usa um perfil temporário e dados fictícios para verificar renderer, preload, banco e avaliação; gera `release/companion-smoke.png`.

## Referências e distribuição

[Codenotch](https://github.com/vinzdg/codenotch) foi referência para compreender acompanhamento de cota; esta implementação é independente, sem trechos copiados dele. [Codex App Server](https://learn.chatgpt.com/docs/app-server) é um possível caminho futuro para cota ao vivo. A coleta atual usa somente registros locais.

O workflow Windows gera um instalador como artefato de build. Antes da distribuição pública estável: testar diferentes versões de registros e instalação em uma máquina limpa, revisar licenças dos assets anteriores e adicionar adaptadores para outros agentes. Nenhum histórico pessoal deve entrar no repositório.
# Prévia local — melhorias de setembro

## Direção visual — 22/09/2026

Refinamento das três abas do companion: tipografia de sistema mais firme, apoio em 12–14 px, ações arredondadas de 40–46 px, seleção violeta com texto branco, superfícies claras e métricas separadas. Preserva logo transparente e controles nativos. Estilos isolados em `src/companion-polish.css`, sem nova dependência.

Pesquisa: https://www.figma.com/templates/dashboard-designs/ (catálogo de descoberta); https://www.figma.com/community/file/1035203688168086460/material-3-design-kit (acesso ao arquivo bloqueado, componentes não inspecionados); https://www.untitledui.com/components/dashboards (apresentação pública e hierarquia de ações inspecionadas visualmente; embed do kit não carregou). Referências orientam hierarquia e consistência, não cópia de componentes. Verificação visual das telas Agora/Aprendizados no Electron e Histórico no navegador.

O resultado exibido é automático por padrão. Feedback explícito pode indicar funcionamento, funcionamento de primeira, com ajustes ou falha. Sem evidência, aparece Sem confirmação. Corrigir resultado abre as opções manuais; essa correção persiste nas sincronizações, mesmo com novo consumo na mesma etapa. Voltar ao automático remove a correção. Os agregados de qualidade continuam separados dos sinais automáticos.

A prévia pode ser iniciada com `electron . --compact --preview`. Usa um banco separado em `task-model-preview` e detecta automaticamente a pasta padrão de sessões do Codex, quando disponível. A coleta pode ser pausada. A janela não tem menus nativos; arraste pelo cabeçalho, use minimizar ou o X para ocultar na bandeja. O menu da bandeja permite sair.

Aprendizados mostra consumo de todo o histórico importado, mesmo sem avaliações. Categorias são heurísticas editáveis. Conclusão de resposta não significa sucesso: sinais automáticos identificam apenas feedback curto e explícito na mensagem seguinte, quando uma única combinação de modelo/esforço participou. Sinais não entram na taxa de sucesso manual. Não há medição de dificuldade ainda.

A exportação cria uma pasta com `SKILL.md`, resumo legível e `references/evidence.json`. No computador original pode consultar o agregado atualizado; em outro computador usa a cópia datada. Não inclui títulos de tarefas nos agregados. Não muda o modelo automaticamente.

A logo foi convertida para ICO e configurada para o próximo executável. Esta revisão não gera instalador; o instalador anterior permanece inalterado.
