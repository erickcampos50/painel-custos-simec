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

**Estado atual:** os valores são nominais, sem atualização monetária. As séries INCC, IGP-M e IPCA ainda precisam ser integradas e verificadas com suas fontes e condições de uso; não há índices fictícios ou correção automática. As obras duplicadas permanecem disponíveis e exigem análise antes de serem tratadas como referências independentes.
