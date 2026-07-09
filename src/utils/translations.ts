/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LanguageType = 'pt' | 'en' | 'es';

export interface TranslationDictionary {
  app_title: string;
  app_subtitle: string;
  dica_title: string;
  dica_body: string;
  switch_client: string;
  switch_admin: string;
  switch_kitchen: string;
  switch_cashier: string;
  tab_menu: string;
  tab_cart: string;
  tab_orders: string;
  btn_add_to_order: string;
  btn_added: string;
  btn_added_to_order: string;
  text_success_add_body: string;
  btn_call_waiter: string;
  btn_view_bill: string;
  search_placeholder: string;
  category_todos: string;
  category_entradas: string;
  category_burgers: string;
  category_bebidas: string;
  category_sobremesas: string;
  title_categories: string;
  comanda_individual: string;
  comanda_shared: string;
  comanda_title: string;
  comanda_type_selection: string;
  label_name: string;
  label_observation: string;
  label_extras: string;
  text_total: string;
  btn_confirm: string;
  btn_cancel: string;
  btn_close: string;
  btn_back: string;
  text_empty_cart: string;
  btn_place_order: string;
  btn_request_bill: string;
  title_call_waiter: string;
  reason_assistance: string;
  reason_drinks: string;
  reason_utensils: string;
  reason_cleaning: string;
  reason_other: string;
  btn_submit_call: string;
  text_waiter_called: string;
  text_active_table: string;
  service_charge_label: string;
  payment_title: string;
  payment_choose_method: string;
  payment_pix: string;
  payment_card: string;
  payment_cash: string;
  payment_cashier: string;
  btn_pay_now: string;
  payment_success: string;
  promo_badge: string;
  estimated_time: string;
  bestseller_badge: string;
  artesanal_badge: string;
  vegan_badge: string;
  exclusive_badge: string;
  // Extras
  cart_title: string;
  cart_empty: string;
  cart_total_items: string;
  bill_title: string;
  bill_subtotal: string;
  bill_service: string;
  bill_total: string;
  bill_your_items: string;
  bill_status_unpaid: string;
  bill_status_paid: string;
  initial_welcome: string;
  initial_join_shared: string;
  initial_create_shared: string;
  initial_start: string;
  initial_table: string;
  initial_sub: string;
  custom_observation_placeholder: string;
}

