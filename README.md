# Calculadora MCMV — com anúncios, limite grátis, pagamento e login

Site em Next.js com a calculadora de parcelas (SAC / Tabela Price) para
financiamento pelo Minha Casa Minha Vida, com:

- Espaços de anúncio nas laterais (prontos para o Google AdSense).
- 3 simulações grátis por visitante, sem precisar de conta.
- Depois disso, uma cobrança única de R$ 1,00 via Mercado Pago (Pix ou cartão).
- Depois do pagamento confirmado, é obrigatório criar conta ou fazer login
  (Supabase Auth) para continuar usando.

Este projeto **não está no ar** — é um código completo para você rodar e
publicar. Nenhuma cobrança ou cadastro é real até você criar suas próprias
contas nos serviços abaixo e preencher as chaves.

## 1. Crie as contas necessárias

### Supabase (login/cadastro + banco de dados)
1. Crie um projeto grátis em https://supabase.com.
2. Em **Settings → API**, copie a `Project URL`, a `anon public key` e a
   `service_role key`.
3. Em **Authentication → Providers**, deixe "Email" habilitado. Em
   **Authentication → Settings**, decida se quer exigir confirmação por
   e-mail antes do primeiro login (recomendado em produção).
4. Em **SQL Editor**, rode o conteúdo de `sql/schema.sql` deste projeto
   para criar as tabelas `anon_usage` e `payments`.

### Mercado Pago (cobrança de R$ 1,00)
1. Crie uma conta em https://www.mercadopago.com.br e depois uma
   aplicação em https://www.mercadopago.com.br/developers/panel.
2. Copie o **Access Token** e a **Public Key** (comece pelas credenciais
   de **teste** para não cobrar de verdade enquanto testa).
3. Em **Webhooks**, cadastre a URL `https://SEU-DOMINIO/api/payment/webhook`
   e copie a **assinatura secreta** gerada.

### Google AdSense (opcional, para os anúncios)
1. Publique o site primeiro num domínio próprio (o AdSense não aprova
   sites sem endereço público).
2. Peça aprovação em https://www.google.com/adsense.
3. Depois de aprovado, pegue o `client id` (formato `ca-pub-XXXXXXXXXXXX`)
   e os IDs dos blocos de anúncio.
4. Até preencher essas variáveis, os espaços laterais mostram só uma
   placa "Espaço para anúncio" — nada é carregado de fora.

## 2. Configure as variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha com os valores que você
pegou acima:

```bash
cp .env.example .env.local
```

## 3. Rode localmente

```bash
npm install
npm run dev
```

Abra http://localhost:3000. Para testar o pagamento localmente, o
Mercado Pago precisa conseguir alcançar seu webhook pela internet — use
algo como `ngrok` ou `cloudflared` para expor `localhost:3000` e ajuste
`NEXT_PUBLIC_SITE_URL` e a URL do webhook cadastrada no Mercado Pago para
apontar para esse endereço temporário enquanto testa.

## 4. Publique de verdade

O jeito mais simples é o [Vercel](https://vercel.com) (grátis para
projetos pequenos):

1. Suba este projeto para um repositório no GitHub.
2. Importe o repositório no Vercel.
3. Em **Settings → Environment Variables**, cole as mesmas variáveis do
   seu `.env.local` (com as credenciais de produção do Mercado Pago
   quando estiver pronto para cobrar de verdade).
4. Depois do primeiro deploy, atualize `NEXT_PUBLIC_SITE_URL` para a URL
   final e a URL do webhook cadastrada no Mercado Pago.
5. Não esqueça de rodar a versão atualizada de `sql/schema.sql` no SQL
   Editor do Supabase — ela agora inclui a tabela `simulations` (histórico
   de simulações salvas) além de `anon_usage` e `payments`. Rodar o script
   de novo não duplica as tabelas já existentes (usa `create table if not
   exists`).

## Como funciona o limite gratuito

