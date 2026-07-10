-- ============================================================================
-- GASTRONOMICOSYSTEM — SCHEMA POSTGRESQL / SUPABASE (SaaS MULTI-TENANT)
-- ----------------------------------------------------------------------------
-- Hierarquia:  Restaurante (marca/conta) 1:N Unidade (filial) 1:N Operação
-- Integração:  Supabase Auth (Gastronomico_usuarios.id = auth.users.id)
-- Convenções:  prefixo "Gastronomico_"; colunas snake_case em pt-BR;
--              id uuid PK (gen_random_uuid); created_at/updated_at timestamptz;
--              numeric(10,2) para valores monetários; timestamptz para datas.
-- Observação:  o prefixo usa "G" maiúsculo, portanto os nomes de tabela são
--              sempre citados entre aspas duplas ("Gastronomico_...").
-- ============================================================================

-- gen_random_uuid() é fornecido pela extensão pgcrypto (nativa no Supabase).
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- Função + trigger genérico para manter a coluna updated_at sempre atualizada.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.gastronomico_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 1. RESTAURANTES  (tenant principal do SaaS — a marca/conta)
-- ============================================================================
CREATE TABLE public."Gastronomico_restaurantes" (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                  varchar(255) NOT NULL,
  slug                  varchar(255) NOT NULL UNIQUE,
  logo_url              text,
  cor_tema              varchar(50)  NOT NULL DEFAULT 'red',
  taxa_servico_padrao   numeric(5,2) NOT NULL DEFAULT 10.00 CHECK (taxa_servico_padrao >= 0),
  plano                 varchar(50)  NOT NULL DEFAULT 'free',   -- pronto para planos SaaS (free/pro/enterprise)
  ativo                 boolean      NOT NULL DEFAULT true,
  created_at            timestamptz  NOT NULL DEFAULT now(),
  updated_at            timestamptz  NOT NULL DEFAULT now()
);
COMMENT ON TABLE public."Gastronomico_restaurantes" IS
  'Conta/marca (tenant do SaaS). Agrupa uma ou mais unidades/filiais e centraliza plano e configurações da marca.';

CREATE TRIGGER trg_restaurantes_updated_at
  BEFORE UPDATE ON public."Gastronomico_restaurantes"
  FOR EACH ROW EXECUTE FUNCTION public.gastronomico_set_updated_at();


-- ============================================================================
-- 2. UNIDADES  (filiais de uma marca — 1 ou várias)
-- ============================================================================
CREATE TABLE public."Gastronomico_unidades" (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- CASCADE: a filial não existe sem a marca; excluir a conta remove suas unidades.
  restaurante_id uuid NOT NULL REFERENCES public."Gastronomico_restaurantes"(id) ON DELETE CASCADE,
  nome           varchar(255) NOT NULL,
  slug           varchar(255) NOT NULL,
  endereco       text,
  telefone       varchar(50),
  ativa          boolean      NOT NULL DEFAULT true,
  created_at     timestamptz  NOT NULL DEFAULT now(),
  updated_at     timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT uq_unidade_slug UNIQUE (restaurante_id, slug)
);
COMMENT ON TABLE public."Gastronomico_unidades" IS
  'Unidade/filial física de uma marca. Toda operação (mesas, cardápio, caixa, pedidos) é escopada por unidade.';

CREATE INDEX idx_unidades_restaurante ON public."Gastronomico_unidades"(restaurante_id);

CREATE TRIGGER trg_unidades_updated_at
  BEFORE UPDATE ON public."Gastronomico_unidades"
  FOR EACH ROW EXECUTE FUNCTION public.gastronomico_set_updated_at();


-- ============================================================================
-- 3. USUARIOS  (perfil de colaborador vinculado ao Supabase Auth)
-- ============================================================================
CREATE TABLE public."Gastronomico_usuarios" (
  -- 1:1 com auth.users. CASCADE: remover a credencial de login remove o perfil.
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- CASCADE: o colaborador pertence à conta; excluir a marca remove sua equipe.
  restaurante_id  uuid NOT NULL REFERENCES public."Gastronomico_restaurantes"(id) ON DELETE CASCADE,
  -- SET NULL: se a unidade de lotação é removida, o colaborador é preservado (realocável).
  unidade_id      uuid REFERENCES public."Gastronomico_unidades"(id) ON DELETE SET NULL,
  nome            varchar(255) NOT NULL,
  cargo           varchar(100) NOT NULL DEFAULT 'Colaborador',  -- rótulo livre: Gerente, Operadora, Supervisor...
  cpf             varchar(14),
  data_nascimento date,
  telefone        varchar(50),
  cor_avatar      varchar(50),
  ativo           boolean      NOT NULL DEFAULT true,
  created_at      timestamptz  NOT NULL DEFAULT now(),
  updated_at      timestamptz  NOT NULL DEFAULT now()
);
COMMENT ON TABLE public."Gastronomico_usuarios" IS
  'Perfil do colaborador. A autenticação e a senha são geridas pelo Supabase Auth (auth.users); e-mail vem de lá.';

