import type { ComponentType } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { SiteLayout } from './layouts/SiteLayout'
import { PageLoader, RouteError } from './components/RouteStates'

// Each page is its own chunk so the landing page doesn't ship the planner.
const page = (load: () => Promise<{ default: ComponentType }>) => async () => ({
  Component: (await load()).default,
})

export const router = createBrowserRouter([
  {
    element: <SiteLayout />,
    errorElement: <RouteError />,
    hydrateFallbackElement: <PageLoader />,
    children: [{ index: true, lazy: page(() => import('./pages/Landing')) }],
  },
  {
    path: 'app',
    element: <AppLayout />,
    errorElement: <RouteError />,
    hydrateFallbackElement: <PageLoader />,
    children: [
      { index: true, lazy: page(() => import('./pages/Dashboard')) },
      { path: 'events/new', lazy: page(() => import('./pages/NewEvent')) },
      {
        path: 'events/:eventId',
        lazy: page(() => import('./pages/event/EventLayout')),
        children: [
          { index: true, lazy: page(() => import('./pages/event/Overview')) },
          { path: 'guests', lazy: page(() => import('./pages/event/Guests')) },
          { path: 'budget', lazy: page(() => import('./pages/event/Budget')) },
          { path: 'vendors', lazy: page(() => import('./pages/event/EventVendors')) },
          { path: 'schedule', lazy: page(() => import('./pages/event/Schedule')) },
          { path: 'asoebi', lazy: page(() => import('./pages/event/Asoebi')) },
        ],
      },
      { path: 'vendors', lazy: page(() => import('./pages/Vendors')) },
    ],
  },
  { path: '*', lazy: page(() => import('./pages/NotFound')) },
])
