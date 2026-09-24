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
    children: [
      { index: true, lazy: page(() => import('./pages/Landing')) },
      { path: 'events', lazy: page(() => import('./pages/market/Events')) },
      { path: 'e/:slug', lazy: page(() => import('./pages/market/EventPage')) },
      { path: 'c/:contestId', lazy: page(() => import('./pages/contest/ContestPage')) },
      { path: 'c/:contestId/:number', lazy: page(() => import('./pages/contest/ContestantPage')) },
      { path: 'e/:slug/vote', lazy: page(() => import('./pages/contest/ContestPage')) },
      { path: 'e/:slug/vote/:number', lazy: page(() => import('./pages/contest/ContestantPage')) },
      { path: 'signin', lazy: page(() => import('./pages/market/SignIn')) },
      { path: 'checkout/return', lazy: page(() => import('./pages/market/CheckoutReturn')) },
      { path: 'account/tickets', lazy: page(() => import('./pages/market/MyTickets')) },
      { path: 'account/phone', lazy: page(() => import('./pages/market/VerifyPhone')) },
      { path: 'sell', lazy: page(() => import('./pages/seller/Sell')) },
      { path: 'seller', lazy: page(() => import('./pages/seller/SellerHome')) },
      { path: 'seller/events/:id', lazy: page(() => import('./pages/seller/SellerEvent')) },
      { path: 'admin', lazy: page(() => import('./pages/admin/Admin')) },
      { path: 'legal/:doc', lazy: page(() => import('./pages/legal/LegalPage')) },
    ],
  },
  { path: 'scan/:eventId', errorElement: <RouteError />, lazy: page(() => import('./pages/door/Scanner')) },
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
