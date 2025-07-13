
'use client'

import { Bell, Edit2, Lock, Plus, Save, Settings as SettingsIcon, Trash2, User, X, Loader2, Bot } from "lucide-react";
import { useEffect, useState } from "react";
import { AppSettings } from "@/types";
import { getAppSettings, updateAppSettings } from "@/app/actions";
import { useToast } from "../ui/use-toast";
import { Switch } from "../ui/switch";

export const Settings = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchSettings() {
      setLoading(true);
      const appSettings = await getAppSettings();
      setSettings(appSettings);
      setLoading(false);
    }
    fetchSettings();
  }, []);

  const handleToggle = (key: keyof AppSettings, value: boolean) => {
    if (settings) {
      setSettings({ ...settings, [key]: value });
    }
  };

  const handleSaveChanges = async () => {
    if (!settings) return;
    setIsSaving(true);
    const result = await updateAppSettings(settings);
    if (result.success) {
      toast({ title: "Settings Saved", description: "Your changes have been saved successfully."});
    } else {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
    setIsSaving(false);
  };

  if (loading) {
    return <div>Loading settings...</div>
  }

  return (
    <div className="bg-gray-900/80 border border-gray-700 rounded-xl p-6 backdrop-blur-lg">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-8">
        <SettingsIcon className="w-6 h-6 text-indigo-400" />
        <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
          Application Settings
        </h2>
      </div>

      <div className="space-y-8 divide-y divide-gray-700">
        {/* User Management */}
        <div className="pt-8 first:pt-0">
          <h3 className="text-lg font-medium flex items-center space-x-2 mb-4">
            <User className="w-5 h-5 text-indigo-400" />
            <span>User Settings</span>
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white">Allow New User Registrations</p>
              <p className="text-sm text-gray-400">
                If disabled, only existing users can log in.
              </p>
            </div>
            <Switch
              checked={settings?.registrationsOpen}
              onCheckedChange={(checked) => handleToggle('registrationsOpen', checked)}
              aria-label="Toggle user registrations"
            />
          </div>
        </div>

        {/* AI Settings */}
        <div className="pt-8">
            <h3 className="text-lg font-medium flex items-center space-x-2 mb-4">
                <Bot className="w-5 h-5 text-indigo-400" />
                <span>AI & Chatbot Settings</span>
            </h3>
            <div className="flex items-center justify-between">
                <div>
                <p className="text-white">Enable AI Chat Assistant ("Feedy")</p>
                <p className="text-sm text-gray-400">
                    If disabled, the AI will not respond to new messages.
                </p>
                </div>
                <Switch
                    checked={settings?.aiChatEnabled}
                    onCheckedChange={(checked) => handleToggle('aiChatEnabled', checked)}
                    aria-label="Toggle AI chat assistant"
                />
            </div>
        </div>
        
        {/* Save Settings */}
        <div className="pt-8 flex justify-end">
          <button 
            onClick={handleSaveChanges}
            disabled={isSaving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center space-x-2 transition-colors disabled:bg-gray-500"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4" />}
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};