CREATE INDEX idx_usuarios_restaurante ON public."Gastronomico_usuarios"(restaurante_id);
CREATE INDEX idx_usuarios_unidade     ON public."Gastronomico_usuarios"(unidade_id);

CREATE TRIGGER trg_usuarios_updated_at
  BEFORE UPDATE ON public."Gastronomico_usuarios"
  FOR EACH ROW EXECUTE FUNCTION public.gastronomico_set_updated_at();


-- ============================================================================
-- 4. MODULOS  (catálogo GLOBAL de módulos permissionáveis do sistema)
-- ============================================================================
CREATE TABLE public."Gastronomico_modulos" (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave      varchar(50)  NOT NULL UNIQUE,   -- dashboard, cardapio, estoque, mesas...
  nome       varchar(100) NOT NULL,
  descricao  text,
  created_at timestamptz  NOT NULL DEFAULT now(),
  updated_at timestamptz  NOT NULL DEFAULT now()
);
COMMENT ON TABLE public."Gastronomico_modulos" IS
  'Catálogo global (compartilhado por todos os tenants) das áreas/telas que podem ser liberadas por permissão.';

CREATE TRIGGER trg_modulos_updated_at
  BEFORE UPDATE ON public."Gastronomico_modulos"
  FOR EACH ROW EXECUTE FUNCTION public.gastronomico_set_updated_at();


-- ============================================================================
-- 5. USUARIO_PERMISSOES  (junção N:M usuário × módulo — permissões normalizadas)
-- ============================================================================
CREATE TABLE public."Gastronomico_usuario_permissoes" (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- CASCADE: as permissões não fazem sentido sem o usuário.
  usuario_id uuid NOT NULL REFERENCES public."Gastronomico_usuarios"(id) ON DELETE CASCADE,
  -- CASCADE: se um módulo for descontinuado do catálogo, remove as permissões atreladas.
  modulo_id  uuid NOT NULL REFERENCES public."Gastronomico_modulos"(id)  ON DELETE CASCADE,
  permitido  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_usuario_modulo UNIQUE (usuario_id, modulo_id)
);
COMMENT ON TABLE public."Gastronomico_usuario_permissoes" IS
  'Liberação de acesso por módulo para cada colaborador (RBAC por usuário).';

CREATE INDEX idx_permissoes_usuario ON public."Gastronomico_usuario_permissoes"(usuario_id);
CREATE INDEX idx_permissoes_modulo  ON public."Gastronomico_usuario_permissoes"(modulo_id);

CREATE TRIGGER trg_permissoes_updated_at
  BEFORE UPDATE ON public."Gastronomico_usuario_permissoes"
  FOR EACH ROW EXECUTE FUNCTION public.gastronomico_set_updated_at();


-- ============================================================================
-- 6. CATEGORIAS  (do cardápio, por unidade)
-- ============================================================================
CREATE TABLE public."Gastronomico_categorias" (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- CASCADE: a categoria pertence à unidade; excluir a filial limpa seu cardápio.
  unidade_id     uuid NOT NULL REFERENCES public."Gastronomico_unidades"(id) ON DELETE CASCADE,
  nome           varchar(100) NOT NULL,
  slug           varchar(100) NOT NULL,
  ordem_exibicao integer      NOT NULL DEFAULT 0,
  created_at     timestamptz  NOT NULL DEFAULT now(),
  updated_at     timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT uq_categoria_slug UNIQUE (unidade_id, slug)
);
COMMENT ON TABLE public."Gastronomico_categorias" IS
  'Categorias do cardápio de uma unidade (Entradas, Hambúrgueres, Bebidas, Sobremesas...).';

CREATE INDEX idx_categorias_unidade ON public."Gastronomico_categorias"(unidade_id);

CREATE TRIGGER trg_categorias_updated_at
  BEFORE UPDATE ON public."Gastronomico_categorias"
  FOR EACH ROW EXECUTE FUNCTION public.gastronomico_set_updated_at();


-- ============================================================================
-- 7. PRODUTOS  (itens do cardápio)
-- ============================================================================
CREATE TABLE public."Gastronomico_produtos" (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- CASCADE: o produto pertence à unidade; excluir a filial limpa seus produtos.
  unidade_id         uuid NOT NULL REFERENCES public."Gastronomico_unidades"(id)  ON DELETE CASCADE,
  -- SET NULL: excluir uma categoria não deve apagar os produtos; eles ficam "sem categoria".
  categoria_id       uuid REFERENCES public."Gastronomico_categorias"(id) ON DELETE SET NULL,
  nome               varchar(255) NOT NULL,
  descricao          text,
  preco              numeric(10,2) NOT NULL CHECK (preco >= 0),
  preco_original     numeric(10,2) CHECK (preco_original >= 0),   -- preço "de/por" (promoção)
  imagem_url         text,
  disponivel         boolean      NOT NULL DEFAULT true,
  tempo_estimado_min integer      NOT NULL DEFAULT 15 CHECK (tempo_estimado_min >= 0),
  tags               text[]       NOT NULL DEFAULT '{}'::text[],
  em_destaque        boolean      NOT NULL DEFAULT false,
  em_promocao        boolean      NOT NULL DEFAULT false,
  estoque            integer      NOT NULL DEFAULT 0 CHECK (estoque >= 0),  -- saldo em cache (razão em estoque_movimentacoes)
  exibir_no_cardapio boolean      NOT NULL DEFAULT true,
  ordem_exibicao     integer      NOT NULL DEFAULT 0,
  created_at         timestamptz  NOT NULL DEFAULT now(),
  updated_at         timestamptz  NOT NULL DEFAULT now()
);
COMMENT ON TABLE public."Gastronomico_produtos" IS
  'Itens do cardápio de uma unidade. A coluna estoque é o saldo atual (cache); o histórico fica em Gastronomico_estoque_movimentacoes.';

