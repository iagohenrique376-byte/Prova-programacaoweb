# NEXO Escolar — Gestão Acadêmica

Aplicação demonstrativa para gestão escolar, boletim trimestral, diário de classe e acompanhamento de frequência.

## Funcionalidades desta versão

- Três perfis: administrador, professor e aluno.
- Boletim dividido em três trimestres por disciplina.
- Primeira nota composta por quatro avaliações (A1–A4), com pesos configuráveis pelo professor e soma obrigatória igual a 10.
- Segunda nota independente e média trimestral ponderada, limitada a 10,0 e apresentada com uma casa decimal.
- Cadastro administrativo de aluno com série (1º, 2º ou 3º ano) e turma (Desenvolvimento A ou B).
- Professor lança e corrige notas apenas das disciplinas vinculadas ao seu perfil.
- Diário de classe com data, conteúdo ministrado, turma e frequência.
- Área administrativa para conferir registros de aula, frequência e feedback privado dos professores.
- Feedback de professor visível somente no perfil administrativo.
- Impressão/geração de PDF do boletim pelo aluno e pelo administrador; a versão administrativa inclui campos de assinatura da coordenação pedagógica e da assistência de gestão.
- Área da equipe com espaço reservado para vídeo institucional.
- Foto de perfil individual com persistência local e alternância entre tema claro e escuro.
- Conteúdo da aplicação salvo em localStorage como payload criptografado com AES-GCM.

## Executar

```bash
npm install
npm run dev
```

Acesse http://localhost:3000.

## Credenciais demonstrativas

- Administrador: `admin@escola.com` / `admin123`
- Professora de Matemática: `matematica@escola.com` / `prof123`
- Professor de Português: `portugues@escola.com` / `prof123`
- Aluna: matrícula `2026001` / `aluno123`

## Regras de cálculo

A nota 1 é a soma ponderada das quatro avaliações, com cada peso representando uma fração de 10. Exemplo de pesos válidos: 1, 2, 3 e 4. A média trimestral é calculada pela média ponderada entre a nota 1 e a nota 2, usando os pesos específicos da disciplina. O resultado é limitado a 10 e exibido com uma casa decimal.

## Migração

Na primeira abertura, a aplicação tenta migrar os dados da versão anterior (`nexo-escolar-v2` ou `escola-online-v1`) para o novo formato. As notas antigas são preservadas no primeiro trimestre, replicando a antiga primeira nota nos quatro componentes A1–A4 para manter o valor equivalente. Depois da migração, o novo conjunto de dados é salvo no formato criptografado.

## Limitações de segurança importantes

A criptografia AES-GCM protege o conteúdo armazenado contra leitura casual direta do `localStorage`, mas a chave de derivação está embutida no código cliente. Portanto, isso **não equivale a proteção criptográfica forte contra alguém que controle o navegador**, nem substitui autenticação no servidor. As senhas também estão dentro do payload criptografado, mas ainda não usam hash individual de senha. O sistema permanece um protótipo local: para uso com dados reais, implemente backend, banco de dados, hash Argon2id/bcrypt, sessões seguras e autorização no servidor para cada operação. Não publique credenciais demonstrativas.

O vídeo da equipe é um espaço reservado. O link informado na área Equipe é mantido localmente no navegador. A impressão usa a janela de impressão do navegador; escolha “Salvar como PDF”.


## Correções de compatibilidade React/Next.js

- A data do registro de aula inicia vazia e deve ser selecionada no formulário, evitando `new Date()` durante a inicialização do estado no cliente.
- As datas de registros são formatadas a partir da string ISO, sem criar objetos `Date` durante a renderização.
- A foto de perfil é derivada diretamente dos dados do usuário ativo; foi removido o efeito que chamava `setState` sincronamente e causava renderizações em cascata.
- Há apenas uma declaração de `activeStudent` no componente.
