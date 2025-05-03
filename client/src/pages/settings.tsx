
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { storage } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const [settings, setSettings] = useState<any>({
    speechRate: 1,
    fontSize: 16,
    theme: 'light'
  });
  const { toast } = useToast();

  useEffect(() => {
    const savedSettings = storage.getSettings();
    if (savedSettings) {
      setSettings(savedSettings);
    }
  }, []);

  const handleSave = () => {
    storage.updateSettings(settings);
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated"
    });
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-medium mb-3">Reading Preferences</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Speech Rate</label>
              <select
                className="w-full p-2 border rounded"
                value={settings.speechRate}
                onChange={(e) => setSettings({...settings, speechRate: parseFloat(e.target.value)})}
              >
                <option value="0.5">0.5x</option>
                <option value="0.75">0.75x</option>
                <option value="1">1x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2x</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Font Size</label>
              <input
                type="range"
                min="12"
                max="24"
                value={settings.fontSize}
                onChange={(e) => setSettings({...settings, fontSize: parseInt(e.target.value)})}
                className="w-full"
              />
              <span className="text-sm">{settings.fontSize}px</span>
            </div>
          </div>
        </div>

        <Button onClick={handleSave}>Save Settings</Button>
      </div>
    </div>
  );
}
