# Observatório de Custos Universitários

Aplicação pública para explorar obras concluídas do SIMEC e calcular referências de custos a partir do valor contratado por unidade de medida.

## Executar localmente

Requisitos: Node.js, npm e Python 3.

```bash
npm install
npm run prepare:data
npm run dev
```

Abra o endereço informado pelo Vite. O arquivo reduzido `public/obras.json` deve estar presente; se ele já estiver disponível, não é necessário ter o CSV para executar o site. O projeto não possui área administrativa.

## Publicar no GitHub Pages

1. Revise `public/obras.json`, especialmente os campos de texto livre, antes de enviar o projeto a um repositório público. O arquivo será publicado integralmente.
2. Crie um repositório no GitHub, inicialize o Git localmente se necessário e envie o projeto, incluindo `public/obras.json` e `package-lock.json`, para o branch `main`.
3. No repositório, abra **Settings → Pages → Build and deployment** e selecione **GitHub Actions** como origem.
4. O fluxo `.github/workflows/deploy.yml` será executado a cada envio ao `main`; também pode ser iniciado em **Actions → Publicar no GitHub Pages → Run workflow**.
5. Após a execução, consulte o endereço em **Settings → Pages** ou no resultado da etapa de publicação. Repositórios de projeto usam `https://<usuário>.github.io/<repositório>/`; repositórios `<usuário>.github.io` usam a raiz do domínio.

O build identifica automaticamente o prefixo do repositório no GitHub Actions. O site é estático: o banco SQLite não é utilizado no navegador e não há servidor ou área administrativa. O CSV original e o banco SQLite estão no `.gitignore`; confirme sempre os arquivos incluídos antes de um commit. Se a branch padrão não for `main`, altere o fluxo de publicação.

## Atualizar a base

Coloque o arquivo `Relatorio SIMEC Geral - Out-2025.csv` na raiz e execute `npm run prepare:data`. O script usa um leitor CSV com separador de tabulação, inclusive para campos com quebras de linha, e gera `public/obras.json`. Revise o JSON e inclua a nova versão no commit para publicação. O GitHub Actions não recebe nem processa o CSV original. A referência de outubro de 2025 exibida no site e no relatório corresponde ao arquivo atual e deve ser atualizada no código caso a fonte seja substituída por outro retrato.

Somente registros cuja situação é `Concluída` são publicados. Os registros repetidos não são removidos automaticamente. O arquivo JSON contém uma seleção de campos de obras, sem contatos ou dados de empresas. Antes de publicar uma base nova, é necessário revisá-la, inclusive textos livres e eventuais dados pessoais neles presentes.

## Critérios da estimativa

As referências são obras do recorte selecionado com valor contratado e quantidade positivos e a mesma unidade de medida. O custo unitário é valor contratado dividido pela quantidade. A estimativa multiplica a mediana dos custos unitários pela quantidade informada; a faixa usa os quartis 25% e 75% calculados por interpolação linear. O usuário pode excluir referências.

**Estado atual:** valores nominais ou atualização opcional pelo INCC provisório. IGP-M e IPCA ainda não estão integrados. Obras duplicadas permanecem disponíveis e exigem análise antes de serem tratadas como referências independentes.

## Série INCC provisória

O arquivo manual `INCC.csv` pode ser processado com `npm run prepare:incc`, gerando `public/incc.json`. A série cobre janeiro de 1995 a agosto de 2025. O processamento mantém o índice e a variação mensal informada, e identifica meses ausentes, duplicidades e discrepâncias entre variação e razão de índices consecutivos.

A fonte original, a variante da série e a precisão dos dados ainda precisam ser confirmadas. Há quatro divergências registradas no JSON; não foram corrigidas automaticamente. O site permite optar por essa série provisória, dividindo o índice do mês de destino pelo índice do mês de assinatura. Essa assinatura é apenas uma aproximação da data-base; obras sem índice, data válida ou com assinatura posterior ao destino ficam fora dos cálculos atualizados. O filtro de valor usa o valor original; CSV e PDF identificam o modo e preservam o valor original.

## Datas de execução

As datas originais são preservadas em `datas_originais`. O início adotado prioriza início de execução, ordem de serviço e assinatura do contrato. O fim adotado prioriza conclusão informada, término após aditivo e término original; alternativas de término são identificadas como **prazo**, não como conclusão efetiva. Datas de vistoria não são utilizadas. O processo rejeita datas inválidas e posteriores a 31/10/2025 (fim do mês de extração, cujo dia é desconhecido), e alternativas que contrariem a ordem cronológica. Quando início e conclusão originais forem contraditórios, ambos são preservados e sinalizados como inconsistentes. Essa hierarquia não altera a data-base usada pelo INCC.
