-- ==============================================================================
-- SCHEMA SQL PARA SUPABASE & POSTGRESQL (SISTEMA DE RESTAURANTE MULTI-TENANT)
-- Data: 2026-05-25 (Estruturado para Múltiplas Unidades / Restaurants)
-- ==============================================================================
-- Este arquivo contém o schema completo para gerenciamento de restaurantes, mesas,
-- comandas, categorias, pratos, adicionais, pedidos e chamados de garçom com RLS.
-- ==============================================================================

-- Ativar extensão para geração de UUIDv4 se não estiver ativa
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 0. FUNÇÕES UTILITÁRIAS E TRIGGERS GERAIS
-- ==============================================================================

-- Função geral para atualizar timestamps 'updated_at' de forma automática
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ==============================================================================
-- 1. TABELA DE RESTAURANTES (Tenant Principal)
-- ==============================================================================
CREATE TABLE public.restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    logo_url TEXT,
    address TEXT,
    phone VARCHAR(50),
    theme_color VARCHAR(50) DEFAULT 'red',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TRIGGER trigger_update_restaurants_updated_at
    BEFORE UPDATE ON public.restaurants
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();


-- ==============================================================================
-- 2. TABELA DE USUÁRIOS / PERFIS (Tied to Supabase Auth)
-- ==============================================================================
-- Mapeia os usuários criados no Supabase Auth para perfis com cargo no restaurante.
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'waiter' 
        CHECK (role IN ('owner', 'manager', 'waiter', 'kitchen', 'cashier', 'customer')),
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TRIGGER trigger_update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();


-- ==============================================================================
-- 3. TABELA DE MESAS (Tables)
-- ==============================================================================
CREATE TABLE public.tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    number VARCHAR(50) NOT NULL, -- ex: "04"
    capacity INTEGER DEFAULT 4 NOT NULL CHECK (capacity > 0),
    people_count INTEGER DEFAULT 0 NOT NULL CHECK (people_count >= 0),
    status VARCHAR(50) DEFAULT 'livre' NOT NULL 
        CHECK (status IN ('livre', 'ocupada', 'aguardando pedido', 'pedido em preparo', 'aguardando pagamento', 'precisa de atendimento')),
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    -- Uma mesa deve ter número exclusivo dentro do mesmo restaurante
    CONSTRAINT unique_restaurant_table_number UNIQUE (restaurant_id, number)
);

CREATE TRIGGER trigger_update_tables_updated_at
    BEFORE UPDATE ON public.tables
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();


-- ==============================================================================
-- 4. TABELA DE CATEGORIAS DO MENU (Menu Categories)
-- ==============================================================================
CREATE TABLE public.menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    display_order INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    -- Evitar categorias duplicadas no mesmo restaurante
    CONSTRAINT unique_restaurant_category_slug UNIQUE (restaurant_id, slug)
);

CREATE TRIGGER trigger_update_menu_categories_updated_at
    BEFORE UPDATE ON public.menu_categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();


-- ==============================================================================
-- 5. TABELA DE ITENS DO MENU (Menu Items / Products)
-- ==============================================================================
CREATE TABLE public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.menu_categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    original_price NUMERIC(10, 2) CHECK (original_price >= 0),
    image_url TEXT,
    is_available BOOLEAN DEFAULT true NOT NULL,
    estimated_time_min INTEGER DEFAULT 15 NOT NULL CHECK (estimated_time_min >= 0),
    tags TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    is_featured BOOLEAN DEFAULT false NOT NULL,
    is_promo BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TRIGGER trigger_update_menu_items_updated_at
    BEFORE UPDATE ON public.menu_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();


-- ==============================================================================
-- 6. TABELA DE ADICIONAIS DOS ITENS DO MENU (Menu Item Addons / Extras)
-- ==============================================================================
CREATE TABLE public.menu_item_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    is_available BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TRIGGER trigger_update_menu_item_addons_updated_at
    BEFORE UPDATE ON public.menu_item_addons
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();


