-- ============================================================================
-- SEED DE DEMONSTRAÇÃO — GastronomicoSystem (schema Gastronomico_)
-- 1 marca + 1 unidade + categorias + produtos + adicionais + mesas.
-- Também: triggers de estoque e habilitação de Realtime.
-- Rode DEPOIS de gastronomico_schema.sql. Idempotente (ON CONFLICT DO NOTHING).
-- ============================================================================

-- IDs fixos para facilitar referências.
-- Restaurante (marca) e Unidade (filial):
--   restaurante: 11111111-1111-4111-8111-111111111111
--   unidade    : 22222222-2222-4222-8222-222222222222  (slug: unidade-centro)

INSERT INTO public."Gastronomico_restaurantes" (id, nome, slug, cor_tema, taxa_servico_padrao, plano, ativo)
VALUES ('11111111-1111-4111-8111-111111111111', 'The Crown Burger & Co.', 'the-crown-burger', 'red', 10.00, 'pro', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public."Gastronomico_unidades" (id, restaurante_id, nome, slug, endereco, telefone, ativa)
VALUES ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111',
        'Unidade Centro', 'unidade-centro', 'Avenida das Delícias, 1000 - Centro', '(11) 99999-8888', true)
ON CONFLICT (id) DO NOTHING;

-- Categorias (os slugs precisam bater com o front: entradas/burgers/bebidas/sobremesas)
INSERT INTO public."Gastronomico_categorias" (id, unidade_id, nome, slug, ordem_exibicao) VALUES
  ('33333333-0001-4000-8000-000000000001', '22222222-2222-4222-8222-222222222222', 'Entradas',     'entradas',   1),
  ('33333333-0002-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', 'Hambúrgueres', 'burgers',    2),
  ('33333333-0003-4000-8000-000000000003', '22222222-2222-4222-8222-222222222222', 'Bebidas',      'bebidas',    3),
  ('33333333-0004-4000-8000-000000000004', '22222222-2222-4222-8222-222222222222', 'Sobremesas',   'sobremesas', 4)
ON CONFLICT (id) DO NOTHING;

-- Produtos
INSERT INTO public."Gastronomico_produtos"
  (id, unidade_id, categoria_id, nome, descricao, preco, preco_original, imagem_url, disponivel,
   tempo_estimado_min, tags, em_destaque, em_promocao, estoque, exibir_no_cardapio, ordem_exibicao)
VALUES
  (gen_random_uuid(), '22222222-2222-4222-8222-222222222222', '33333333-0001-4000-8000-000000000001',
   'Batatas Rústicas com Trufa & Parmesão', 'Batatas rústicas douradas, azeite de trufas, flor de sal e parmesão.',
   36.00, NULL, 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80',
   true, 12, ARRAY['Favorito','Vegetariano','Para Compartilhar'], false, false, 12, true, 1),

  (gen_random_uuid(), '22222222-2222-4222-8222-222222222222', '33333333-0001-4000-8000-000000000001',
   'Croquete de Costela Defumada', '4 croquetes cremosos de costela defumada 12h, maionese de siracha.',
   38.00, NULL, 'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?auto=format&fit=crop&w=600&q=80',
   true, 15, ARRAY['Mais Vendido','Artesanal'], false, false, 3, true, 2),

  (gen_random_uuid(), '22222222-2222-4222-8222-222222222222', '33333333-0002-4000-8000-000000000002',
   'Crown Smash Double Bacon', 'Dois smash blends de 90g, cheddar inglês, bacon crocante e molho crown butter.',
   46.00, 54.00, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
   true, 15, ARRAY['Premium','Mais Vendido'], true, true, 25, true, 1),

  (gen_random_uuid(), '22222222-2222-4222-8222-222222222222', '33333333-0002-4000-8000-000000000002',
   'Truffle & Mushroom Burger', 'Blend 150g, cogumelos salteados, maionese trufada e gruyère no pão australiano.',
   49.00, NULL, 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80',
   true, 18, ARRAY['Premium','Diferenciado'], true, false, 8, true, 2),

  (gen_random_uuid(), '22222222-2222-4222-8222-222222222222', '33333333-0003-4000-8000-000000000003',
   'Soda Italiana de Tangerina e Alecrim', 'Xarope artesanal de tangerina, água com gás e alecrim tostado.',
   16.00, NULL, 'https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=600&q=80',
   true, 5, ARRAY['Artesanal','Refrescante'], false, false, 20, true, 1),

  (gen_random_uuid(), '22222222-2222-4222-8222-222222222222', '33333333-0004-4000-8000-000000000004',
   'Cheesecake Desconstruída de Pistache', 'Creme de mascarpone, crumble amanteigado, calda de frutas vermelhas e pistache.',
   34.00, NULL, 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=600&q=80',
   true, 8, ARRAY['Favorito','Premium'], false, false, 4, true, 1)
