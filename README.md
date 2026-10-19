# EDEN — Ficha do Jogador (web + Android)

Ficha automática do RPG EDEN: contas, salas, Mestre vendo as fichas dos jogadores, fotos, arquivo de pontos de atributo com o limite por nível.
Funciona no PC e no celular (é um site responsivo e instalável no Android — PWA).

## 1. Testar agora (sem configurar nada)
Abra `index.html` por um servidor local (`python3 -m http.server`, depois http://localhost:8000).
Sem configuração roda em **modo demonstração**: contas e fichas ficam só naquele navegador.

## 2. Colocar online de graça (contas + salas + Mestre)
Você precisa de duas peças gratuitas:

**A) Banco de dados e login — Supabase (supabase.com, plano Free)**
1. Crie um projeto. Em *SQL Editor*, cole todo o `supabase/schema.sql` e clique **Run**.
2. *Authentication → Providers → Email*: para testar rápido, desligue "Confirm email".
3. *Project Settings → API*: copie **Project URL** e a chave **anon public**.
4. Cole os dois em `js/config.js`.
(Obs.: no plano Free o projeto pausa após ~1 semana sem uso; é só reativar no painel.)

**B) Hospedagem do site — escolha uma (todas grátis, só arrastar a pasta/enviar o repositório)**
- **Cloudflare Pages** (recomendado): pages.cloudflare.com → *Create → Pages → Upload assets* → arraste esta pasta.
- **Netlify**: app.netlify.com/drop → arraste esta pasta.
- **GitHub Pages**: suba os arquivos num repositório → *Settings → Pages → Deploy from branch*.
- (Alternativas: Vercel, Firebase Hosting.)

Depois, em *Supabase → Authentication → URL Configuration*, ponha o endereço do seu site em **Site URL**.

## 3. Android
Abra o endereço do site no Chrome do celular → menu ⋮ → **Instalar app / Adicionar à tela inicial**. Vira um ícone, abre em tela cheia e abre rápido mesmo com sinal ruim.
(Se quiser um .apk para loja, o site pode ser empacotado depois em pwabuilder.com.)

## Como usar
- **Jogador**: crie conta → *Nova ficha*. A ficha salva sozinha. Em *Salas* entre com o código do Mestre e coloque a ficha na sala.
- **Mestre**: *Salas → Criar sala* → passe o código. Na sala você vê todas as fichas (PV, atributos, condições, arquivo), abre/edita qualquer uma e usa **Conceder** para dar ponto de atributo (arquivado) e FP.
- **Atributos × Arquivo**: o botão "Pontos arquivados" esconde os atributos e mostra os espaços do nível (1→2, 2→3, 3→4, 4→5, 5+→6). Além da tela, o limite é imposto no servidor (trigger no SQL), então ninguém passa dele.

## Preenchendo as Cascas/Raças
Edite **`js/data/cascas.js`**: PV base, PA/PM, modificadores, raças, culturas, heranças, características raciais e evoluções. A ficha lê tudo de lá (PV, listas e características aparecem sozinhos). Já completos: **Anjo** (com Virtudes) e **Condenado** (Corpos de Porcelana, Costurado e Sombra como sub-raças). **Demônio** (Limbo + Círculos 2 a 9 (incluindo o 5º, Ira, com Draco Form e Ponto de Ira); evolução por 4 PA, forma de 12 h e trava no Círculo escolhido; as 10 linhagens de cabras de Malebolge).
