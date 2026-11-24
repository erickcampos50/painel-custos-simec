# Banco local SIMEC

Execute com Python 3.9 ou superior, sem dependências externas:

```sh
python scripts/criar_banco_simec.py
```

O arquivo gerado é `dados/simec_concluidas.sqlite`. Para outras localizações,
use `--csv caminho.csv --saida caminho.sqlite`. A execução substitui o banco de
saída existente após uma importação bem-sucedida; mantenha uma cópia se necessário.
O CSV deve estar em UTF-8 (com ou sem BOM), com campos separados por tabulação.
**A recriação substitui o banco inteiro**, inclusive as tabelas de índices que
tenham sido acrescentadas posteriormente. Depois de recriá-lo, execute novamente
o comando de atualização de índices abaixo, se essas tabelas forem necessárias.

A tabela `obras` contém todas as colunas originais como texto, sem conversões ou
remoção de duplicatas. O filtro é `Situação da Obra` igual a `Concluída`, após
remover espaços apenas para comparação; o valor armazenado não é alterado.
Cada linha importada possui um `rowid` SQLite independente, inclusive duplicatas.
Para consultar, por exemplo:

```sql
SELECT COUNT(*) FROM obras;
SELECT "ID", "Nome da Obra" FROM obras LIMIT 10;
```

O banco preserva todos os campos do CSV, inclusive possíveis dados pessoais ou
sensíveis. Não o copie para `public` nem o exponha no frontend. **Atenção:** o
arquivo já foi incluído no histórico Git por decisão do usuário. O `.gitignore`
não impede acesso ao histórico nem deixa de rastrear um arquivo já incluído;
avalie a exposição antes de tornar o repositório público.
O script não altera o CSV nem o fluxo existente de preparação de dados públicos.

## Índices econômicos

`python scripts/prepare_indices.py --sqlite dados/simec_concluidas.sqlite` atualiza
as tabelas `series_indices` e `indices_mensais` a partir de `Indices.csv`, sem
recriar a tabela `obras`. Também gera os JSONs usados pelo site. Fonte para futuras
atualizações: https://extra-ibre.fgv.br/IBRE/sitefgvdados/visualizaconsulta.aspx.
Consulte o README para os códigos das séries, formato e limites da atualização.
