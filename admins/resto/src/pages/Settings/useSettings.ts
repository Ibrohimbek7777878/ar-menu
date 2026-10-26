import { useEffect, useState, useCallback } from 'react';
import { fetchSettings, updateSettings, type ShopSettings, type ShopSettingsPayload } from './api';

export function useSettings() {
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSettings();
      setSettings(data);
    } catch (err: any) {
      setError(err?.message || 'Sozlamalarni yuklab bo\'lmadi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSettings = async (data: ShopSettingsPayload) => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);
      const updated = await updateSettings(data);
      setSettings(updated);
      setSuccessMessage('Sozlamalar muvaffaqiyatli saqlandi');
      setTimeout(() => setSuccessMessage(null), 4000);
      return { success: true };
    } catch (err: any) {
      const msg = err?.message || 'Sozlamalarni saqlashda xatolik yuz berdi';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setSaving(false);
    }
  };

  return {
    settings,
    loading,
    saving,
    error,
    successMessage,
    refresh: loadSettings,
    saveSettings,
  };
}
