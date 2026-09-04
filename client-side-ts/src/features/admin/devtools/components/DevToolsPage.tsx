import { useState } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  Code,
  Mail,
  Activity,
  Users,
  Zap,
  Clock,
  Shield,
  Database,
  KeyRound,
  Inbox,
  FileCheck,
  ScrollText,
  ShoppingBag,
  FileText,
  Download,
  TrendingUp,
  AlertTriangle,
  Settings as SettingsIcon,
  AlertCircle,
  List,
  Receipt,
  Workflow,
  Bot,
} from "lucide-react";
import { EmailQueuePanel } from "../components/EmailQueuePanel";
import { HealthStatsPanel } from "../components/HealthStatsPanel";
import { SessionManagerPanel } from "../components/SessionManagerPanel";
import { QuickActionsPanel } from "../components/QuickActionsPanel";
import { ApiTesterPanel } from "../components/ApiTesterPanel";
import { CronMonitorPanel } from "../components/CronMonitorPanel";
import { EnvInspectorPanel } from "../components/EnvInspectorPanel";
import { RateLimitPanel } from "../components/RateLimitPanel";
import { DbPerformancePanel } from "../components/DbPerformancePanel";
import { OfficerAccessPanel } from "../components/OfficerAccessPanel";
import { SuspendedOfficersPanel } from "../components/SuspendedOfficersPanel";
import { PendingRequestsPanel } from "../components/PendingRequestsPanel";
import { PermissionMatrixPanel } from "../components/PermissionMatrixPanel";
import { ActivityLogPanel } from "../components/ActivityLogPanel";
import { OrderManagerPanel } from "../components/OrderManagerPanel";
import { CertificatePanel } from "../components/CertificatePanel";
import { DataExportPanel } from "../components/DataExportPanel";
import { RevenuePanel } from "../components/RevenuePanel";
import { StockAlertPanel } from "../components/StockAlertPanel";
import { SettingsPanel } from "../components/SettingsPanel";
import { ServerErrorPanel } from "../components/ServerErrorPanel";
import { BruteForcePanel } from "../components/BruteForcePanel";
import { EndpointInventoryPanel } from "../components/EndpointInventoryPanel";
import { RefundQueuePanel } from "../components/RefundQueuePanel";
import { AutomationPanel } from "../components/AutomationPanel";
import { JobFormDialog } from "../components/JobFormDialog";
import { NoetixAIPanel } from "../components/NoetixAIPanel";
import type { AutomationJob } from "../types/automation.types";

const sections = [
  { key: "diagnostics", label: "Diagnostics" },
  { key: "operations", label: "Operations" },
  { key: "security", label: "Security" },
];

const sectionPanels: Record<string, PanelTab[]> = {
  diagnostics: [
    { key: "email", label: "Email Queue", icon: Mail },
    { key: "health", label: "Health", icon: Activity },
    { key: "cron", label: "Cron Monitor", icon: Clock },
    { key: "env", label: "Env Inspector", icon: Shield },
    { key: "ratelimit", label: "Rate Limiter", icon: Shield },
    { key: "dbperf", label: "DB Performance", icon: Database },
    { key: "activity", label: "Activity Log", icon: ScrollText },
    { key: "noetix-ai", label: "Noetix AI", icon: Bot },
    { key: "certificates", label: "Certificate Templates", icon: FileText },
    { key: "revenue", label: "Revenue Dashboard", icon: TrendingUp },
    { key: "stock-alerts", label: "Stock Alerts", icon: AlertTriangle },
    { key: "settings", label: "Settings", icon: SettingsIcon },
    { key: "errors", label: "Server Errors", icon: AlertCircle },
  ],
  operations: [
    { key: "sessions", label: "Sessions", icon: Users },
    { key: "actions", label: "Quick Actions", icon: Zap },
    { key: "tester", label: "API Tester", icon: Code },
    { key: "orders", label: "Order Manager", icon: ShoppingBag },
    { key: "data-export", label: "Data Export", icon: Download },
    { key: "endpoint-inventory", label: "API Endpoints", icon: List },
    { key: "refunds", label: "Refund Queue", icon: Receipt },
    { key: "automation", label: "Automation", icon: Workflow },
  ],
  security: [
    { key: "officers", label: "Officer Access", icon: KeyRound },
    { key: "suspended", label: "Suspended Officers", icon: Shield },
    { key: "pending", label: "Pending Requests", icon: Inbox },
    { key: "matrix", label: "Permission Matrix", icon: FileCheck },
    { key: "brute-force", label: "Brute Force", icon: AlertTriangle },
  ],
};

const getPanels = (section: string): PanelTab[] =>
  sectionPanels[section] || sectionPanels.diagnostics;

