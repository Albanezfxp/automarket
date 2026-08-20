export interface NavItem {
  label: string;
  to: string;
  icon: string;
}

export const PRIMARY_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: 'dashboard' },
  { label: 'Veículos', to: '/veiculos', icon: 'directions_car' },
  { label: 'Vendedores', to: '/vendedores', icon: 'group' },
  { label: 'Configurações', to: '/configuracoes', icon: 'settings' },
];