CREATE INDEX idx_produtos_unidade    ON public."Gastronomico_produtos"(unidade_id);
CREATE INDEX idx_produtos_categoria  ON public."Gastronomico_produtos"(categoria_id);
CREATE INDEX idx_produtos_disponivel ON public."Gastronomico_produtos"(unidade_id, disponivel);

CREATE TRIGGER trg_produtos_updated_at
  BEFORE UPDATE ON public."Gastronomico_produtos"
  FOR EACH ROW EXECUTE FUNCTION public.gastronomico_set_updated_at();


-- ============================================================================
-- 8. ADICIONAIS  (extras de um produto: bacon, cheddar extra...)
-- ============================================================================
CREATE TABLE public."Gastronomico_adicionais" (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- CASCADE: o adicional pertence ao produto; excluir o produto remove seus adicionais.
  produto_id uuid NOT NULL REFERENCES public."Gastronomico_produtos"(id) ON DELETE CASCADE,
  nome       varchar(255)  NOT NULL,
  preco      numeric(10,2) NOT NULL CHECK (preco >= 0),
  disponivel boolean       NOT NULL DEFAULT true,
  created_at timestamptz   NOT NULL DEFAULT now(),
  updated_at timestamptz   NOT NULL DEFAULT now()
);
COMMENT ON TABLE public."Gastronomico_adicionais" IS
  'Adicionais/extras oferecidos para um produto específico.';

CREATE INDEX idx_adicionais_produto ON public."Gastronomico_adicionais"(produto_id);

CREATE TRIGGER trg_adicionais_updated_at
  BEFORE UPDATE ON public."Gastronomico_adicionais"
  FOR EACH ROW EXECUTE FUNCTION public.gastronomico_set_updated_at();


-- ============================================================================
-- 9. MESAS
-- ============================================================================
CREATE TABLE public."Gastronomico_mesas" (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- CASCADE: a mesa pertence à unidade; excluir a filial remove seu salão.
  unidade_id         uuid NOT NULL REFERENCES public."Gastronomico_unidades"(id) ON DELETE CASCADE,
  numero             varchar(50)  NOT NULL,
  capacidade         integer      NOT NULL DEFAULT 4 CHECK (capacidade > 0),
  quantidade_pessoas integer      NOT NULL DEFAULT 0 CHECK (quantidade_pessoas >= 0),
  status             varchar(50)  NOT NULL DEFAULT 'livre'
                       CHECK (status IN ('livre','ocupada','aguardando pedido',
                                         'pedido em preparo','aguardando pagamento','precisa de atendimento')),
  ativa              boolean      NOT NULL DEFAULT true,
  created_at         timestamptz  NOT NULL DEFAULT now(),
  updated_at         timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT uq_mesa_numero UNIQUE (unidade_id, numero)
);
COMMENT ON TABLE public."Gastronomico_mesas" IS
  'Mesas do salão de uma unidade, com status operacional em tempo real.';

CREATE INDEX idx_mesas_unidade ON public."Gastronomico_mesas"(unidade_id);
CREATE INDEX idx_mesas_status  ON public."Gastronomico_mesas"(unidade_id, status);

CREATE TRIGGER trg_mesas_updated_at
  BEFORE UPDATE ON public."Gastronomico_mesas"
  FOR EACH ROW EXECUTE FUNCTION public.gastronomico_set_updated_at();


-- ============================================================================
-- 10. COMANDAS  (sessão de consumo do cliente na mesa)
-- ============================================================================
CREATE TABLE public."Gastronomico_comandas" (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- CASCADE: a comanda pertence à unidade.
  unidade_id   uuid NOT NULL REFERENCES public."Gastronomico_unidades"(id) ON DELETE CASCADE,
  -- SET NULL: preserva o histórico de consumo mesmo se a mesa for removida/reconfigurada.
  mesa_id      uuid REFERENCES public."Gastronomico_mesas"(id) ON DELETE SET NULL,
  nome_cliente varchar(255),
  status       varchar(50)   NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed','paid')),
  aberta_em    timestamptz   NOT NULL DEFAULT now(),
  fechada_em   timestamptz,
  valor_total  numeric(10,2) NOT NULL DEFAULT 0 CHECK (valor_total >= 0),
  created_at   timestamptz   NOT NULL DEFAULT now(),
  updated_at   timestamptz   NOT NULL DEFAULT now()
);
COMMENT ON TABLE public."Gastronomico_comandas" IS
  'Sessão/conta aberta de uma mesa (individual ou compartilhada), acumulando o consumo até o pagamento.';

