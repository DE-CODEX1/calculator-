import { VaultItem } from '../types';

const STORAGE_KEY = 'secret_calc_vault_data';

export const getVaultItems = (): VaultItem[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to load vault items', error);
    return [];
  }
};

export const saveVaultItem = (item: VaultItem): boolean => {
  try {
    const currentItems = getVaultItems();
    const newItems = [item, ...currentItems];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
    return true;
  } catch (error) {
    console.error('Failed to save item - likely quota exceeded', error);
    return false;
  }
};

export const removeVaultItem = (id: string): void => {
  const currentItems = getVaultItems();
  const newItems = currentItems.filter(item => item.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
};
