# Observatório de Custos Universitários

Aplicação pública para explorar obras concluídas do SIMEC e calcular referências de custos a partir do valor contratado por unidade de medida.

A página inicial oferece estimativas preliminares com quantidade e/ou orçamento, duração histórica observada e preenchimento assistido. O painel usa `public/obras.json`, e não consulta um banco ao vivo. A duração considera apenas datas informadas e coerentes de início e conclusão, sem usar prazos previstos como conclusão; é uma referência histórica, não uma previsão garantida. O relatório PDF inclui os critérios de porte e a duração histórica. A página de exploração avançada está em construção.

Ao informar quantidade e/ou orçamento, a faixa de porte pode ser aplicada separadamente ao custo unitário e ao prazo; ambos os controles vêm marcados. No custo, a faixa seleciona obras pela quantidade informada; no prazo, considera quantidade e/ou valor contratado, simultaneamente quando ambos são preenchidos. O orçamento máximo não restringe o custo unitário: é usado como aproximação do valor da obra para o prazo. A faixa padrão é de 75% a 125% e pode ser ajustada. Na comparação monetária usa-se o índice e mês selecionados, ou valores nominais quando essa opção é escolhida; obras sem valor atualizado válido ficam fora do recorte monetário. A regra é uma heurística exploratória não calibrada, não uma garantia de prazo; sem referências elegíveis a ferramenta não amplia a faixa automaticamente.

Para ajustar os limites, abra **“Ajustar faixa de porte”** ao lado do título dos dados do projeto. Os controles permitem limites de 1% a 400% e podem ser desmarcados individualmente; sem quantidade informada não se aplica filtro de quantidade. Indique **“Minha obra não é definida por área”** para escolher outra unidade da base. Unidades registradas de forma distinta não são mescladas ou convertidas automaticamente.

Para continuidade técnica e metodológica, consulte [CONTINUIDADE.md](CONTINUIDADE.md). A ferramenta é independente e não possui vínculo com o SIMEC ou o MEC; sua estimativa não é o CUB oficial.

## Executar localmente

Requisitos: Node.js, npm e Python 3.

```bash
npm install
npm run dev
```

Abra o endereço informado pelo Vite. Os arquivos `public/obras.json`, `public/incc.json` e `public/igpm.json` precisam estar disponíveis para usar os respectivos dados. Para regenerar a base de obras, execute `npm run prepare:data` com o CSV original na raiz; isso não é necessário se `public/obras.json` já estiver pronto. O projeto não possui área administrativa.

## Publicar no GitHub Pages

1. Revise `public/obras.json`, especialmente os campos de texto livre, antes de enviar o projeto a um repositório público. O arquivo será publicado integralmente.
2. Crie um repositório no GitHub, inicialize o Git localmente se necessário e envie o projeto, incluindo `public/obras.json` e `package-lock.json`, para o branch `main`.
3. No repositório, abra **Settings → Pages → Build and deployment** e selecione **GitHub Actions** como origem.
4. O fluxo `.github/workflows/deploy.yml` será executado a cada envio ao `main`; também pode ser iniciado em **Actions → Publicar no GitHub Pages → Run workflow**.
5. Após a execução, consulte o endereço em **Settings → Pages** ou no resultado da etapa de publicação. Repositórios de projeto usam `https://<usuário>.github.io/<repositório>/`; repositórios `<usuário>.github.io` usam a raiz do domínio.

O build identifica automaticamente o prefixo do repositório no GitHub Actions. O site é estático: o banco SQLite não é utilizado no navegador e não há servidor ou área administrativa. **O CSV original e o banco SQLite já foram incluídos no histórico Git**, por decisão do usuário. A presença de seus caminhos no `.gitignore` não protege arquivos já rastreados nem os remove do histórico; em um repositório público, eles podem ser acessados, mesmo não sendo publicados em `dist`. Revise os dados e o histórico antes de qualquer publicação. Se a branch padrão não for `main`, altere o fluxo de publicação.

## Atualizar a base

