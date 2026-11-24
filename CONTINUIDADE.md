# Continuidade técnica e metodológica

Retrato do projeto em **24/11/2026**. Leia também `README.md` e `BANCO_SQLITE.md`; confira código e `git status` antes de trabalhar, pois este documento não substitui o estado atual dos arquivos. Preserve alterações existentes do usuário.

## Objetivo e decisões do produto

- Aplicação pública, estática, em português, para **referências preliminares de custo unitário e duração de obras universitárias**, a partir de obras concluídas na extração SIMEC.
- Projeto independente, **sem vínculo com o SIMEC ou o MEC**. Apresentar a fonte e a data da extração; não chamar o resultado de CUB oficial.
- A página inicial oferece painel básico e preenchimento assistido. `explorador.html` exibe apenas uma mensagem de seção em construção; a interface avançada anterior não está ativa. Não há área administrativa. O recorte inicial amplo não significa que tipologias e tipos diferentes sejam comparáveis.
- A estimativa deve ser rastreável: filtros, unidade, quantidade, referências efetivamente selecionadas, condição monetária e fórmula precisam ser coerentes entre tela, CSV e PDF.
- Nunca misturar custos ou quantidades de unidades diferentes. Sem unidade selecionada, não calcular estatísticas unitárias ou estimativa comparativa.
- Datas de vistoria **não devem ser usadas** como substitutas de início ou conclusão.

## Arquitetura e arquivos

Site estático com React 19, Ant Design 6, Vite, Recharts e jsPDF; não há API de backend. `npm run dev` inicia o Vite em `127.0.0.1:5173` por padrão. Leia a skill `antd`, se disponível, e consulte a API dos componentes antes de modificá-los.

| Caminho | Responsabilidade |
|---|---|
| `index.html`, `src/estimativa.jsx` | Painel básico, assistente, recorte, busca, seleção e detalhes das obras. |
| `explorador.html` | Página estática informando que a exploração avançada está em construção. |
| `src/main.jsx`, `src/style.css` | Código da antiga exploração avançada, preservado para referência, mas sem entrada ativa no site. |
| `src/estimativa.css` | Estilos e responsividade do painel básico. |
| `src/estimativa-calculos.js` | Quartis, duração elegível e seleção por faixa de porte para custo e prazo. |
| `src/porte-controls.jsx` | Controles compartilhados de faixa e aplicação ao custo e/ou prazo. |
| `src/unit-data.js` | Seleção por unidade e elegibilidade. |
| `src/incc.js` | Conversão por INCC-Brasil-DI ou IGP-M e validação da data do contrato. |
| `src/histogram.js` | Faixas e contagens dos dados observados. |
| `src/normal-curve.js` | Curva normal **teórica**, centrada na média, para visualização opcional; não representa necessariamente os dados reais. |
| `src/relatorio-completo.js` | PDF do painel básico, carregado sob demanda com jsPDF/autoTable. |
| `src/report.js` | Gerador da antiga exploração avançada, preservado, mas sem entrada ativa. |
| `scripts/prepare_data.py` | CSV original → `public/obras.json`; só obras concluídas. |
| `scripts/date_hierarchy.py` | Datas derivadas e regras de validade. |
| `scripts/prepare_indices.py` | `Indices.csv` do FGV IBRE → JSONs INCC e IGP-M; opcionalmente atualiza tabelas de índices no SQLite. O antigo `prepare_incc.py` corresponde ao formato anterior e não é o fluxo atual. |
| `scripts/criar_banco_simec.py` | Banco SQLite local de obras concluídas, com campos originais; não alimenta o frontend. |
| `public/obras.json`, `public/incc.json`, `public/igpm.json` | Dados carregados pelo navegador e incluídos no build. |
| `vite.config.js`, `.github/workflows/deploy.yml` | Prefixo do GitHub Pages e publicação estática. |
| `tests/` | Testes Python de processamento e Node de cálculos. |

