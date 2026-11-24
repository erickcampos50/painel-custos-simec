# Continuidade técnica e metodológica

> **Atualização:** as informações abaixo sobre o antigo INCC provisório, cobertura até 2025-08 e indisponibilidade do IGP-M foram substituídas pelas séries do FGV IBRE em `Indices.csv`. Consulte a seção “Séries de índices FGV IBRE” do README para os códigos, coberturas e comandos atuais. A página inicial agora é `src/estimativa.jsx`; `src/main.jsx` é o explorador avançado.

Retrato do projeto em **24/11/2026**. Leia também `README.md` e `BANCO_SQLITE.md`; confira código e `git status` antes de trabalhar, pois este documento não substitui o estado atual dos arquivos. Preserve alterações existentes do usuário.

## Objetivo e decisões do produto

- Aplicação pública, de página única, em português, para **estimativas interativas preliminares de custo unitário de obras universitárias** a partir de obras concluídas da extração SIMEC.
- Projeto independente, **sem vínculo com o SIMEC ou o MEC**. Apresentar a fonte e a data da extração; não chamar o resultado de CUB oficial.
- Interface limpa, elementos grandes, filtros recolhíveis, sem excesso de avisos. Não há área administrativa. Todas as tipologias e tipos de obra devem poder ser explorados desde o início; isso não significa misturá-los automaticamente como se fossem comparáveis.
- A estimativa deve ser rastreável: filtros, unidade, quantidade, referências efetivamente selecionadas, condição monetária e fórmula precisam ser coerentes entre tela, CSV e PDF.
- Nunca misturar custos ou quantidades de unidades diferentes. Sem unidade selecionada, não calcular estatísticas unitárias ou estimativa comparativa.
- Datas de vistoria **não devem ser usadas** como substitutas de início ou conclusão.

## Arquitetura e arquivos

Site estático com React 19, Ant Design 6, Vite, Recharts e jsPDF; não há API de backend. `npm run dev` inicia o Vite em `127.0.0.1:5173` por padrão. Leia a skill `antd`, se disponível, e consulte a API dos componentes antes de modificá-los.

| Caminho | Responsabilidade |
|---|---|
| `src/main.jsx` | Página, filtros, seleção das referências, estatísticas, gráficos e exportação CSV. A lógica e os componentes ainda estão concentrados em um arquivo. |
| `src/style.css` | Estilos e responsividade. |
| `src/unit-data.js` | Seleção por unidade e elegibilidade. |
| `src/incc.js` | Conversão pela série INCC e validação da data do contrato. |
| `src/histogram.js` | Faixas e contagens dos dados observados. |
| `src/normal-curve.js` | Curva normal **teórica**, centrada na média, para visualização opcional; não representa necessariamente os dados reais. |
| `src/report.js` | PDF no navegador, carregado sob demanda com jsPDF/autoTable. |
| `scripts/prepare_data.py` | CSV original → `public/obras.json`; só obras concluídas. |
| `scripts/date_hierarchy.py` | Datas derivadas e regras de validade. |
| `scripts/prepare_incc.py` | CSV manual de INCC → `public/incc.json`, com auditoria. |
| `scripts/criar_banco_simec.py` | Banco SQLite local de obras concluídas, com campos originais; não alimenta o frontend. |
| `public/obras.json`, `public/incc.json` | Dados carregados pelo navegador e incluídos no build. |
| `vite.config.js`, `.github/workflows/deploy.yml` | Prefixo do GitHub Pages e publicação estática. |
| `tests/` | Testes Python de processamento e Node de cálculos. |

O frontend usa `import.meta.env.BASE_URL` para buscar os JSONs. Os assets precisam continuar funcionando tanto na raiz quanto sob `/<nome-do-repositório>/`. O workflow faz checkout, `npm ci`, confere `public/obras.json`, executa o build e publica `dist` no Pages; **não regenera** os JSONs nem executa os testes automaticamente.

## Dados e privacidade

- Fonte principal: `Relatorio SIMEC Geral - Out-2025.csv`, UTF-8 com BOM, separador **tabulação**, valores numéricos no formato brasileiro e campos que podem conter quebras de linha. Sempre usar leitor CSV apropriado com `newline=""`.
- A referência é uma extração de **outubro de 2025**, com dia desconhecido; não representa atualização em tempo real. O arquivo analisado tinha 9.574 registros, dos quais 7.289 estavam marcados como concluídos. Os totais podem mudar com outra base.
- `public/obras.json` contém subconjunto de campos, inclusive nomes e descrição livre. Há IDs duplicados; a importação não os remove silenciosamente. O campo `key` é gerado pela posição da obra, não é identificador persistente entre versões.
- O usuário pediu explicitamente que o CSV original e `dados/simec_concluidas.sqlite` fossem adicionados ao Git. **Ambos estão rastreados e no histórico**, embora constem no `.gitignore`. Eles podem incluir dados pessoais e outros dados não destinados ao frontend. O repositório público expõe arquivos rastreados e seu histórico, independentemente de `dist`. Antes de publicar, revisar também textos livres do JSON e confirmar as condições de uso das fontes. Não reescrever histórico, remover ou descartar dados sem autorização do usuário.
- O SQLite contém todas as colunas originais como texto. Não confundir esse banco de arquivo local com uma API ou base já integrada ao site.
- A origem editorial e a variante da série de INCC precisam de confirmação; verificar direitos e condições de uso antes da publicação.

