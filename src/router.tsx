import type { ComponentType } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'
import { SiteLayout } from './layouts/SiteLayout'
import { marketplaceReady } from './lib/env'
import { PageLoader, RouteError } from './components/RouteStates'

// Each page is its own chunk so the landing page doesn't ship the planner.
const page = (load: () => Promise<{ default: ComponentType }>) => async () => ({
  Component: (await load()).default,
})

const marketPage = (load: () => Promise<{ default: ComponentType }>) =>
  page(marketplaceReady ? load : () => import('./pages/market/Unavailable'))

export const router = createBrowserRouter([
  {
    element: <SiteLayout />,
    errorElement: <RouteError />,
    hydrateFallbackElement: <PageLoader />,
    children: [
      { index: true, lazy: page(() => import('./pages/Landing')) },
      { path: 'events', lazy: marketPage(() => import('./pages/market/Events')) },
      { path: 'e/:slug', lazy: marketPage(() => import('./pages/market/EventPage')) },
      { path: 'c/:contestId', lazy: marketPage(() => import('./pages/contest/ContestPage')) },
      { path: 'c/:contestId/:number', lazy: marketPage(() => import('./pages/contest/ContestantPage')) },
      { path: 'e/:slug/vote', lazy: marketPage(() => import('./pages/contest/ContestPage')) },
      { path: 'e/:slug/vote/:number', lazy: marketPage(() => import('./pages/contest/ContestantPage')) },
      { path: 'login', lazy: page(() => import('./pages/market/SignIn')) },
      { path: 'signin', lazy: page(() => import('./pages/market/SignIn')) },
      { path: 'checkout/return', lazy: marketPage(() => import('./pages/market/CheckoutReturn')) },
      { path: 'account/tickets', lazy: marketPage(() => import('./pages/market/MyTickets')) },
      { path: 'account/phone', lazy: page(() => import('./pages/market/VerifyPhone')) },
      { path: 'sell', lazy: marketPage(() => import('./pages/seller/Sell')) },
      { path: 'seller', lazy: marketPage(() => import('./pages/seller/SellerHome')) },
      { path: 'seller/events/:id', lazy: marketPage(() => import('./pages/seller/SellerEvent')) },
      { path: 'admin', lazy: marketPage(() => import('./pages/admin/Admin')) },
      { path: 'legal/:doc', lazy: page(() => import('./pages/legal/LegalPage')) },
    ],
  },
  { path: 'scan/:eventId', errorElement: <RouteError />, lazy: marketPage(() => import('./pages/door/Scanner')) },
  {
    path: 'app',
    element: <AppLayout />,
    errorElement: <RouteError />,
    hydrateFallbackElement: <PageLoader />,
    children: [
      { index: true, lazy: page(() => import('./pages/Dashboard')) },
      { path: 'account', lazy: page(() => import('./pages/PlannerAccount')) },
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
          { path: 'committee', lazy: page(() => import('./pages/event/Committee')) },
          { path: 'asoebi', lazy: page(() => import('./pages/event/Asoebi')) },
        ],
      },
      { path: 'vendors', lazy: page(() => import('./pages/Vendors')) },
    ],
  },
  { path: '*', lazy: page(() => import('./pages/NotFound')) },
])