export const translations: Record<LanguageType, TranslationDictionary> = {
  pt: {
    app_title: 'MenuMesa POS & Cardápio Digital',
    app_subtitle: 'React v19 + Tailwind v4 • Demonstração Reativa',
    dica_title: 'Dica:',
    dica_body: 'Abra o Cliente, faça pedidos e veja-os atualizar na Cozinha e no Gerente instantaneamente!',
    switch_client: 'Cliente',
    switch_admin: 'Painel Gerente',
    switch_kitchen: 'Cozinha (KDS)',
    switch_cashier: 'Caixa',
    tab_menu: 'Cardápio',
    tab_cart: 'Sacola',
    tab_orders: 'Meus Pedidos',
    btn_add_to_order: 'Adicionar',
    btn_added: 'Adicionado!',
    btn_added_to_order: 'Adicionado ao Pedido!',
    text_success_add_body: 'adicionado com sucesso ao seu carrinho.',
    btn_call_waiter: 'Chamar Garçom',
    btn_view_bill: 'Ver Conta',
    search_placeholder: 'Pesquisar no cardápio...',
    category_todos: 'Todos',
    category_entradas: 'Entradas',
    category_burgers: 'Burgers',
    category_bebidas: 'Bebidas',
    category_sobremesas: 'Sobremesas',
    title_categories: 'Categorias',
    comanda_individual: 'Individual',
    comanda_shared: 'Compartilhada',
    comanda_title: 'Sua Comanda',
    comanda_type_selection: 'Escolha o tipo de comanda:',
    label_name: 'Seu Nome',
    label_observation: 'Observações',
    label_extras: 'Opcionais / Adicionais',
    text_total: 'Total',
    btn_confirm: 'Confirmar',
    btn_cancel: 'Cancelar',
    btn_close: 'Fechar',
    btn_back: 'Voltar',
    text_empty_cart: 'Sua sacola está vazia. Adicione itens deliciosos do nosso cardápio!',
    btn_place_order: 'Enviar Pedido para Cozinha',
    btn_request_bill: 'Pedir Conta / Encerrar',
    title_call_waiter: 'Chamar Garçom',
    reason_assistance: 'Dúvida / Ajuda',
    reason_drinks: 'Pedir Bebidas',
    reason_utensils: 'Prato / Talher / Copo',
    reason_cleaning: 'Limpar Mesa',
    reason_other: 'Outro Assunto',
    btn_submit_call: 'Solicitar Atendimento',
    text_waiter_called: 'Garçom chamado com sucesso! Um atendente está a caminho de sua mesa.',
    text_active_table: 'Mesa',
    service_charge_label: 'Adicionar 10% opcional (Serviço)',
    payment_title: 'Pagamento da Conta',
    payment_choose_method: 'Escolha a forma de pagamento:',
    payment_pix: 'Pix (Instantâneo)',
    payment_card: 'Cartão (Máquina na mesa)',
    payment_cash: 'Dinheiro',
    payment_cashier: 'Pagar no Caixa',
    btn_pay_now: 'Concluir Pagamento',
    payment_success: 'Pagamento confirmado! Obrigado pela preferência e volte sempre!',
    promo_badge: 'Destaque',
    estimated_time: 'min',
    bestseller_badge: 'Mais vendido',
    artesanal_badge: 'Artesanal',
    vegan_badge: 'Vegano',
    exclusive_badge: 'Exclusivo',
    cart_title: 'Sua Sacola',
    cart_empty: 'Sacola vazia',
    cart_total_items: 'itens',
    bill_title: 'Sua Conta',
    bill_subtotal: 'Subtotal',
    bill_service: 'Taxa de Serviço (10%)',
    bill_total: 'Total Geral',
    bill_your_items: 'Seus Consumos',
    bill_status_unpaid: 'Aguardando Pagamento',
    bill_status_paid: 'Pago',
    initial_welcome: 'Bem-vindo ao MenuMesa!',
    initial_join_shared: 'Entrar em Comanda Compartilhada',
    initial_create_shared: 'Criar Comanda Compartilhada',
    initial_start: 'Iniciar Atendimento',
    initial_table: 'Mesa selecionada',
    initial_sub: 'Digite seu nome para iniciar sua experiência digital',
    custom_observation_placeholder: 'Ex: Sem cebola, ponto da carne, etc...'
  },
  en: {
    app_title: 'MenuMesa POS & Digital Menu',
    app_subtitle: 'React v19 + Tailwind v4 • Reactive Demo',
    dica_title: 'Tip:',
    dica_body: 'Open the Client, place orders, and watch them update in Kitchen and Manager instantly!',
    switch_client: 'Client',
    switch_admin: 'Manager Panel',
    switch_kitchen: 'Kitchen (KDS)',
    switch_cashier: 'Cashier',
    tab_menu: 'Menu',
    tab_cart: 'Cart',
    tab_orders: 'My Orders',
    btn_add_to_order: 'Add to Order',
    btn_added: 'Added!',
    btn_added_to_order: 'Added to Order!',
    text_success_add_body: 'successfully added to your cart.',
    btn_call_waiter: 'Call Waiter',
    btn_view_bill: 'View Bill',
    search_placeholder: 'Search the menu...',
    category_todos: 'All',
    category_entradas: 'Appetizers',
    category_burgers: 'Burgers',
    category_bebidas: 'Drinks',
    category_sobremesas: 'Desserts',
    title_categories: 'Categories',
    comanda_individual: 'Individual',
    comanda_shared: 'Shared',
    comanda_title: 'Your Tab',
    comanda_type_selection: 'Choose tab type:',
    label_name: 'Your Name',
    label_observation: 'Observations',
    label_extras: 'Extras / Add-ons',
    text_total: 'Total',
    btn_confirm: 'Confirm',
    btn_cancel: 'Cancel',
    btn_close: 'Close',
    btn_back: 'Back',
    text_empty_cart: 'Your cart is empty. Add delicious items from our menu!',
    btn_place_order: 'Send Order to Kitchen',
    btn_request_bill: 'Request Bill / Close Tab',
    title_call_waiter: 'Call Waiter',
    reason_assistance: 'Question / Help',
    reason_drinks: 'Order Drinks',
    reason_utensils: 'Plates / Cutlery / Glass',
    reason_cleaning: 'Clean Table',
    reason_other: 'Other Topic',
    btn_submit_call: 'Request Assistance',
    text_waiter_called: 'Waiter called successfully! A server is on their way to your table.',
    text_active_table: 'Table',
    service_charge_label: 'Add 10% optional service charge',
    payment_title: 'Bill Payment',
    payment_choose_method: 'Choose payment method:',
    payment_pix: 'Pix (Instant)',
    payment_card: 'Card (Terminal at table)',
    payment_cash: 'Cash',
    payment_cashier: 'Pay at Counter',
    btn_pay_now: 'Complete Payment',
    payment_success: 'Payment confirmed! Thank you for dining with us!',
    promo_badge: 'Featured',
    estimated_time: 'min',
    bestseller_badge: 'Bestseller',
    artesanal_badge: 'Craft',
    vegan_badge: 'Vegan',
    exclusive_badge: 'Exclusive',
    cart_title: 'Your Cart',
    cart_empty: 'Empty cart',
    cart_total_items: 'items',
    bill_title: 'Your Bill',
    bill_subtotal: 'Subtotal',
    bill_service: 'Service Charge (10%)',
    bill_total: 'Grand Total',
    bill_your_items: 'Your Consumption',
    bill_status_unpaid: 'Awaiting Payment',
    bill_status_paid: 'Paid',
    initial_welcome: 'Welcome to MenuMesa!',
    initial_join_shared: 'Join Shared Tab',
    initial_create_shared: 'Create Shared Tab',
    initial_start: 'Start Dining',
    initial_table: 'Selected Table',
    initial_sub: 'Enter your name to start your digital experience',
    custom_observation_placeholder: 'E.g., No onions, medium rare, etc...'
  },
  es: {
    app_title: 'MenuMesa TPV & Menú Digital',
    app_subtitle: 'React v19 + Tailwind v4 • Demo Reactiva',
    dica_title: 'Consejo:',
    dica_body: '¡Abra el Cliente, realice pedidos y vea cómo se actualizan en Cocina y Gerente al instante!',
    switch_client: 'Cliente',
    switch_admin: 'Panel de Gerente',
    switch_kitchen: 'Cocina (KDS)',
    switch_cashier: 'Caja',
    tab_menu: 'Menú',
    tab_cart: 'Carrito',
    tab_orders: 'Mis Pedidos',
    btn_add_to_order: 'Añadir',
    btn_added: '¡Añadido!',
    btn_added_to_order: '¡Añadido al Pedido!',
    text_success_add_body: 'añadido correctamente a su carrito.',
    btn_call_waiter: 'Llamar Camarero',
    btn_view_bill: 'Ver Cuenta',
    search_placeholder: 'Buscar en el menú...',
    category_todos: 'Todos',
    category_entradas: 'Entrantes',
    category_burgers: 'Burguesas',
    category_bebidas: 'Bebidas',
    category_sobremesas: 'Postres',
    title_categories: 'Categorías',
    comanda_individual: 'Individual',
    comanda_shared: 'Compartida',
    comanda_title: 'Su Cuenta',
    comanda_type_selection: 'Elija el tipo de cuenta:',
    label_name: 'Su Nombre',
    label_observation: 'Observaciones',
    label_extras: 'Adicionales',
    text_total: 'Total',
    btn_confirm: 'Confirmar',
    btn_cancel: 'Cancelar',
    btn_close: 'Cerrar',
    btn_back: 'Volver',
    text_empty_cart: 'Su carrito está vacío. ¡Añada deliciosos artículos de nuestro menú!',
    btn_place_order: 'Enviar Pedido a Cocina',
    btn_request_bill: 'Pedir la Cuenta / Cerrar Mesa',
    title_call_waiter: 'Llamar Camarero',
    reason_assistance: 'Duda / Ayuda',
    reason_drinks: 'Pedir Bebidas',
    reason_utensils: 'Plato / Cubiertos / Vaso',
    reason_cleaning: 'Limpiar Mesa',
    reason_other: 'Otro Asunto',
    btn_submit_call: 'Solicitar Atención',
    text_waiter_called: '¡Camarero llamado con éxito! Un asistente está en camino a su mesa.',
    text_active_table: 'Mesa',
    service_charge_label: 'Añadir 10% opcional (Servicio)',
    payment_title: 'Pago de la Cuenta',
    payment_choose_method: 'Elija el método de pago:',
    payment_pix: 'Pix (Instantáneo)',
    payment_card: 'Tarjeta (Máquina en mesa)',
    payment_cash: 'Efectivo',
    payment_cashier: 'Pagar en Caja',
    btn_pay_now: 'Completar Pago',
    payment_success: '¡Pago confirmado! ¡Gracias por su preferencia y vuelva pronto!',
    promo_badge: 'Destacado',
    estimated_time: 'min',
    bestseller_badge: 'Más vendido',
    artesanal_badge: 'Artesanal',
    vegan_badge: 'Vegano',
    exclusive_badge: 'Exclusivo',
    cart_title: 'Su Carrito',
    cart_empty: 'Carrito vacío',
    cart_total_items: 'artículos',
    bill_title: 'Su Cuenta',
    bill_subtotal: 'Subtotal',
    bill_service: 'Cargo de Servicio (10%)',
    bill_total: 'Total General',
    bill_your_items: 'Su Consumo',
    bill_status_unpaid: 'Esperando Pago',
    bill_status_paid: 'Pagado',
    initial_welcome: '¡Bienvenido a MenuMesa!',
    initial_join_shared: 'Unirse a Cuenta Compartida',
    initial_create_shared: 'Crear Cuenta Compartida',
    initial_start: 'Iniciar Experiencia',
    initial_table: 'Mesa seleccionada',
    initial_sub: 'Ingrese su nombre para iniciar su experiencia digital',
    custom_observation_placeholder: 'Ej: Sin cebolla, término medio, etc...'
  }
};