## Regras dos cálculos

1. Filtros são aplicados ao arquivo de obras; o filtro monetário usa o **valor contratado original**, mesmo no modo atualizado. Datas do filtro de ano usam a assinatura do contrato.
2. `updateWork` preserva o original em `originalValue`; no modo nominal, `value` permanece original. No modo INCC, `value = originalValue × índice_destino / índice_origem`, com o mês da assinatura do contrato como **aproximação**, não necessariamente a data-base real do orçamento/proposta.
3. Obras sem valor positivo, data válida, índice inicial/final ou com contrato posterior ao mês de destino não recebem valor atualizado. Não misturar seus valores nominais no cálculo atualizado.
4. A unidade deve ser explícita e igual à da obra; apenas quantidade e valor positivos são elegíveis. Usuários podem excluir referências manualmente.
5. O custo unitário de cada referência é `valor usado / quantidade`. A estimativa é `mediana dos custos unitários selecionados × quantidade do projeto`. A faixa total usa P25 e P75 multiplicados pela quantidade; quantis são calculados por interpolação linear. São referências estatísticas, não orçamento detalhado.
6. O gráfico principal usa as **referências selecionadas**, enquanto o perfil complementar usa o recorte filtrado. Nas barras, limitar pelo percentil altera apenas a visualização. Na curva teórica, as porcentagens são faixas centrais da normal teórica, não percentis empíricos; pode haver valores negativos no desenho. Não confundir média da curva com mediana usada na estimativa.
7. O PDF e o CSV devem identificar valores originais e atualizados, fonte, filtros, mês e referências. Revalidar o relatório após qualquer mudança na lógica.

## INCC provisório

`INCC.csv` foi montado manualmente pelo usuário. O processamento atual gera 368 meses de **1995-01 a 2025-08**, sem lacunas. Não extrapolar automaticamente para meses posteriores. O arquivo registra discrepâncias entre o índice e a variação mensal informada em **2006-01, 2015-06, 2016-01 e 2018-01**. O cálculo usa a razão dos números-índice, não o produto das variações mensais. Não corrigir valores por suposição nem apresentar a série como validada. IGP-M e IPCA estão visíveis como indisponíveis.

## Datas da obra

`datas_originais` preserva os campos usados; `datas_execucao` registra data adotada, fonte, tipo e situação:

- Início: início de execução → ordem de serviço → assinatura do contrato.
- Fim: conclusão informada → término após aditivo (duas colunas possíveis, na ordem do script) → término original. Alternativas de término são **prazos**, não conclusão efetiva.
- Rejeitar data inválida, anterior a 1900 ou posterior a 31/10/2025, limite provisório por ser o fim do mês da extração. Validar a ordem cronológica das alternativas.
- Duas datas originais conflitantes são preservadas e marcadas `inconsistente`; não esconder o conflito substituindo-as.
- A hierarquia de datas de execução **não altera** a data usada pelo INCC.

## Executar e validar

```bash
npm ci
npm run prepare:data      # só quando for necessário regenerar a base a partir do CSV
npm run prepare:incc      # só quando for necessário regenerar a série manual
npm run dev
npm run build
node --test tests/*.test.js
python -m unittest discover -s tests -v
```

Os testes Python da base pressupõem o CSV original e os JSONs gerados; alguns fixam contagens e cobertura específicas do retrato atual. Se a base mudar, revisar expectativas deliberadamente, não apenas atualizar números para fazer o teste passar. Testar também interações no navegador: filtros múltiplos, seleção e exclusão de referências, troca de unidade, modo INCC, limites dos gráficos, exportações, PDF e telas pequenas. Build e testes unitários não substituem essa verificação.

Em Windows, o Vite ignora arquivos CSV e SQLite no monitoramento para evitar erro `EBUSY` quando estiverem abertos em outro programa. Alterar a fonte exige executar novamente o script de preparação.

## Pendências e riscos para continuidade

- Confirmar fonte, variante, divergências, licença e datas da série INCC; eventualmente obter atualização confiável e versionada.
- Investigar duplicidades de ID, valores extremos, escopos diferentes e qualidade da data/área antes de sofisticar o método. Não excluir automaticamente sem critério e rastreabilidade.
- Melhorar validação visual e automatizada da interface e do PDF; verificar especialmente amostras grandes, performance e diferenças entre dados exibidos/exportados.
- O build emite aviso de bundle JavaScript grande. Avaliar divisão de código sem comprometer a simplicidade da publicação estática.
- O frontend ainda concentra responsabilidades em `src/main.jsx`; refatorar gradualmente com testes, respeitando o comportamento atual.
- As datas de fonte, extração e corte estão fixadas em diversos arquivos. Versionar esses metadados seria útil antes de adotar outra extração.
- Em 24/11/2026 havia alterações locais não commitadas no frontend e nos testes de gráficos. Consulte `git status` antes de operar; não suponha que estejam publicadas.