CREATE INDEX idx_comandas_unidade    ON public."Gastronomico_comandas"(unidade_id);
CREATE INDEX idx_comandas_status     ON public."Gastronomico_comandas"(status);
CREATE INDEX idx_comandas_mesa_ativa ON public."Gastronomico_comandas"(mesa_id) WHERE status = 'active';

CREATE TRIGGER trg_comandas_updated_at
  BEFORE UPDATE ON public."Gastronomico_comandas"
  FOR EACH ROW EXECUTE FUNCTION public.gastronomico_set_updated_at();


-- ============================================================================
-- 11. COMANDA_PARTICIPANTES  (comanda compartilhada / multiplayer)
-- ============================================================================
CREATE TABLE public."Gastronomico_comanda_participantes" (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- CASCADE: o participante não existe sem a comanda.
  comanda_id uuid NOT NULL REFERENCES public."Gastronomico_comandas"(id) ON DELETE CASCADE,
  nome       varchar(255) NOT NULL,
  entrou_em  timestamptz  NOT NULL DEFAULT now(),
  created_at timestamptz  NOT NULL DEFAULT now(),
  updated_at timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT uq_comanda_participante UNIQUE (comanda_id, nome)
);
COMMENT ON TABLE public."Gastronomico_comanda_participantes" IS
  'Pessoas que integram uma comanda compartilhada.';

CREATE INDEX idx_participantes_comanda ON public."Gastronomico_comanda_participantes"(comanda_id);

CREATE TRIGGER trg_participantes_updated_at
  BEFORE UPDATE ON public."Gastronomico_comanda_participantes"
  FOR EACH ROW EXECUTE FUNCTION public.gastronomico_set_updated_at();


