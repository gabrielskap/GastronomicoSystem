/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MenuItem } from '../types';

export const INITIAL_MENU_ITEMS: MenuItem[] = [
  // ENTRADAS
  {
    id: 'ent-1',
    name: 'Batatas Rústicas com Trufa & Parmesão',
    description: 'Batatas rústicas douradas fritas à perfeição, finalizadas com azeite de trufas brancas, flor de sal e queijo parmesão ralado na hora.',
    price: 36.00,
    category: 'entradas',
    image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80',
    isAvailable: true,
    estimatedTimeMin: 12,
    tags: ['Favorito', 'Vegetariano', 'Para Compartilhar'],
    stock: 12
  },
  {
    id: 'ent-2',
    name: 'Croquete de Costela Defumada',
    description: '4 unidades de croquetes ultra cremosos de costela bovina defumada por 12 horas na lenha de macieira, servidos com maionese artesanal de siracha.',
    price: 38.00,
    category: 'entradas',
    image: 'https://images.unsplash.com/photo-1541532713592-79a0317b6b77?auto=format&fit=crop&w=600&q=80',
    isAvailable: true,
    estimatedTimeMin: 15,
    tags: ['Mais Vendido', 'Artesanal'],
    stock: 3
  },
  {
    id: 'ent-3',
    name: 'Duo de Bruschettas Clássicas',
    description: 'Fatias crocantes de pão de fermentação natural com tomate concassé marinado no azeite extravirgem, dentes de alho confitados e folhas frescas de manjericão roxo.',
    price: 32.00,
    originalPrice: 38.00,
    category: 'entradas',
    image: 'https://images.unsplash.com/photo-1572656631137-7935297eff55?auto=format&fit=crop&w=600&q=80',
    isAvailable: true,
    estimatedTimeMin: 10,
    tags: ['Clássico', 'Promoção'],
    stock: 8
  },

  // BURGERS
  {
    id: 'burg-1',
    name: 'Crown Smash Double Bacon',
    description: 'Dois smash blends de 90g de carne black angus prensados na chapa ultra quente, queijo cheddar inglês derretido, bastante bacon defumado crocante em tiras e molho especial crown butter no pão brioche amanteigado.',
    price: 46.00,
    category: 'burgers',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
    isAvailable: true,
    estimatedTimeMin: 15,
    tags: ['Premium', 'Mais Vendido'],
    stock: 25
  },
  {
    id: 'burg-2',
    name: 'Truffle & Mushroom Burger',
    description: 'Blend suculento de 150g assado na brasa, mix de cogumelos salteados (shimeji e paris), maionese trufada da casa, queijo gruyère derretido e rúcula baby, servidos no pão australiano tostado.',
    price: 49.00,
    category: 'burgers',
    image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80',
    isAvailable: true,
    estimatedTimeMin: 18,
    tags: ['Premium', 'Diferenciado'],
    stock: 0
  },
  {
    id: 'burg-3',
    name: 'Brie & Honey Burger',
    description: 'Blend bovino Black Angus de 150g, fatias generosas de queijo brie derretido, geleia de pimenta defumada, rúcula precoce e mel silvestre florado em pão brioche dourado na manteiga bordeaux.',
    price: 48.00,
    category: 'burgers',
    image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80',
    isAvailable: true,
    estimatedTimeMin: 16,
    tags: ['Exclusivo'],
    stock: 5
  },
  {
    id: 'burg-4',
    name: 'Veggies Green Earth',
    description: 'Hambúrguer artesanal de grão-de-bico com especiarias e raspas de limão siciliano, alface americana crocante, cebola roxa bem fina, picles artesanal e maionese vegana verde de ervas finas no pão integral.',
    price: 42.00,
    category: 'burgers',
    image: 'https://images.unsplash.com/photo-1525059696034-4967a8e1dca2?auto=format&fit=crop&w=600&q=80',
    isAvailable: true,
    estimatedTimeMin: 14,
    tags: ['Vegano', 'Leve'],
    stock: 14
  },

  // BEBIDAS
  {
    id: 'beb-1',
    name: 'Soda Italiana de Tangerina e Alecrim',
    description: 'Infusão gelada gaseificada de xarope artesanal de tangerina vermelha, água mineral com gás premium, gelo cristal e um ramo fresco de alecrim levemente tostado.',
    price: 16.00,
    category: 'bebidas',
    image: 'https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=600&q=80',
    isAvailable: true,
    estimatedTimeMin: 5,
    tags: ['Artesanal', 'Refrescante'],
    stock: 2
  },
  {
    id: 'beb-2',
    name: 'Craft Beer IPA Imperial 450ml',
    description: 'Chope artesanal local do estilo India Pale Ale. Cerveja potente com aromas cítricos de maracujá e grapefruit, amargor médio-alto e final persistente muito limpo.',
    price: 24.00,
    category: 'bebidas',
    image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=600&q=80',
    isAvailable: true,
    estimatedTimeMin: 4,
    tags: ['Alcoólico', 'Local'],
    stock: 18
  },
  {
    id: 'beb-3',
    name: 'Suco de Morango com Hortelã Natural',
    description: 'Suco 100% natural feito na hora com morangos orgânicos selecionados e folhas frescas de hortelã.',
    price: 14.00,
    category: 'bebidas',
    image: 'https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&w=600&q=80',
    isAvailable: true,
    estimatedTimeMin: 6,
    tags: ['Natural', 'Sem Açúcar'],
    stock: 9
  },

  // SOBREMESAS
  {
    id: 'sob-1',
    name: 'Cheesecake Desconstruída de Pistache',
    description: 'Creme aveludado de queijo mascarpone e cream cheese, crumble de biscoito amanteigado na base, calda artesanal de frutas vermelhas silvestres e finalização generosa com praliné de pistache torrado.',
    price: 34.00,
    category: 'sobremesas',
    image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=600&q=80',
    isAvailable: true,
    estimatedTimeMin: 8,
    tags: ['Favorito', 'Premium'],
    stock: 4
  },
  {
    id: 'sob-2',
    name: 'Duo Gateau com Sorvete Real',
    description: 'Massa macia e aerada de chocolate belga 70% cacau com recheio escorrendo quentinho, acompanhado de sorvete de baunilha de Madagascar e tuile crocante de amêndoas.',
    price: 32.00,
    category: 'sobremesas',
    image: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=600&q=80',
    isAvailable: true,
    estimatedTimeMin: 10,
    tags: ['Mais Vendido'],
    stock: 0
  }
];

export const EXTRA_ITEMS = [
  { id: 'ext-bacon', name: 'Bacon Artesanal Caramelizado', price: 6.00, category: 'burgers' },
  { id: 'ext-cheddar', name: 'Cheddar Inglês Extra', price: 5.00, category: 'burgers' },
  { id: 'ext-fries', name: 'Porção Pequena de Batata Rústica', price: 12.00, category: 'burgers' },
  { id: 'ext-molho', name: 'Maionese Especial Verde', price: 3.50, category: 'burgers' },
  { id: 'ext-pistache', name: 'Pistache Extra Ralado', price: 8.00, category: 'sobremesas' },
];