Coloque o arquivo `Relatorio SIMEC Geral - Out-2025.csv` na raiz e execute `npm run prepare:data`. O script usa um leitor CSV com separador de tabulação, inclusive para campos com quebras de linha, e gera `public/obras.json`. Revise o JSON e inclua a nova versão no commit para publicação. O GitHub Actions faz checkout do repositório, inclusive de arquivos rastreados, mas não processa o CSV original: publica o conteúdo de `dist`. A referência de outubro de 2025 exibida no site e no relatório corresponde ao arquivo atual e deve ser atualizada no código caso a fonte seja substituída por outro retrato.

Somente registros cuja situação é `Concluída` são publicados. Os registros repetidos não são removidos automaticamente. O arquivo JSON contém uma seleção de campos de obras, sem contatos ou dados de empresas. Antes de publicar uma base nova, é necessário revisá-la, inclusive textos livres e eventuais dados pessoais neles presentes.

## Critérios da estimativa

As referências são obras do recorte selecionado com valor contratado e quantidade positivos e a mesma unidade de medida. O custo unitário é valor contratado dividido pela quantidade. A estimativa multiplica a mediana dos custos unitários pela quantidade informada; a faixa usa os quartis 25% e 75% calculados por interpolação linear. O usuário pode excluir referências.

**Estado atual:** valores nominais ou atualização pelo INCC-Brasil-DI ou IGP-M. IPCA ainda não está integrado. Obras duplicadas permanecem disponíveis e exigem análise antes de serem tratadas como referências independentes.

## Séries de índices FGV IBRE

O arquivo `Indices.csv`, fornecido pelo usuário a partir do [FGV Dados / FGV IBRE](https://extra-ibre.fgv.br/IBRE/sitefgvdados/visualizaconsulta.aspx), contém **INCC-Brasil-DI - Todos os itens (1464783)**, de julho de 1996 a outubro de 2026, e **IGP-M (200045)**, de junho de 1989 a outubro de 2026. O arquivo atual não apresenta lacunas dentro dessas coberturas. As séries anteriores, de origem e variante não confirmadas, não são mescladas à nova fonte.

Para atualizar, exporte as mesmas séries e códigos no endereço acima para `Indices.csv` na raiz. O formato esperado é CSV Windows-1252, separado por ponto e vírgula, data `MM/AAAA`, vírgula decimal e índices (não variações percentuais). Execute `npm run prepare:indices` para validar e gerar `public/incc.json` e `public/igpm.json`. Revise a cobertura, os meses ausentes e as condições de uso dos dados antes de publicar. Os JSONs devem ser incluídos na publicação; o GitHub Actions não os regenera.

Para atualizar **também** as tabelas de índices do banco SQLite local existente, execute `python scripts/prepare_indices.py --sqlite dados/simec_concluidas.sqlite`. Isso substitui somente as linhas das duas séries nas tabelas `series_indices` e `indices_mensais`; não recria nem modifica a tabela `obras`. O site estático continua lendo os JSONs, não o SQLite.

O fator é índice do mês de destino dividido pelo índice do mês de assinatura. A assinatura é apenas aproximação da data-base: obras sem índice, data válida ou com assinatura posterior ao destino ficam fora dos cálculos atualizados. Não há extrapolação para meses sem dados. O PDF identifica a série e preserva o valor original.

## Datas de execução

As datas originais são preservadas em `datas_originais`. O início adotado prioriza início de execução, ordem de serviço e assinatura do contrato. O fim adotado prioriza conclusão informada, término após aditivo e término original; alternativas de término são identificadas como **prazo**, não como conclusão efetiva. Datas de vistoria não são utilizadas. O processo rejeita datas inválidas e posteriores a 31/10/2025 (fim do mês de extração, cujo dia é desconhecido), e alternativas que contrariem a ordem cronológica. Quando início e conclusão originais forem contraditórios, ambos são preservados e sinalizados como inconsistentes. Essa hierarquia não altera a data-base usada pelo INCC.