ON CONFLICT DO NOTHING;

-- Adicionais (vinculados a alguns produtos por nome)
INSERT INTO public."Gastronomico_adicionais" (produto_id, nome, preco, disponivel)
SELECT p.id, a.nome, a.preco, true
FROM (VALUES
  ('Crown Smash Double Bacon', 'Bacon Artesanal Caramelizado', 6.00),
  ('Crown Smash Double Bacon', 'Cheddar Inglês Extra', 5.00),
  ('Crown Smash Double Bacon', 'Blend Extra de Carne 90g', 12.00),
  ('Truffle & Mushroom Burger', 'Bacon Artesanal Caramelizado', 6.00)
) AS a(produto_nome, nome, preco)
JOIN public."Gastronomico_produtos" p
  ON p.nome = a.produto_nome AND p.unidade_id = '22222222-2222-4222-8222-222222222222'
ON CONFLICT DO NOTHING;

-- Mesas (01..12)
INSERT INTO public."Gastronomico_mesas" (unidade_id, numero, capacidade, quantidade_pessoas, status)
SELECT '22222222-2222-4222-8222-222222222222', lpad(g::text, 2, '0'), 4, 0, 'livre'
FROM generate_series(1, 12) AS g
ON CONFLICT (unidade_id, numero) DO NOTHING;


-- ============================================================================
-- TRIGGERS DE ESTOQUE
-- ============================================================================

-- Baixa automática de estoque + registro no ledger a cada item de pedido vendido.
CREATE OR REPLACE FUNCTION public.gastronomico_baixa_estoque_venda()
RETURNS TRIGGER AS $$
DECLARE
  v_unidade uuid;
  v_saldo   integer;
BEGIN
  IF NEW.produto_id IS NULL THEN RETURN NEW; END IF;

  SELECT unidade_id, estoque INTO v_unidade, v_saldo
  FROM public."Gastronomico_produtos" WHERE id = NEW.produto_id;

  IF v_unidade IS NULL THEN RETURN NEW; END IF;

  UPDATE public."Gastronomico_produtos"
     SET estoque = GREATEST(0, estoque - NEW.quantidade)
   WHERE id = NEW.produto_id;

  INSERT INTO public."Gastronomico_estoque_movimentacoes"
    (unidade_id, produto_id, tipo, quantidade, saldo_anterior, saldo_atual, motivo, pedido_id)
  VALUES
    (v_unidade, NEW.produto_id, 'saida', -NEW.quantidade,
     COALESCE(v_saldo, 0), GREATEST(0, COALESCE(v_saldo, 0) - NEW.quantidade),
     'Baixa automática por venda', NEW.pedido_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_baixa_estoque_venda ON public."Gastronomico_pedido_itens";
CREATE TRIGGER trg_baixa_estoque_venda
  AFTER INSERT ON public."Gastronomico_pedido_itens"
  FOR EACH ROW EXECUTE FUNCTION public.gastronomico_baixa_estoque_venda();


-- ============================================================================
-- REALTIME — habilita as tabelas operacionais na publicação supabase_realtime
-- ============================================================================
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public."Gastronomico_pedidos"; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public."Gastronomico_pedido_itens"; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public."Gastronomico_chamados_garcom"; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public."Gastronomico_mesas"; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public."Gastronomico_comandas"; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;


-- ============================================================================
-- PRIMEIRO USUÁRIO ADMIN (equipe) — passo manual
-- ----------------------------------------------------------------------------
-- 1) Crie o usuário no painel do Supabase (Authentication > Add user), com e-mail/senha.
-- 2) Copie o UUID gerado e rode o bloco abaixo trocando <AUTH_USER_ID>.
-- 3) Isso cria o perfil e libera TODOS os módulos para esse usuário.
-- ----------------------------------------------------------------------------
-- INSERT INTO public."Gastronomico_usuarios" (id, restaurante_id, unidade_id, nome, cargo, ativo)
-- VALUES ('<AUTH_USER_ID>', '11111111-1111-4111-8111-111111111111',
--         '22222222-2222-4222-8222-222222222222', 'Gabriel Gustavo', 'Gerente', true)
-- ON CONFLICT (id) DO NOTHING;
--
-- INSERT INTO public."Gastronomico_usuario_permissoes" (usuario_id, modulo_id, permitido)
-- SELECT '<AUTH_USER_ID>', m.id, true FROM public."Gastronomico_modulos" m
-- ON CONFLICT (usuario_id, modulo_id) DO NOTHING;
-- ============================================================================
