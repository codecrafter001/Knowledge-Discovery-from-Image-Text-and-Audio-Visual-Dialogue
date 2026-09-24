import React, { createContext, useContext, useState, useEffect } from 'react';
import type { AppSettings, IngestedDocument, Entity, Triplet, EvidenceItem } from '../types';
import { INITIAL_SETTINGS } from '../services/mockData';
import { api } from '../services/api';

export type PageRoute = 
  | 'dashboard' 
  | 'upload' 
  | 'documents' 
  | 'pipeline' 
  | 'explorer' 
  | 'search' 
  | 'evidence' 
  | 'graph' 
  | 'evaluation' 
  | 'settings';

interface ToastNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  duration?: number;
}

interface AppContextType {
  currentPage: PageRoute;
  setCurrentPage: (page: PageRoute) => void;
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  apiStatus: 'online' | 'offline' | 'checking';
  apiLatency: number;
  checkApiHealth: () => Promise<void>;
  notifications: ToastNotification[];
  addNotification: (type: 'info' | 'success' | 'warning' | 'error', message: string) => void;
  removeNotification: (id: string) => void;
  // Deep inspection selection
  selectedDocument: IngestedDocument | null;
  setSelectedDocument: (doc: IngestedDocument | null) => void;
  selectedEntity: Entity | null;
  setSelectedEntity: (ent: Entity | null) => void;
  selectedTriplet: Triplet | null;
  setSelectedTriplet: (trip: Triplet | null) => void;
  selectedEvidence: EvidenceItem | null;
  setSelectedEvidence: (ev: EvidenceItem | null) => void;
  // Quick jump helper
  inspectEntityInGraph: (entity: Entity) => void;
  inspectEvidenceForTriplet: (triplet: Triplet) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPage, setCurrentPage] = useState<PageRoute>('dashboard');
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('kd_app_settings');
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
  });
  const [apiStatus, setApiStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  const [apiLatency, setApiLatency] = useState<number>(0);
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  // Selection state
  const [selectedDocument, setSelectedDocument] = useState<IngestedDocument | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [selectedTriplet, setSelectedTriplet] = useState<Triplet | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('kd_app_settings', JSON.stringify(updated));
      if (newSettings.useMockBackend !== undefined) {
        api.setMockMode(newSettings.useMockBackend);
      }
      return updated;
    });
  };

  const addNotification = (type: 'info' | 'success' | 'warning' | 'error', message: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const checkApiHealth = async () => {
    setApiStatus('checking');
    const result = await api.checkHealth();
    setApiStatus(result.status);
    setApiLatency(result.latencyMs);
  };

  useEffect(() => {
    api.setMockMode(settings.useMockBackend);
    checkApiHealth();
    // Auto-ping every 30s
    const interval = setInterval(checkApiHealth, 30000);
    return () => clearInterval(interval);
  }, [settings.useMockBackend]);

  const inspectEntityInGraph = (entity: Entity) => {
    setSelectedEntity(entity);
    setCurrentPage('graph');
  };

  const inspectEvidenceForTriplet = (triplet: Triplet) => {
    setSelectedTriplet(triplet);
    setCurrentPage('evidence');
  };

  return (
    <AppContext.Provider
      value={{
        currentPage,
        setCurrentPage,
        settings,
        updateSettings,
        apiStatus,
        apiLatency,
        checkApiHealth,
        notifications,
        addNotification,
        removeNotification,
        selectedDocument,
        setSelectedDocument,
        selectedEntity,
        setSelectedEntity,
        selectedTriplet,
        setSelectedTriplet,
        selectedEvidence,
        setSelectedEvidence,
        inspectEntityInGraph,
        inspectEvidenceForTriplet,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