Cada visitante sem login recebe um cookie anônimo (`mcmv_anon_id`,
`httpOnly`) na primeira simulação. O servidor conta as simulações desse
cookie na tabela `anon_usage`. Depois de 3, a rota `/api/simulate`
responde com `402 LIMIT_REACHED` e a tela de pagamento aparece.

**Limitação importante:** isso não é à prova de burla — limpar os
cookies do navegador ou abrir uma aba anônima gera um novo visitante e
reseta a contagem. Tornar isso realmente impossível de contornar exigiria
identificar a pessoa de verdade (CPF, telefone verificado por SMS etc.),
o que é desproporcional para uma cobrança de R$ 1. Se isso for um
problema sério para o seu caso de uso, me avise que dá para reforçar
(por exemplo, também limitando por IP, ou exigindo confirmação por
SMS antes da 4ª simulação).

## Como funciona o pagamento

1. `/api/payment/create` cria uma "preference" no Mercado Pago com
   `unit_price: 1.00` e guarda o id do visitante anônimo em
   `external_reference`.
2. O visitante é redirecionado para o Checkout do Mercado Pago (Pix,
   cartão etc.) e paga.
3. O Mercado Pago chama `/api/payment/webhook` — essa é a única fonte de
   verdade sobre o pagamento ter sido aprovado (o redirecionamento de
   volta pro seu site pode ser forjado por qualquer pessoa editando a
   URL, então nunca confie só nele).
4. O webhook marca `anon_usage.paid = true` para aquele visitante.
5. A página, ao voltar do Checkout, chama `/api/payment/status` para
   confirmar que o webhook já processou, e então pede login/cadastro.

## Ferramentas de educação financeira

Além da calculadora principal (SAC x Price a partir do CET), o site tem:

- **Quanto imóvel você consegue financiar** — a partir da renda informada,
  calcula o valor máximo de imóvel mantendo a parcela dentro de 30% da
  renda (o mesmo teto que a Caixa usa no SFH e no MCMV). Roda 100% no
  navegador, não gasta simulação grátis.
- **Renda composta** — soma até 3 rendas (comum quando o financiamento é
  feito em nome de mais de uma pessoa da família).
- **Capital inicial necessário** — soma a entrada ao ITBI estimado (2% a
  3% do imóvel, varia por cidade) e a custos de escritura/registro, e
  desconta o FGTS disponível, se informado.
- **Quanto guardar por mês** — dado uma meta de entrada, um prazo e um
  rendimento mensal estimado, calcula o depósito mensal necessário
  (fórmula de valor futuro de uma série de aportes).
- **Comparação SAC x Tabela Price automática** — a rota `/api/simulate`
  já calcula os dois sistemas numa única chamada, então comparar não custa
  uma segunda simulação grátis.
- **Separação aproximada entre juro puro e encargos do CET** — se a
  pessoa informar também a taxa de juros nominal contratada (separada do
  CET), o site estima quanto do custo total é juro e quanto é
  seguro/tarifa. É uma aproximação (comparação entre a taxa nominal e a
  do CET) — só o banco tem a composição exata.
- **Amortização extra com atalho para o FGTS** — além de mensal/anual/
  único, dá pra simular um aporte "a cada X meses"; o botão de atalho já
  configura 24 meses, que é a regra atual de uso do FGTS para abater
  saldo devedor.
- **Alugar ou financiar** — comparação simplificada (não considera
  valorização do imóvel, reajuste de aluguel, IPTU/condomínio) só para dar
  um ponto de partida.
- **Comprometimento de renda total** — além do teto oficial de 30% da
  Caixa (que olha só a parcela), soma outras dívidas mensais informadas
  para um alerta de orçamento pessoal (deixamos claro na tela que isso não
  é o critério oficial do banco).
- **Faixa do Minha Casa Minha Vida** — identifica a faixa (1 a 4) a partir
  da renda informada.
- **Histórico de simulações** — usuários logados podem salvar simulações
  (tabela `simulations` no Supabase) e apagar depois.
- **PDF da simulação** — gerado no navegador (biblioteca `jspdf`), sem
  precisar de servidor de PDF.
