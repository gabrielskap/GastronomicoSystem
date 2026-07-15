// 1. Tipagens do banco + nomes de tabela + mapeadores
export * from './types';
export * from './tables';
export * from './mappers';

// 2. Serviços de dados (leituras e escritas — sem mock, só banco)
export * from './productsService';
export * from './tablesService';
export * from './comandasService';
export * from './ordersService';
export * from './callsService';
export * from './paymentsService';
export * from './usersService';
export * from './stockService';
export * from './cashService';
export * from './menuAdminService';

// 3. Hooks e componentes utilitários para feedback de interface
export * from './useApi';
export * from './ApiStatusHandler';