export const DevToolsPage = () => {
  const [activeSection, setActiveSection] = useState("diagnostics");
  const [activeTab, setActiveTab] = useState("email");
  const [jobFormOpen, setJobFormOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<AutomationJob | null>(null);
  const currentPanels = getPanels(activeSection);
  const displayActiveTab = currentPanels.some((p) => p.key === activeTab)
    ? activeTab
    : (currentPanels[0]?.key ?? "email");

  const handleCreateJob = () => {
    setEditingJob(null);
    setJobFormOpen(true);
  };

  const handleJobSuccess = () => {
    setJobFormOpen(false);
    setEditingJob(null);
  };

  return (
    <div className="bg-background flex min-h-full flex-1 flex-col text-[#333] [&_button:disabled]:cursor-not-allowed [&_button:not(:disabled)]:cursor-pointer">
      <header className="px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Developer Tools</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Server diagnostics, operational utilities, and admin security controls
        </p>
      </header>

      <div className="px-4 pb-8 sm:px-6 lg:px-8">
        <Tabs value={activeSection} onValueChange={setActiveSection}>
          <div className="mb-5 flex w-full gap-6 overflow-x-auto border-b border-[#eeeeee] sm:w-auto sm:gap-8">
            {sections.map((section) => (
              <button
                key={section.key}
                type="button"
                onClick={() => setActiveSection(section.key)}
                className={`relative shrink-0 cursor-pointer pb-3 text-sm ${
                  activeSection === section.key
                    ? "font-medium text-[#1c9dde]"
                    : "text-[#858585]"
                }`}
              >
                {section.label}
                {activeSection === section.key && (
                  <span className="absolute right-0 bottom-0 left-0 h-0.5 bg-[#1c9dde]" />
                )}
              </button>
            ))}
          </div>

          <TabsContent value="diagnostics" className="mt-0 space-y-5">
            <SectionHeader
              title="Diagnostics"
              subtitle="Server health, environment, database, and background jobs."
            />
            <TabBar
              tabs={currentPanels}
              activeTab={displayActiveTab}
              onChange={(tab) => {
                setActiveTab(tab);
                setActiveSection("diagnostics");
              }}
            />
            <PanelRenderer activeTab={displayActiveTab} onCreateJob={handleCreateJob} />
          </TabsContent>

          <TabsContent value="operations" className="mt-0 space-y-5">
            <SectionHeader
              title="Operations"
              subtitle="Queues, sessions, scheduled tasks, and diagnostic probes."
            />
            <TabBar
              tabs={currentPanels}
              activeTab={displayActiveTab}
              onChange={(tab) => {
                setActiveTab(tab);
                setActiveSection("operations");
              }}
            />
            <PanelRenderer activeTab={displayActiveTab} onCreateJob={handleCreateJob} />
          </TabsContent>

          <TabsContent value="security" className="mt-0 space-y-5">
            <SectionHeader
              title="Security"
              subtitle="Role management, session invalidation, access reviews, and pending grants."
            />
            <TabBar
              tabs={currentPanels}
              activeTab={displayActiveTab}
              onChange={(tab) => {
                setActiveTab(tab);
                setActiveSection("security");
              }}
            />
            <PanelRenderer activeTab={displayActiveTab} onCreateJob={handleCreateJob} />
          </TabsContent>
        </Tabs>
        <JobFormDialog
          open={jobFormOpen}
          onClose={() => {
            setJobFormOpen(false);
            setEditingJob(null);
          }}
          job={editingJob}
          onSuccess={handleJobSuccess}
        />
      </div>
    </div>
  );
};

interface PanelTab {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SectionHeaderProps {
  title: string;
  subtitle: string;
}

const SectionHeader = ({ title, subtitle }: SectionHeaderProps) => (
  <div className="space-y-1">
    <h2 className="text-lg font-semibold text-[#1c9dde]">{title}</h2>
    <p className="text-sm text-[#777]">{subtitle}</p>
  </div>
);

interface TabBarProps {
  tabs: PanelTab[];
  activeTab: string;
  onChange: (key: string) => void;
}

const TabBar = ({ tabs, activeTab, onChange }: TabBarProps) => (
  <div className="flex w-full [scrollbar-width:none] gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] sm:w-auto sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
    {tabs.map((tab) => (
      <button
        key={tab.key}
        type="button"
        onClick={() => onChange(tab.key)}
        className={`flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm ${
          activeTab === tab.key
            ? "border-[#1c9dde] bg-blue-50 text-[#1c9dde]"
            : "border-[#e5e5e5] bg-white text-gray-500"
        }`}
      >
        <tab.icon className="h-4 w-4 shrink-0" />
        {tab.label}
      </button>
    ))}
  </div>
);

interface PanelRendererProps {
  activeTab: string;
  onCreateJob: () => void;
}

const PanelRenderer = ({ activeTab, onCreateJob }: PanelRendererProps) => {
  switch (activeTab) {
    case "email":
      return <EmailQueuePanel />;
    case "health":
      return <HealthStatsPanel />;
    case "cron":
      return <CronMonitorPanel />;
    case "env":
      return <EnvInspectorPanel />;
    case "ratelimit":
      return <RateLimitPanel />;
    case "dbperf":
      return <DbPerformancePanel />;
    case "activity":
      return <ActivityLogPanel />;
    case "certificates":
      return <CertificatePanel />;
    case "revenue":
      return <RevenuePanel />;
    case "stock-alerts":
      return <StockAlertPanel />;
    case "settings":
      return <SettingsPanel />;
    case "errors":
      return <ServerErrorPanel />;
    case "endpoint-inventory":
      return <EndpointInventoryPanel />;
    case "refunds":
      return <RefundQueuePanel />;
    case "sessions":
      return <SessionManagerPanel />;
    case "actions":
      return <QuickActionsPanel />;
    case "tester":
      return <ApiTesterPanel />;
    case "orders":
      return <OrderManagerPanel />;
    case "data-export":
      return <DataExportPanel />;
    case "officers":
      return <OfficerAccessPanel />;
    case "suspended":
      return <SuspendedOfficersPanel />;
    case "pending":
      return <PendingRequestsPanel />;
    case "matrix":
      return <PermissionMatrixPanel />;
    case "brute-force":
      return <BruteForcePanel />;
    case "automation":
      return <AutomationPanel onCreateJob={onCreateJob} />;
    case "noetix-ai":
      return <NoetixAIPanel />;
    default:
      return null;
  }
};
