import { createBrowserRouter } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { AppLayout } from '../layouts/AppLayout';
import { WorkspaceLayout } from '../layouts/WorkspaceLayout';

import { LandingPage } from '../pages/landing/LandingPage';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { OnboardingPage } from '../pages/workspace/OnboardingPage';
import { DocumentListPage } from '../pages/documents/DocumentListPage';
import { DocumentDetailPage } from '../pages/documents/DocumentDetailPage';
import { SearchPage } from '../pages/search/SearchPage';
import { ChatPage } from '../pages/chat/ChatPage';
import { OrgSettingsPage } from '../pages/workspace/OrgSettingsPage';
import { NotFoundPage } from '../pages/error/NotFoundPage';
import { ROUTES } from './routes';

export const router = createBrowserRouter([
  // Public Enterprise Landing Page
  {
    path: ROUTES.HOME,
    element: <LandingPage />,
  },
  // Public auth routes
  {
    element: <AuthLayout />,
    children: [
      {
        path: ROUTES.LOGIN,
        element: <LoginPage />,
      },
      {
        path: ROUTES.REGISTER,
        element: <RegisterPage />,
      },
      {
        path: ROUTES.ONBOARDING,
        element: <OnboardingPage />,
      },
    ],
  },
  // Authenticated workspace routes
  {
    element: <WorkspaceLayout />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            path: ROUTES.DOCUMENTS,
            element: <DocumentListPage />,
          },
          {
            path: ROUTES.DOCUMENT_DETAIL,
            element: <DocumentDetailPage />,
          },
          {
            path: ROUTES.SEARCH,
            element: <SearchPage />,
          },
          {
            path: ROUTES.CHAT,
            element: <ChatPage />,
          },
          {
            path: ROUTES.CHAT_THREAD,
            element: <ChatPage />,
          },
          {
            path: ROUTES.SETTINGS,
            element: <OrgSettingsPage />,
          },
        ],
      },
    ],
  },
  // Global 404 catch-all
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
