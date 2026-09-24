import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { UploadPage } from './pages/UploadPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { PipelinePage } from './pages/PipelinePage';
import { ExplorerPage } from './pages/ExplorerPage';
import { SearchPage } from './pages/SearchPage';
import { EvidencePage } from './pages/EvidencePage';
import { GraphPage } from './pages/GraphPage';
import { EvaluationPage } from './pages/EvaluationPage';
import { SettingsPage } from './pages/SettingsPage';

const PageRenderer: React.FC = () => {
  const { currentPage } = useApp();

  switch (currentPage) {
    case 'dashboard':
      return <DashboardPage />;
    case 'upload':
      return <UploadPage />;
    case 'documents':
      return <DocumentsPage />;
    case 'pipeline':
      return <PipelinePage />;
    case 'explorer':
      return <ExplorerPage />;
    case 'search':
      return <SearchPage />;
    case 'evidence':
      return <EvidencePage />;
    case 'graph':
      return <GraphPage />;
    case 'evaluation':
      return <EvaluationPage />;
    case 'settings':
      return <SettingsPage />;
    default:
      return <DashboardPage />;
  }
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <AppLayout>
        <PageRenderer />
      </AppLayout>
    </AppProvider>
  );
};

export default App;
