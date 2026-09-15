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

## Estrutura do projeto

```
app/
  layout.js              layout raiz + script do AdSense (só se configurado)
  page.js                página principal: monta calculadora + anúncios + modais
  globals.css            estilos
  api/
    simulate/route.js         calcula parcelas e aplica o limite grátis
    payment/create/route.js   cria a cobrança de R$ 1 no Mercado Pago
    payment/webhook/route.js  confirma pagamentos aprovados
    payment/status/route.js   consulta se o visitante já pagou
components/
  Calculator.jsx         formulário + resultado + tabela de amortização
  AdSlot.jsx              espaço de anúncio (placeholder ou AdSense real)
  PaywallModal.jsx        tela "pague R$1 para continuar"
  AuthModal.jsx           tela de login / criar conta
lib/
  amortization.js         fórmulas de SAC e Tabela Price (mesma lógica da versão artifact)
  supabaseClient.js        cliente Supabase do navegador
  supabaseAdmin.js         cliente Supabase de servidor (service role)
  mercadopago.js           cliente do SDK do Mercado Pago
  anonId.js                cookie do visitante anônimo
sql/schema.sql            tabelas do Supabase
```

## Próximos passos sugeridos

- Definir o que a pessoa ganha exatamente depois de pagar e logar (hoje é
  "simulações ilimitadas para sempre" — talvez você queira um número de
  créditos, ou uma assinatura recorrente).
- Ligar a confirmação por e-mail do Supabase antes de ir para produção.
- Trocar as credenciais de teste do Mercado Pago pelas de produção só
  quando estiver pronto para cobrar de verdade.