O frontend usa `import.meta.env.BASE_URL` para buscar os JSONs. Os assets precisam continuar funcionando tanto na raiz quanto sob `/<nome-do-repositório>/`. O workflow faz checkout, `npm ci`, confere `public/obras.json`, executa o build e publica `dist` no Pages; **não regenera** os JSONs nem executa os testes automaticamente.

## Dados e privacidade

- Fonte principal: `Relatorio SIMEC Geral - Out-2025.csv`, UTF-8 com BOM, separador **tabulação**, valores numéricos no formato brasileiro e campos que podem conter quebras de linha. Sempre usar leitor CSV apropriado com `newline=""`.
- A referência é uma extração de **outubro de 2025**, com dia desconhecido; não representa atualização em tempo real. O arquivo analisado tinha 9.574 registros, dos quais 7.289 estavam marcados como concluídos. Os totais podem mudar com outra base.
- `public/obras.json` contém subconjunto de campos, inclusive nomes e descrição livre. Há IDs duplicados; a importação não os remove silenciosamente. O campo `key` é gerado pela posição da obra, não é identificador persistente entre versões.
- O usuário pediu explicitamente que o CSV original e `dados/simec_concluidas.sqlite` fossem adicionados ao Git. **Ambos estão rastreados e no histórico**, embora constem no `.gitignore`. Eles podem incluir dados pessoais e outros dados não destinados ao frontend. O repositório público expõe arquivos rastreados e seu histórico, independentemente de `dist`. Antes de publicar, revisar também textos livres do JSON e confirmar as condições de uso das fontes. Não reescrever histórico, remover ou descartar dados sem autorização do usuário.
- O SQLite contém `obras` com colunas originais como texto e as tabelas `series_indices` e `indices_mensais`. Não confundir esse banco local com uma API ou base utilizada pelo site.
- Os índices identificados no arquivo são do FGV IBRE; verificar direitos e condições de uso antes da publicação.

## Regras dos cálculos

1. Filtros e busca livre do painel básico são aplicados ao arquivo de obras e restringem os cálculos.
2. `updateWork` preserva o original em `originalValue`; no modo nominal, `value` permanece original. Nos modos INCC ou IGP-M, `value = originalValue × índice_destino / índice_origem`, com o mês da assinatura como **aproximação**, não necessariamente a data-base real do orçamento/proposta.
3. Obras sem valor positivo, data válida, índice inicial/final ou com contrato posterior ao mês de destino não recebem valor atualizado. Não misturar seus valores nominais no cálculo atualizado.
4. A unidade deve ser explícita e igual à da obra; apenas quantidade e valor positivos são elegíveis. Usuários podem excluir referências manualmente.
5. O custo unitário é `valor usado / quantidade`. Quando habilitada e informada uma quantidade de projeto, a faixa de porte restringe as referências do custo a quantidades dentro dos limites percentuais inclusivos, sem misturar unidades. O orçamento sozinho não filtra o custo unitário. A estimativa multiplica a mediana pela quantidade; a faixa total usa P25 e P75. Quantis usam interpolação linear.
6. Para duração, `durationDays` exige início de execução e conclusão **informados**, situação coerente e intervalo positivo, em dias corridos. Início aproximado ou prazo contratual não são duração efetiva. Com o filtro de porte ativado, quantidade e/ou orçamento informados restringem as referências; com ambos, os critérios são simultâneos. O valor contratual usado na comparação é o atualizado pela série e mês selecionados, ou nominal no modo nominal. Sem entradas aplicáveis, ou com o controle desativado, não há filtro por porte.
7. Os controles de porte começam em **75%–125%** e podem ser ajustados de 1% a 400%; custo e prazo podem ser ativados separadamente ou ambos desativados. Os percentuais são uma heurística exploratória não calibrada; orçamento máximo é apenas aproximação do porte, não necessariamente o custo final. Não ampliar automaticamente uma amostra vazia.
8. No painel básico a seleção de custo e prazo parte das obras selecionadas no recorte, com elegibilidades independentes. Mostrar tamanho da amostra, falta de dados e resultados de custo/prazo separadamente.
9. O PDF do painel básico registra percentuais, aplicações, dados disponíveis, referências e duração. Revalidar tela e PDF após mudanças. A antiga exportação CSV e os gráficos da exploração avançada não estão disponíveis na interface atual.