- **Tooltips de glossário** — um "?" ao lado de termos como CET, SAC,
  Price, ITBI, FGTS etc., com a definição em `lib/glossary.js`.

### Sobre os números usados nessas contas (e por que confirmar antes de decidir)

Alguns desses cálculos citam valores oficiais que **mudam com o tempo** —
tratamos isso como estimativa educativa, nunca como fonte definitiva:

- **Faixas de renda do MCMV** (`lib/finance.js`, `MCMV_FAIXAS`): valores
  vigentes conforme reportagens de 2026 (Faixa 1 até R$ 3.200; Faixa 2 até
  R$ 5.000; Faixa 3 até R$ 9.600; Faixa 4 até R$ 13.000). O programa revisa
  esses valores periodicamente — confirme em
  [gov.br/cidades](https://www.gov.br/cidades) ou direto com a Caixa antes
  de usar isso para decidir algo.
- **Regra do FGTS a cada 24 meses**: confirmada em fontes de 2026 (é
  possível abater o saldo devedor a cada 2 anos, ou reduzir até 80% de até
  12 parcelas seguidas, exigindo pelo menos 3 anos de trabalho sob o
  regime do FGTS).
- **ITBI entre 2% e 3%**: é a faixa típica cobrada pelas prefeituras
  brasileiras, mas cada município define seu próprio percentual — o
  correto é sempre confirmar na prefeitura da cidade do imóvel.
- **Teto de 30% de comprometimento de renda**: confirmado em múltiplas
  fontes como o critério usado pela Caixa no SFH e no Minha Casa Minha
  Vida, sem variar por faixa.

## Estrutura do projeto

```
app/
  layout.js              layout raiz + script do AdSense (só se configurado)
  page.js                página principal: monta calculadora + anúncios + modais
  globals.css            estilos
  api/
    simulate/route.js           calcula SAC e Price juntos e aplica o limite grátis
    simulations/route.js        salvar (POST) e listar (GET) simulações do usuário logado
    simulations/[id]/route.js   apagar uma simulação salva (DELETE)
    payment/create/route.js     cria a cobrança de R$ 1 no Mercado Pago
    payment/webhook/route.js    confirma pagamentos aprovados
    payment/status/route.js     consulta se o visitante já pagou
components/
  Calculator.jsx         formulário + todas as ferramentas + resultado + tabela
  AdSlot.jsx              espaço de anúncio (placeholder ou AdSense real)
  PaywallModal.jsx        tela "pague R$1 para continuar"
  AuthModal.jsx           tela de login / criar conta
  InfoTip.jsx             tooltip de glossário ("?")
lib/
  amortization.js         fórmulas de SAC e Tabela Price + amortização extra
  finance.js              quanto posso financiar, meta de poupança, alugar x financiar, faixa MCMV, juro x encargos
  glossary.js             textos dos tooltips
  pdf.js                  geração do PDF da simulação (jsPDF, roda no navegador)
  supabaseClient.js        cliente Supabase do navegador
  supabaseAdmin.js         cliente Supabase de servidor (service role)
  authUser.js              valida o usuário logado a partir do token enviado pelo navegador
  mercadopago.js           cliente do SDK do Mercado Pago
  anonId.js                cookie do visitante anônimo
sql/schema.sql            tabelas do Supabase (anon_usage, payments, simulations)
```

## Próximos passos sugeridos

- Definir o que a pessoa ganha exatamente depois de pagar e logar (hoje é
  "simulações ilimitadas para sempre" — talvez você queira um número de
  créditos, ou uma assinatura recorrente).
- Ligar a confirmação por e-mail do Supabase antes de ir para produção.
- Trocar as credenciais de teste do Mercado Pago pelas de produção só
  quando estiver pronto para cobrar de verdade.
- Revisar periodicamente os valores citados acima (faixas do MCMV, regra
  do FGTS, ITBI) — são números que mudam por decisão do governo ou de
  cada prefeitura, não algo que este código possa manter atualizado
  sozinho.