-- ==============================================================================
-- 7. TABELA DE COMANDAS / TABS (Sessão do cliente com controle de consumo)
-- ==============================================================================
CREATE TABLE public.comandas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
    customer_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active' NOT NULL 
        CHECK (status IN ('active', 'closed', 'paid')),
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE,
    total_amount NUMERIC(10, 2) DEFAULT 0.00 NOT NULL CHECK (total_amount >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TRIGGER trigger_update_comandas_updated_at
    BEFORE UPDATE ON public.comandas
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();


-- ==============================================================================
-- 8. TABELA DE PARTICIPANTES DA COMANDA (Multiplayer / Comanda Compartilhada)
-- ==============================================================================
CREATE TABLE public.tab_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comanda_id UUID NOT NULL REFERENCES public.comandas(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_comanda_participant UNIQUE (comanda_id, name)
);


-- ==============================================================================
-- 9. TABELA DE PEDIDOS (Orders)
-- ==============================================================================
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
    comanda_id UUID REFERENCES public.comandas(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'pending' NOT NULL 
        CHECK (status IN ('pending', 'preparing', 'ready', 'delivered', 'cancelled')),
    total NUMERIC(10, 2) DEFAULT 0.00 NOT NULL CHECK (total >= 0),
    is_paid BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TRIGGER trigger_update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();


-- ==============================================================================
-- 10. ITENS DO PEDIDO (Order Items)
-- ==============================================================================
CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL, -- Salvamos o nome estático caso o prato seja deletado ou renomeado
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    quantity INTEGER DEFAULT 1 NOT NULL CHECK (quantity > 0),
    paid_quantity INTEGER DEFAULT 0 NOT NULL CHECK (paid_quantity >= 0),
    observation TEXT,
    customer_name VARCHAR(255), -- Nome do participante que pediu este item
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TRIGGER trigger_update_order_items_updated_at
    BEFORE UPDATE ON public.order_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();


-- ==============================================================================
-- 11. ADICIONAIS ESCOLHIDOS NOS ITENS DO PEDIDO (Order Item Addons)
-- ==============================================================================
CREATE TABLE public.order_item_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
    addon_id UUID REFERENCES public.menu_item_addons(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL, -- Estático
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    quantity INTEGER DEFAULT 1 NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);


-- ==============================================================================
-- 12. CHAMADOS DO GARÇOM (Waiter Calls)
-- ==============================================================================
CREATE TABLE public.waiter_calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
    reason VARCHAR(50) DEFAULT 'waiter' NOT NULL 
        CHECK (reason IN ('payment', 'assistance', 'utensils', 'drinks', 'other', 'cleaning', 'problem', 'waiter')),
    custom_note TEXT,
    status VARCHAR(50) DEFAULT 'pending' NOT NULL 
        CHECK (status IN ('pending', 'resolved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TRIGGER trigger_update_waiter_calls_updated_at
    BEFORE UPDATE ON public.waiter_calls
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();


-- ==============================================================================
-- 13. PAGAMENTOS (Payments)
-- ==============================================================================
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    comanda_id UUID NOT NULL REFERENCES public.comandas(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50) NOT NULL 
        CHECK (payment_method IN ('card', 'pix', 'cash')),
    status VARCHAR(50) DEFAULT 'pending' NOT NULL 
        CHECK (status IN ('pending', 'completed', 'failed')),
    payer_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TRIGGER trigger_update_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();


-- ==============================================================================
-- 14. VISTAS DE COMPATIBILIDADE (Para suporte direto do código TypeScript atual)
-- ==============================================================================
-- NOTA: O código frontend atual está estruturado pesquisando diretamente na tabela 'products'.
-- Criamos uma VIEW atualizável para converter 'products' em chamadas a 'menu_items' de forma transparente.

CREATE OR REPLACE VIEW public.products AS
SELECT 
    id,
    restaurant_id,
    category_id,
    name,
    description,
    price,
    original_price,
    image_url,
    is_available,
    estimated_time_min,
    tags,
    is_featured,
    is_promo,
    NULL::jsonb AS available_extras, -- Resolvido pelo addon ou formatador
    created_at,
    updated_at
FROM public.menu_items;

-- Regra para permitir atualizações de disponibilidade via VIEW diretamente (usada no AdminPanel)
CREATE OR REPLACE RULE products_update AS
    ON UPDATE TO public.products DO INSTEAD
    UPDATE public.menu_items
    SET is_available = NEW.is_available
    WHERE id = OLD.id;


-- ==============================================================================
-- 15. ÍNDICES IMPORTANTES PARA ALTA PERFORMANCE
-- ==============================================================================

-- Índices de Categoria/Menus por Restaurante
CREATE INDEX idx_menu_categories_restaurant ON public.menu_categories(restaurant_id);
CREATE INDEX idx_menu_items_restaurant ON public.menu_items(restaurant_id);
CREATE INDEX idx_menu_items_category ON public.menu_items(category_id);

-- Índices para Operação em Tempo Real de Mesas e Comandas
CREATE INDEX idx_tables_restaurant ON public.tables(restaurant_id);
CREATE INDEX idx_comandas_restaurant ON public.comandas(restaurant_id);
CREATE INDEX idx_comandas_table ON public.comandas(table_id) WHERE status = 'active';

-- Índices para Fluxo de Pedidos e Cozinha
CREATE INDEX idx_orders_restaurant ON public.orders(restaurant_id);
CREATE INDEX idx_orders_table ON public.orders(table_id);
CREATE INDEX idx_orders_comanda ON public.orders(comanda_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);

-- Índices para Atendimento de Garçons e Chamados
CREATE INDEX idx_waiter_calls_restaurant_status ON public.waiter_calls(restaurant_id, status);
CREATE INDEX idx_waiter_calls_table ON public.waiter_calls(table_id);

-- Índices de Auditoria Financeira
CREATE INDEX idx_payments_comanda ON public.payments(comanda_id);
CREATE INDEX idx_payments_restaurant ON public.payments(restaurant_id);


-- ==============================================================================
-- 16. SEGURANÇA E ROW LEVEL SECURITY (RLS) - ISOLAMENTO MULTI-RESTAURANTE
-- ==============================================================================

-- Habilita segurança de linha de leitura em todas as tabelas
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tab_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiter_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- FUNÇÃO AUXILIAR PARA CONSULTAR TENANT ID DO COLABORADOR LOGADO
-- ------------------------------------------------------------------------------
-- Retorna o UUID do restaurante associado à conta autenticada no Supabase.
CREATE OR REPLACE FUNCTION public.get_user_restaurant_id()
RETURNS UUID AS $$
  SELECT restaurant_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- POLÍTICAS: RESTAURANTS
-- ------------------------------------------------------------------------------
CREATE POLICY "Leitura pública de restaurantes"
    ON public.restaurants FOR SELECT
    USING (true);

CREATE POLICY "Colaboradores chefes podem gerenciar seu próprio restaurante"
    ON public.restaurants FOR ALL
    USING (id = public.get_user_restaurant_id())
    WITH CHECK (id = public.get_user_restaurant_id());

-- ------------------------------------------------------------------------------
-- POLÍTICAS: USERS / PROFILES
-- ------------------------------------------------------------------------------
CREATE POLICY "Usuários logados leem próprio perfil"
    ON public.users FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Colaboradores do mesmo restaurante visualizam outros colegas"
    ON public.users FOR SELECT
    USING (restaurant_id = public.get_user_restaurant_id());

CREATE POLICY "Gestores podem cadastrar/gerenciar equipe no mesmo restaurante"
    ON public.users FOR ALL
    USING (restaurant_id = public.get_user_restaurant_id() AND (
        SELECT role FROM public.users WHERE id = auth.uid()
    ) IN ('owner', 'manager'))
    WITH CHECK (restaurant_id = public.get_user_restaurant_id());

-- ------------------------------------------------------------------------------
-- POLÍTICAS: CARDÁPIO (Categories, Menu Items, Addons)
-- O cliente na mesa (anon) precisa ver o cardápio sem login.
-- ------------------------------------------------------------------------------
CREATE POLICY "Clientes e equipe podem visualizar categorias"
    ON public.menu_categories FOR SELECT
    USING (true);

CREATE POLICY "Apenas equipe pode editar categoria"
    ON public.menu_categories FOR ALL
    USING (restaurant_id = public.get_user_restaurant_id())
    WITH CHECK (restaurant_id = public.get_user_restaurant_id());

CREATE POLICY "Clientes e equipe podem visualizar itens do cardápio"
    ON public.menu_items FOR SELECT
    USING (true);

CREATE POLICY "Apenas equipe pode editar itens do cardápio"
    ON public.menu_items FOR ALL
    USING (restaurant_id = public.get_user_restaurant_id())
    WITH CHECK (restaurant_id = public.get_user_restaurant_id());

CREATE POLICY "Clientes e equipe podem visualizar adicionais do menu"
    ON public.menu_item_addons FOR SELECT
    USING (true);

CREATE POLICY "Apenas equipe pode editar adicionais do menu"
    ON public.menu_item_addons FOR ALL
    USING (menu_item_id IN (
        SELECT id FROM public.menu_items WHERE restaurant_id = public.get_user_restaurant_id()
    ))
    WITH CHECK (menu_item_id IN (
        SELECT id FROM public.menu_items WHERE restaurant_id = public.get_user_restaurant_id()
    ));

-- ------------------------------------------------------------------------------
-- POLÍTICAS: MESAS, COMANDAS, PEDIDOS E CHAMADOS (Operações em Tempo Real)
-- Clientes anônimos podem criar comandas, pedidos e chamados em suas mesas locais.
-- ------------------------------------------------------------------------------

-- Mesas
CREATE POLICY "Visualização pública de mesas"
    ON public.tables FOR SELECT
    USING (true);

CREATE POLICY "Equipe do restaurante gerencia mesas"
    ON public.tables FOR ALL
    USING (restaurant_id = public.get_user_restaurant_id())
    WITH CHECK (restaurant_id = public.get_user_restaurant_id());

-- Comandas (Tabs)
CREATE POLICY "Clientes anônimos criam e veem suas comandas ativas"
    ON public.comandas FOR SELECT
    USING (status = 'active'); -- Clientes conseguem consultar comandas ativas do restaurante

CREATE POLICY "Clientes anônimos podem abrir novas comandas"
    ON public.comandas FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Equipe gerencia todas as comandas do restaurante"
    ON public.comandas FOR ALL
    USING (restaurant_id = public.get_user_restaurant_id())
    WITH CHECK (restaurant_id = public.get_user_restaurant_id());

-- Participantes da Comanda
CREATE POLICY "Leitura pública de participantes"
    ON public.tab_participants FOR SELECT
    USING (true);

CREATE POLICY "Inserção pública de participantes"
    ON public.tab_participants FOR INSERT
    WITH CHECK (true);

-- Pedidos (Orders)
CREATE POLICY "Leitura de pedidos de comandas ativas"
    ON public.orders FOR SELECT
    USING (true);

CREATE POLICY "Inserção de novos pedidos"
    ON public.orders FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Equipe gerencia todos os pedidos do restaurante"
    ON public.orders FOR ALL
    USING (restaurant_id = public.get_user_restaurant_id())
    WITH CHECK (restaurant_id = public.get_user_restaurant_id());

-- Itens de Pedidos e Adicionais de Itens
CREATE POLICY "Acesso público a itens de pedido"
    ON public.order_items FOR SELECT
    USING (true);

CREATE POLICY "Criação de itens de pedido por clientes"
    ON public.order_items FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Equipe gerencia itens de pedidos"
    ON public.order_items FOR ALL
    USING (order_id IN (
        SELECT id FROM public.orders WHERE restaurant_id = public.get_user_restaurant_id()
    ))
    WITH CHECK (order_id IN (
        SELECT id FROM public.orders WHERE restaurant_id = public.get_user_restaurant_id()
    ));

CREATE POLICY "Acesso público a adicionais de itens de pedido"
    ON public.order_item_addons FOR SELECT
    USING (true);

CREATE POLICY "Criação de adicionais de itens de pedido por clientes"
    ON public.order_item_addons FOR INSERT
    WITH CHECK (true);

-- Chamados do Garçom
CREATE POLICY "Clientes notificam e equipe gerencia chamados"
    ON public.waiter_calls FOR SELECT
    USING (true);

CREATE POLICY "Clientes solicitam chamados de garçom"
    ON public.waiter_calls FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Equipe atende/resolve chamados de garçom"
    ON public.waiter_calls FOR ALL
    USING (restaurant_id = public.get_user_restaurant_id())
    WITH CHECK (restaurant_id = public.get_user_restaurant_id());

-- Pagamentos
CREATE POLICY "Clientes criam fluxos de pagamentos"
    ON public.payments FOR SELECT
    USING (true);

CREATE POLICY "Clientes realizam inserção de pagamentos"
    ON public.payments FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Equipe confirma/gerencia pagamentos"
    ON public.payments FOR ALL
    USING (restaurant_id = public.get_user_restaurant_id())
    WITH CHECK (restaurant_id = public.get_user_restaurant_id());


-- ==============================================================================
-- 17. SCRIPT DE POPULAÇÃO DE INFORMAÇÕES INICIAIS (Seed Mock Data)
-- ==============================================================================

-- A. Cadastrando restaurante modelo
INSERT INTO public.restaurants (id, name, slug, logo_url, theme_color, address, phone)
VALUES (
    '93dbba32-e3d1-4ba2-8bf8-d3fd3dbdcc01', 
    'The Crown Burger & Co.', 
    'the-crown-burger', 
    'https://images.unsplash.com/photo-1550547660-d9450f859349?w=120&auto=format&fit=crop&q=80', 
    'red',
    'Avenida das Delícias, 1000 - Centro',
    '(11) 99999-8888'
) ON CONFLICT (id) DO NOTHING;

-- B. Cadastrando mesas padrão vinculadas ao restaurante modelo
INSERT INTO public.tables (restaurant_id, number, capacity, people_count, status)
VALUES 
    ('93dbba32-e3d1-4ba2-8bf8-d3fd3dbdcc01', '01', 4, 0, 'livre'),
    ('93dbba32-e3d1-4ba2-8bf8-d3fd3dbdcc01', '02', 4, 4, 'ocupada'),
    ('93dbba32-e3d1-4ba2-8bf8-d3fd3dbdcc01', '03', 2, 0, 'livre'),
    ('93dbba32-e3d1-4ba2-8bf8-d3fd3dbdcc01', '04', 6, 0, 'livre'),
    ('93dbba32-e3d1-4ba2-8bf8-d3fd3dbdcc01', '05', 2, 2, 'ocupada'),
    ('93dbba32-e3d1-4ba2-8bf8-d3fd3dbdcc01', '06', 4, 0, 'livre'),
    ('93dbba32-e3d1-4ba2-8bf8-d3fd3dbdcc01', '07', 4, 0, 'livre'),
    ('93dbba32-e3d1-4ba2-8bf8-d3fd3dbdcc01', '08', 8, 0, 'livre'),
    ('93dbba32-e3d1-4ba2-8bf8-d3fd3dbdcc01', '09', 4, 3, 'ocupada'),
    ('93dbba32-e3d1-4ba2-8bf8-d3fd3dbdcc01', '10', 4, 0, 'livre'),
    ('93dbba32-e3d1-4ba2-8bf8-d3fd3dbdcc01', '11', 2, 2, 'ocupada'),
    ('93dbba32-e3d1-4ba2-8bf8-d3fd3dbdcc01', '12', 4, 0, 'livre')
ON CONFLICT (restaurant_id, number) DO NOTHING;

-- C. Cadastrando categorias padrão
INSERT INTO public.menu_categories (id, restaurant_id, name, slug, display_order)
VALUES 
    ('cat-ent', '93dbba32-e3d1-4ba2-8bf8-d3fd3dbdcc01', 'Entradas', 'entradas', 1),
    ('cat-burg', '93dbba32-e3d1-4ba2-8bf8-d3fd3dbdcc01', 'Hamburgers', 'burgers', 2),
    ('cat-beb', '93dbba32-e3d1-4ba2-8bf8-d3fd3dbdcc01', 'Bebidas', 'bebidas', 3),
    ('cat-sob', '93dbba32-e3d1-4ba2-8bf8-d3fd3dbdcc01', 'Sobremesas', 'sobremesas', 4)
ON CONFLICT (restaurant_id, slug) DO NOTHING;

-- D. Cadastrando hambúrgueres e itens do cardápio modelo
INSERT INTO public.menu_items (id, restaurant_id, category_id, name, description, price, original_price, is_available, estimated_time_min, tags, is_featured, is_promo, image_url)
VALUES 
    (
        'burg-1', 
        '93dbba32-e3d1-4ba2-8bf8-d3fd3dbdcc01', 
        'cat-burg', 
        'Crown Smash Double Bacon', 
        'Dois smash burgers premium de 80g cada, queijo cheddar inglês duplo derretido, cebola grelhada premium, bacon artesanal super crocante com calda suave e molho exclusivo Crown Chef.', 
        46.00, 
        54.00, 
        true, 
        15, 
        ARRAY['Mais vendido', 'Artesanal', 'Recomendado'], 
        true, 
        true, 
        'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=80'
    ),
    (
        'burg-2', 
        '93dbba32-e3d1-4ba2-8bf8-d3fd3dbdcc01', 
        'cat-burg', 
        'Truffle & Mushroom Burger', 
        'Blend de 160g de carne bovina Black Angus, mix farto de cogumelos selvagens (shimeji e paris) grelhados, queijo provolone derretido e maionese trufada exclusiva na brioche artesanal.', 
        49.00, 
        NULL, 
        true, 
        20, 
        ARRAY['Novidade', 'Mais Vendido', 'Premium'], 
        true, 
        false, 
        'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=800&auto=format&fit=crop&q=80'
    ),
    (
        'ent-1', 
        '93dbba32-e3d1-4ba2-8bf8-d3fd3dbdcc01', 
        'cat-ent', 
        'Rustic French Fries', 
        'Batatas fritas rústicas cortadas à mão, temperadas com sal marinho grosso, alecrim fresco grelhado e páprica defumada. Acompanha maionese verde caseira de ervas aromáticas.', 
        24.00, 
        28.00, 
        true, 
        10, 
        ARRAY['Para Compartilhar', 'Sucesso'], 
        false, 
        true, 
        'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800&auto=format&fit=crop&q=80'
    ),
    (
        'beb-1', 
        '93dbba32-e3d1-4ba2-8bf8-d3fd3dbdcc01', 
        'cat-beb', 
        'Soda Artesanal de Frutas Vermelhas', 
        'Refrescante fusão gaseificada de morangos, amoras e framboesas maceradas na hora, hortelã fresca e gelo triturado premium. Sem xaropes ou conservantes artificiais.', 
        14.00, 
        NULL, 
        true, 
        5, 
        ARRAY['Artesanal', 'Refrescante'], 
        false, 
        false, 
        'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&auto=format&fit=crop&q=80'
    )
ON CONFLICT (id) DO NOTHING;

-- E. Cadastrando adicionais de hambúrguer modelo
INSERT INTO public.menu_item_addons (id, menu_item_id, name, price, is_available)
VALUES 
    ('add-bacon', 'burg-1', 'Bacon Artesanal Caramelizado', 6.00, true),
    ('add-cheddar', 'burg-1', 'Cheddar Duplo Cremoso', 5.00, true),
    ('add-carne', 'burg-1', 'Blend Extra de Carne 80g', 12.00, true),
    ('add-bacon2', 'burg-2', 'Bacon Artesanal Caramelizado', 6.00, true)
ON CONFLICT (id) DO NOTHING;