-- ============================================================================
-- 12. PEDIDOS
-- ============================================================================
CREATE TABLE public."Gastronomico_pedidos" (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- CASCADE: o pedido pertence à unidade.
  unidade_id uuid NOT NULL REFERENCES public."Gastronomico_unidades"(id) ON DELETE CASCADE,
  -- SET NULL: preserva o pedido (histórico/relatórios) mesmo se a mesa for removida.
  mesa_id    uuid REFERENCES public."Gastronomico_mesas"(id)    ON DELETE SET NULL,
  -- SET NULL: o pedido sobrevive ao fechamento/remoção da comanda.
  comanda_id uuid REFERENCES public."Gastronomico_comandas"(id) ON DELETE SET NULL,
  status     varchar(50)   NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','preparing','ready','delivered','cancelled')),
  total      numeric(10,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  pago       boolean       NOT NULL DEFAULT false,
  created_at timestamptz   NOT NULL DEFAULT now(),
  updated_at timestamptz   NOT NULL DEFAULT now()
);
COMMENT ON TABLE public."Gastronomico_pedidos" IS
  'Pedidos enviados à cozinha, vinculados a uma mesa e (opcionalmente) a uma comanda.';

CREATE INDEX idx_pedidos_unidade ON public."Gastronomico_pedidos"(unidade_id);
CREATE INDEX idx_pedidos_mesa    ON public."Gastronomico_pedidos"(mesa_id);
CREATE INDEX idx_pedidos_comanda ON public."Gastronomico_pedidos"(comanda_id);
CREATE INDEX idx_pedidos_status  ON public."Gastronomico_pedidos"(status);

CREATE TRIGGER trg_pedidos_updated_at
  BEFORE UPDATE ON public."Gastronomico_pedidos"
  FOR EACH ROW EXECUTE FUNCTION public.gastronomico_set_updated_at();


-- ============================================================================
-- 13. PEDIDO_ITENS  (snapshot estático de nome/preço no momento do pedido)
-- ============================================================================
CREATE TABLE public."Gastronomico_pedido_itens" (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- CASCADE: o item não existe sem o pedido.
  pedido_id       uuid NOT NULL REFERENCES public."Gastronomico_pedidos"(id)  ON DELETE CASCADE,
  -- SET NULL: nome/preço são gravados de forma estática; o item preserva-se se o produto mudar/sair.
  produto_id      uuid REFERENCES public."Gastronomico_produtos"(id) ON DELETE SET NULL,
  nome            varchar(255)  NOT NULL,
  preco           numeric(10,2) NOT NULL CHECK (preco >= 0),
  quantidade      integer       NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  quantidade_paga integer       NOT NULL DEFAULT 0 CHECK (quantidade_paga >= 0),  -- pagamento item a item
  observacao      text,
  nome_cliente    varchar(255),  -- quem pediu (comanda compartilhada)
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now()
);
COMMENT ON TABLE public."Gastronomico_pedido_itens" IS
  'Itens de um pedido; nome e preço são congelados (snapshot) para preservar o histórico financeiro.';

CREATE INDEX idx_pedido_itens_pedido  ON public."Gastronomico_pedido_itens"(pedido_id);
CREATE INDEX idx_pedido_itens_produto ON public."Gastronomico_pedido_itens"(produto_id);

CREATE TRIGGER trg_pedido_itens_updated_at
  BEFORE UPDATE ON public."Gastronomico_pedido_itens"
  FOR EACH ROW EXECUTE FUNCTION public.gastronomico_set_updated_at();


-- ============================================================================
-- 14. PEDIDO_ITEM_ADICIONAIS  (adicionais escolhidos em cada item — snapshot)
-- ============================================================================
CREATE TABLE public."Gastronomico_pedido_item_adicionais" (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- CASCADE: o adicional escolhido não existe sem o item de pedido.
  pedido_item_id  uuid NOT NULL REFERENCES public."Gastronomico_pedido_itens"(id) ON DELETE CASCADE,
  -- SET NULL: snapshot estático; preserva-se mesmo se o adicional do cardápio for removido.
  adicional_id    uuid REFERENCES public."Gastronomico_adicionais"(id) ON DELETE SET NULL,
  nome            varchar(255)  NOT NULL,
  preco           numeric(10,2) NOT NULL CHECK (preco >= 0),
  quantidade      integer       NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now()
);
COMMENT ON TABLE public."Gastronomico_pedido_item_adicionais" IS
  'Adicionais selecionados para um item de pedido (snapshot de nome/preço).';

CREATE INDEX idx_pedido_item_adicionais_item ON public."Gastronomico_pedido_item_adicionais"(pedido_item_id);

CREATE TRIGGER trg_pedido_item_adicionais_updated_at
  BEFORE UPDATE ON public."Gastronomico_pedido_item_adicionais"
  FOR EACH ROW EXECUTE FUNCTION public.gastronomico_set_updated_at();


-- ============================================================================
-- 15. ESTOQUE_MOVIMENTACOES  (razão/histórico de entradas e saídas)
-- ============================================================================
CREATE TABLE public."Gastronomico_estoque_movimentacoes" (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- CASCADE: a movimentação pertence à unidade.
  unidade_id     uuid NOT NULL REFERENCES public."Gastronomico_unidades"(id) ON DELETE CASCADE,
  -- CASCADE: a razão de estoque acompanha o produto; excluir o produto remove seu histórico.
  produto_id     uuid NOT NULL REFERENCES public."Gastronomico_produtos"(id) ON DELETE CASCADE,
  tipo           varchar(20)  NOT NULL CHECK (tipo IN ('entrada','saida','ajuste','perda')),
  quantidade     integer      NOT NULL CHECK (quantidade <> 0),  -- positivo (entrada) ou negativo (saída)
  saldo_anterior integer      NOT NULL CHECK (saldo_anterior >= 0),
  saldo_atual    integer      NOT NULL CHECK (saldo_atual >= 0),
  motivo         text,
  -- SET NULL: preserva a movimentação mesmo que o operador saia da equipe.
  usuario_id     uuid REFERENCES public."Gastronomico_usuarios"(id) ON DELETE SET NULL,
  -- SET NULL: saída por venda; preserva-se mesmo se o pedido for removido.
  pedido_id      uuid REFERENCES public."Gastronomico_pedidos"(id)  ON DELETE SET NULL,
  created_at     timestamptz  NOT NULL DEFAULT now(),
  updated_at     timestamptz  NOT NULL DEFAULT now()
);
COMMENT ON TABLE public."Gastronomico_estoque_movimentacoes" IS
  'Livro-razão de estoque por produto/unidade (entrada, saída, ajuste, perda). Fonte da verdade do saldo.';

CREATE INDEX idx_estoque_mov_produto ON public."Gastronomico_estoque_movimentacoes"(produto_id);
CREATE INDEX idx_estoque_mov_unidade ON public."Gastronomico_estoque_movimentacoes"(unidade_id);
CREATE INDEX idx_estoque_mov_data    ON public."Gastronomico_estoque_movimentacoes"(created_at);

CREATE TRIGGER trg_estoque_mov_updated_at
  BEFORE UPDATE ON public."Gastronomico_estoque_movimentacoes"
  FOR EACH ROW EXECUTE FUNCTION public.gastronomico_set_updated_at();


-- ============================================================================
-- 16. CHAMADOS_GARCOM
-- ============================================================================
CREATE TABLE public."Gastronomico_chamados_garcom" (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- CASCADE: o chamado pertence à unidade.
  unidade_id         uuid NOT NULL REFERENCES public."Gastronomico_unidades"(id) ON DELETE CASCADE,
  -- CASCADE: chamado é sinal operacional efêmero; sem a mesa, perde o sentido.
  mesa_id            uuid NOT NULL REFERENCES public."Gastronomico_mesas"(id)    ON DELETE CASCADE,
  motivo             varchar(50) NOT NULL DEFAULT 'waiter'
                       CHECK (motivo IN ('payment','assistance','utensils','drinks',
                                         'other','cleaning','problem','waiter')),
  nota_personalizada text,
  status             varchar(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','resolved')),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public."Gastronomico_chamados_garcom" IS
  'Chamados de atendimento disparados pela mesa (pagamento, talheres, bebidas, etc.).';

CREATE INDEX idx_chamados_unidade_status ON public."Gastronomico_chamados_garcom"(unidade_id, status);
CREATE INDEX idx_chamados_mesa           ON public."Gastronomico_chamados_garcom"(mesa_id);

CREATE TRIGGER trg_chamados_updated_at
  BEFORE UPDATE ON public."Gastronomico_chamados_garcom"
  FOR EACH ROW EXECUTE FUNCTION public.gastronomico_set_updated_at();


-- ============================================================================
-- 17. PAGAMENTOS  (recibos emitidos no caixa: conta cheia, itens ou fração)
-- ============================================================================
CREATE TABLE public."Gastronomico_pagamentos" (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- CASCADE: o pagamento pertence à unidade.
  unidade_id              uuid NOT NULL REFERENCES public."Gastronomico_unidades"(id) ON DELETE CASCADE,
  -- SET NULL: registro financeiro deve sobreviver à remoção da comanda/mesa/operador.
  comanda_id              uuid REFERENCES public."Gastronomico_comandas"(id) ON DELETE SET NULL,
  mesa_id                 uuid REFERENCES public."Gastronomico_mesas"(id)    ON DELETE SET NULL,
  usuario_id              uuid REFERENCES public."Gastronomico_usuarios"(id) ON DELETE SET NULL,
  subtotal                numeric(10,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  taxa_servico            numeric(10,2) NOT NULL DEFAULT 0 CHECK (taxa_servico >= 0),
  taxa_servico_percentual numeric(5,2)  NOT NULL DEFAULT 0 CHECK (taxa_servico_percentual >= 0),
  desconto                numeric(10,2) NOT NULL DEFAULT 0 CHECK (desconto >= 0),
  valor_total             numeric(10,2) NOT NULL CHECK (valor_total >= 0),
  forma_pagamento         varchar(20)   NOT NULL CHECK (forma_pagamento IN ('pix','dinheiro','credito','debito')),
  valor_recebido          numeric(10,2) NOT NULL DEFAULT 0 CHECK (valor_recebido >= 0),
  troco                   numeric(10,2) NOT NULL DEFAULT 0 CHECK (troco >= 0),
  quantidade_pessoas      integer       NOT NULL DEFAULT 1 CHECK (quantidade_pessoas > 0),  -- divisão da conta
  tipo                    varchar(20)   NOT NULL DEFAULT 'FULL' CHECK (tipo IN ('FULL','ITEMS','SPLIT_MEMBER')),
  nome_pagador            varchar(255),
  status                  varchar(50)   NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','completed','failed')),
  created_at              timestamptz   NOT NULL DEFAULT now(),
  updated_at              timestamptz   NOT NULL DEFAULT now()
);
COMMENT ON TABLE public."Gastronomico_pagamentos" IS
  'Comprovantes de pagamento emitidos no caixa, com taxa de serviço, desconto, divisão de conta e troco.';

CREATE INDEX idx_pagamentos_unidade ON public."Gastronomico_pagamentos"(unidade_id);
CREATE INDEX idx_pagamentos_comanda ON public."Gastronomico_pagamentos"(comanda_id);
CREATE INDEX idx_pagamentos_data    ON public."Gastronomico_pagamentos"(created_at);

CREATE TRIGGER trg_pagamentos_updated_at
  BEFORE UPDATE ON public."Gastronomico_pagamentos"
  FOR EACH ROW EXECUTE FUNCTION public.gastronomico_set_updated_at();


-- ============================================================================
-- 18. CAIXA_MOVIMENTACOES  (livro-caixa: abertura/fechamento/sangria/suprimento)
-- ============================================================================
CREATE TABLE public."Gastronomico_caixa_movimentacoes" (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- CASCADE: a movimentação de caixa pertence à unidade.
  unidade_id    uuid NOT NULL REFERENCES public."Gastronomico_unidades"(id) ON DELETE CASCADE,
  -- SET NULL: preserva o lançamento mesmo que o operador saia da equipe.
  usuario_id    uuid REFERENCES public."Gastronomico_usuarios"(id) ON DELETE SET NULL,
  tipo          varchar(20)   NOT NULL CHECK (tipo IN ('abertura','fechamento','sangria','suprimento')),
  valor         numeric(10,2) NOT NULL CHECK (valor >= 0),
  descricao     text,
  saldo_apos    numeric(10,2) NOT NULL DEFAULT 0,
  registrado_em timestamptz   NOT NULL DEFAULT now(),
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now()
);
COMMENT ON TABLE public."Gastronomico_caixa_movimentacoes" IS
  'Auditoria do caixa (gaveta): aberturas, fechamentos, sangrias e suprimentos, com saldo resultante.';

CREATE INDEX idx_caixa_mov_unidade ON public."Gastronomico_caixa_movimentacoes"(unidade_id);
CREATE INDEX idx_caixa_mov_data    ON public."Gastronomico_caixa_movimentacoes"(registrado_em);

CREATE TRIGGER trg_caixa_mov_updated_at
  BEFORE UPDATE ON public."Gastronomico_caixa_movimentacoes"
  FOR EACH ROW EXECUTE FUNCTION public.gastronomico_set_updated_at();


-- ============================================================================
-- 19. SEED — catálogo global de módulos permissionáveis
-- ============================================================================
INSERT INTO public."Gastronomico_modulos" (chave, nome, descricao) VALUES
  ('dashboard', 'Painel Executivo', 'Faturamento do dia, gráficos de vendas e fluxo horário.'),
  ('cardapio',  'Cardápio',         'Cadastro e edição de categorias, produtos e adicionais.'),
  ('estoque',   'Estoque / Ruptura','Controle de estoque e alertas de ruptura.'),
  ('mesas',     'Mesas',            'Gestão do salão e status das mesas.'),
  ('pedidos',   'Pedidos',          'Acompanhamento e gestão de pedidos.'),
  ('cozinha',   'Cozinha (KDS)',    'Fila de preparo da cozinha.'),
  ('caixa',     'Caixa',            'Fechamento de conta, descontos, taxas e recibos.'),
  ('auditoria', 'Auditoria de Caixa','Aberturas, fechamentos, sangrias e suprimentos.'),
  ('config',    'Configurações',    'Configurações da marca/unidade.'),
  ('usuarios',  'Usuários e Permissões','Cadastro de colaboradores e liberação de acessos.')
ON CONFLICT (chave) DO NOTHING;


-- ============================================================================
-- 20. ROW LEVEL SECURITY (RLS) — ISOLAMENTO MULTI-TENANT POR MARCA/UNIDADE
-- ============================================================================

-- Restaurante (marca) do colaborador autenticado.
CREATE OR REPLACE FUNCTION public.gastronomico_restaurante_do_usuario()
RETURNS uuid
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT restaurante_id FROM public."Gastronomico_usuarios" WHERE id = auth.uid();
$$;

-- Conjunto de unidades acessíveis pelo colaborador (todas as filiais da sua marca).
CREATE OR REPLACE FUNCTION public.gastronomico_minhas_unidades()
RETURNS SETOF uuid
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT id FROM public."Gastronomico_unidades"
  WHERE restaurante_id = public.gastronomico_restaurante_do_usuario();
$$;

-- Habilita RLS em todas as tabelas.
ALTER TABLE public."Gastronomico_restaurantes"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Gastronomico_unidades"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Gastronomico_usuarios"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Gastronomico_modulos"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Gastronomico_usuario_permissoes"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Gastronomico_categorias"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Gastronomico_produtos"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Gastronomico_adicionais"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Gastronomico_mesas"                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Gastronomico_comandas"               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Gastronomico_comanda_participantes"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Gastronomico_pedidos"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Gastronomico_pedido_itens"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Gastronomico_pedido_item_adicionais" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Gastronomico_estoque_movimentacoes"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Gastronomico_chamados_garcom"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Gastronomico_pagamentos"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Gastronomico_caixa_movimentacoes"    ENABLE ROW LEVEL SECURITY;

-- --- Vitrine pública (cliente na mesa, sem login) ---------------------------
CREATE POLICY p_restaurantes_select_publico ON public."Gastronomico_restaurantes"
  FOR SELECT USING (true);
CREATE POLICY p_unidades_select_publico ON public."Gastronomico_unidades"
  FOR SELECT USING (true);
CREATE POLICY p_categorias_select_publico ON public."Gastronomico_categorias"
  FOR SELECT USING (true);
CREATE POLICY p_produtos_select_publico ON public."Gastronomico_produtos"
  FOR SELECT USING (true);
CREATE POLICY p_adicionais_select_publico ON public."Gastronomico_adicionais"
  FOR SELECT USING (true);
CREATE POLICY p_mesas_select_publico ON public."Gastronomico_mesas"
  FOR SELECT USING (true);
CREATE POLICY p_modulos_select_publico ON public."Gastronomico_modulos"
  FOR SELECT USING (true);

-- --- Marca (equipe autenticada) gerencia seus próprios registros ------------
CREATE POLICY p_restaurantes_admin ON public."Gastronomico_restaurantes"
  FOR ALL USING (id = public.gastronomico_restaurante_do_usuario())
          WITH CHECK (id = public.gastronomico_restaurante_do_usuario());

CREATE POLICY p_unidades_admin ON public."Gastronomico_unidades"
  FOR ALL USING (restaurante_id = public.gastronomico_restaurante_do_usuario())
          WITH CHECK (restaurante_id = public.gastronomico_restaurante_do_usuario());

CREATE POLICY p_usuarios_self_select ON public."Gastronomico_usuarios"
  FOR SELECT USING (id = auth.uid() OR restaurante_id = public.gastronomico_restaurante_do_usuario());
CREATE POLICY p_usuarios_admin ON public."Gastronomico_usuarios"
  FOR ALL USING (restaurante_id = public.gastronomico_restaurante_do_usuario())
          WITH CHECK (restaurante_id = public.gastronomico_restaurante_do_usuario());

CREATE POLICY p_permissoes_admin ON public."Gastronomico_usuario_permissoes"
  FOR ALL USING (usuario_id IN (SELECT id FROM public."Gastronomico_usuarios"
                                WHERE restaurante_id = public.gastronomico_restaurante_do_usuario()))
          WITH CHECK (usuario_id IN (SELECT id FROM public."Gastronomico_usuarios"
                                     WHERE restaurante_id = public.gastronomico_restaurante_do_usuario()));

CREATE POLICY p_categorias_admin ON public."Gastronomico_categorias"
  FOR ALL USING (unidade_id IN (SELECT public.gastronomico_minhas_unidades()))
          WITH CHECK (unidade_id IN (SELECT public.gastronomico_minhas_unidades()));

CREATE POLICY p_produtos_admin ON public."Gastronomico_produtos"
  FOR ALL USING (unidade_id IN (SELECT public.gastronomico_minhas_unidades()))
          WITH CHECK (unidade_id IN (SELECT public.gastronomico_minhas_unidades()));

CREATE POLICY p_adicionais_admin ON public."Gastronomico_adicionais"
  FOR ALL USING (produto_id IN (SELECT id FROM public."Gastronomico_produtos"
                                WHERE unidade_id IN (SELECT public.gastronomico_minhas_unidades())))
          WITH CHECK (produto_id IN (SELECT id FROM public."Gastronomico_produtos"
                                     WHERE unidade_id IN (SELECT public.gastronomico_minhas_unidades())));

CREATE POLICY p_mesas_admin ON public."Gastronomico_mesas"
  FOR ALL USING (unidade_id IN (SELECT public.gastronomico_minhas_unidades()))
          WITH CHECK (unidade_id IN (SELECT public.gastronomico_minhas_unidades()));

CREATE POLICY p_estoque_mov_admin ON public."Gastronomico_estoque_movimentacoes"
  FOR ALL USING (unidade_id IN (SELECT public.gastronomico_minhas_unidades()))
          WITH CHECK (unidade_id IN (SELECT public.gastronomico_minhas_unidades()));

CREATE POLICY p_caixa_mov_admin ON public."Gastronomico_caixa_movimentacoes"
  FOR ALL USING (unidade_id IN (SELECT public.gastronomico_minhas_unidades()))
          WITH CHECK (unidade_id IN (SELECT public.gastronomico_minhas_unidades()));

-- --- Operação em tempo real: cliente anônimo cria/lê; equipe gerencia --------
CREATE POLICY p_comandas_select_publico ON public."Gastronomico_comandas"
  FOR SELECT USING (true);
CREATE POLICY p_comandas_insert_publico ON public."Gastronomico_comandas"
  FOR INSERT WITH CHECK (true);
CREATE POLICY p_comandas_admin ON public."Gastronomico_comandas"
  FOR ALL USING (unidade_id IN (SELECT public.gastronomico_minhas_unidades()))
          WITH CHECK (unidade_id IN (SELECT public.gastronomico_minhas_unidades()));

CREATE POLICY p_participantes_select_publico ON public."Gastronomico_comanda_participantes"
  FOR SELECT USING (true);
CREATE POLICY p_participantes_insert_publico ON public."Gastronomico_comanda_participantes"
  FOR INSERT WITH CHECK (true);

CREATE POLICY p_pedidos_select_publico ON public."Gastronomico_pedidos"
  FOR SELECT USING (true);
CREATE POLICY p_pedidos_insert_publico ON public."Gastronomico_pedidos"
  FOR INSERT WITH CHECK (true);
CREATE POLICY p_pedidos_admin ON public."Gastronomico_pedidos"
  FOR ALL USING (unidade_id IN (SELECT public.gastronomico_minhas_unidades()))
          WITH CHECK (unidade_id IN (SELECT public.gastronomico_minhas_unidades()));

CREATE POLICY p_pedido_itens_select_publico ON public."Gastronomico_pedido_itens"
  FOR SELECT USING (true);
CREATE POLICY p_pedido_itens_insert_publico ON public."Gastronomico_pedido_itens"
  FOR INSERT WITH CHECK (true);

CREATE POLICY p_pedido_item_add_select_publico ON public."Gastronomico_pedido_item_adicionais"
  FOR SELECT USING (true);
CREATE POLICY p_pedido_item_add_insert_publico ON public."Gastronomico_pedido_item_adicionais"
  FOR INSERT WITH CHECK (true);

CREATE POLICY p_chamados_select_publico ON public."Gastronomico_chamados_garcom"
  FOR SELECT USING (true);
CREATE POLICY p_chamados_insert_publico ON public."Gastronomico_chamados_garcom"
  FOR INSERT WITH CHECK (true);
CREATE POLICY p_chamados_admin ON public."Gastronomico_chamados_garcom"
  FOR ALL USING (unidade_id IN (SELECT public.gastronomico_minhas_unidades()))
          WITH CHECK (unidade_id IN (SELECT public.gastronomico_minhas_unidades()));

CREATE POLICY p_pagamentos_select_publico ON public."Gastronomico_pagamentos"
  FOR SELECT USING (true);
CREATE POLICY p_pagamentos_insert_publico ON public."Gastronomico_pagamentos"
  FOR INSERT WITH CHECK (true);
CREATE POLICY p_pagamentos_admin ON public."Gastronomico_pagamentos"
  FOR ALL USING (unidade_id IN (SELECT public.gastronomico_minhas_unidades()))
          WITH CHECK (unidade_id IN (SELECT public.gastronomico_minhas_unidades()));

-- ============================================================================
-- FIM DO SCHEMA
-- ============================================================================