## Séries FGV IBRE

`Indices.csv` contém INCC-Brasil-DI - Todos os itens (1464783), de **1996-07 a 2026-10**, e IGP-M (200045), de **1989-06 a 2026-10**, sem lacunas internas no retrato atual. A fonte informada é [FGV Dados / FGV IBRE](https://extra-ibre.fgv.br/IBRE/sitefgvdados/visualizaconsulta.aspx). O cálculo usa a razão dos números-índice. Não extrapolar nem combinar com a antiga série de origem e variante não confirmadas; IPCA não está integrado. Detalhes de atualização e condições de publicação estão no README.

## Datas da obra

`datas_originais` preserva os campos usados; `datas_execucao` registra data adotada, fonte, tipo e situação:

- Início: início de execução → ordem de serviço → assinatura do contrato.
- Fim: conclusão informada → término após aditivo (duas colunas possíveis, na ordem do script) → término original. Alternativas de término são **prazos**, não conclusão efetiva.
- Rejeitar data inválida, anterior a 1900 ou posterior a 31/10/2025, limite provisório por ser o fim do mês da extração. Validar a ordem cronológica das alternativas.
- Duas datas originais conflitantes são preservadas e marcadas `inconsistente`; não esconder o conflito substituindo-as.
- A hierarquia de datas de execução **não altera** a data usada para INCC ou IGP-M.

## Executar e validar

```bash
npm ci
npm run prepare:data      # só quando for necessário regenerar a base a partir do CSV
npm run prepare:indices   # só para regenerar os índices a partir de Indices.csv
npm run dev
npm run build
node --test tests/*.test.js
python -m unittest discover -s tests -v
```

Os testes Python pressupõem o CSV original e os JSONs gerados; alguns fixam contagens e cobertura específicas do retrato atual. Se a base mudar, revisar expectativas deliberadamente. Testar também no navegador: controles de porte e suas quatro combinações, quantidade e orçamento isolados ou conjuntos, nenhuma referência, unidades diferentes, filtros e exclusões, INCC/IGP-M/nominal, busca, PDF e mensagem da página avançada, inclusive em telas pequenas. Build e testes unitários não substituem essa verificação.

Em Windows, o Vite ignora arquivos CSV, planilhas Excel e SQLite no monitoramento para evitar erro `EBUSY` quando estiverem abertos em outro programa. Alterar a fonte exige executar novamente o script de preparação.

## Pendências e riscos para continuidade

- Confirmar condições de uso das séries FGV IBRE e manter suas coberturas atualizadas.
- Investigar duplicidades de ID, valores extremos, escopos diferentes e qualidade da data/área antes de sofisticar o método. Não excluir automaticamente sem critério e rastreabilidade.
- Melhorar validação visual e automatizada da interface e do PDF; verificar especialmente amostras grandes, performance e diferenças entre dados exibidos/exportados.
- O build emite aviso de bundle JavaScript grande. Avaliar divisão de código sem comprometer a simplicidade da publicação estática.
- Os painéis ainda concentram responsabilidades em `src/estimativa.jsx` e `src/main.jsx`; refatorar gradualmente com testes, respeitando o comportamento atual.
- As datas de fonte, extração e corte estão fixadas em diversos arquivos. Versionar esses metadados seria útil antes de adotar outra extração.
- Consulte `git status` antes de operar; alterações locais não são necessariamente publicadas.
