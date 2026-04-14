import { AlertsManager } from '@/components/alerts/AlertsManager';

export default function AlertsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">התראות / Alerts</h1>
      <AlertsManager />
    </div>
  );
}
