import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import { useAuthStore } from './stores/auth'
import { useSetupStore } from './stores/setup'
import { useBrandingStore } from './stores/branding'
import ToastContainer from './components/ui/Toast'
import PageTransition from './components/PageTransition'

// Layouts (always loaded)
import PublicLayout from './layouts/PublicLayout'
import PortalLayout from './layouts/PortalLayout'
import AdminLayout from './layouts/AdminLayout'

// Setup page (always loaded — needed before anything else)
import SetupAdmin from './pages/setup/SetupAdmin'

// --- Lazy-loaded: Public pages ---
const Home = lazy(() => import('./pages/public/Home'))
const Pricing = lazy(() => import('./pages/public/Pricing'))
const About = lazy(() => import('./pages/public/About'))
const Contact = lazy(() => import('./pages/public/Contact'))
const Terms = lazy(() => import('./pages/public/Terms'))
const Privacy = lazy(() => import('./pages/public/Privacy'))
const RefundPolicy = lazy(() => import('./pages/public/RefundPolicy'))
const CancellationPolicy = lazy(() => import('./pages/public/CancellationPolicy'))
const ProductDetail = lazy(() => import('./pages/public/ProductDetail'))
const VpsHosting = lazy(() => import('./pages/public/VpsHosting'))
const CheckoutSuccess = lazy(() => import('./pages/public/CheckoutSuccess'))
const CheckoutCancel = lazy(() => import('./pages/public/CheckoutCancel'))
const Login = lazy(() => import('./pages/auth/Login'))
const Register = lazy(() => import('./pages/auth/Register'))
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'))

// --- Lazy-loaded: Portal pages ---
const Dashboard = lazy(() => import('./pages/portal/Dashboard'))
const Orders = lazy(() => import('./pages/portal/Orders'))
const OrderDetail = lazy(() => import('./pages/portal/OrderDetail'))
const Services = lazy(() => import('./pages/portal/Services'))
const ServiceDetail = lazy(() => import('./pages/portal/ServiceDetail'))
const Invoices = lazy(() => import('./pages/portal/Invoices'))
const InvoiceDetail = lazy(() => import('./pages/portal/InvoiceDetail'))
const BillingMethods = lazy(() => import('./pages/portal/BillingMethods'))
const Security = lazy(() => import('./pages/portal/Security'))
const Cart = lazy(() => import('./pages/portal/Cart'))

// --- Lazy-loaded: Admin pages ---
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'))
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'))
const AdminInvoices = lazy(() => import('./pages/admin/AdminInvoices'))
const AdminPayments = lazy(() => import('./pages/admin/AdminPayments'))
const AdminCustomers = lazy(() => import('./pages/admin/AdminCustomers'))
const AdminSystem = lazy(() => import('./pages/admin/AdminSystem'))
const AdminContent = lazy(() => import('./pages/admin/AdminContent'))
const AdminTemplates = lazy(() => import('./pages/admin/AdminTemplates'))
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (user && user.role !== 'admin') return <Navigate to="/portal/dashboard" replace />
  return <>{children}</>
}

function SetupGuard({ children }: { children: React.ReactNode }) {
  const { needsSetup, isChecking } = useSetupStore()
  const location = useLocation()

  if (isChecking || needsSetup === null) return null

  if (needsSetup && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />
  }

  if (!needsSetup && location.pathname === '/setup') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export default function App() {
  const { loadUser, token } = useAuthStore()
  const { checkSetupStatus } = useSetupStore()
  const { fetchBranding } = useBrandingStore()

  useEffect(() => {
    checkSetupStatus()
    fetchBranding()
  }, [checkSetupStatus, fetchBranding])

  useEffect(() => {
    if (token) loadUser()
  }, [token, loadUser])

  return (
    <SetupGuard>
      <Suspense fallback={<PageLoader />}>
        <PageTransition>
        <Routes>
          {/* Setup page */}
          <Route path="/setup" element={<SetupAdmin />} />

          {/* Public pages */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
            <Route path="/cancellation-policy" element={<CancellationPolicy />} />
            <Route path="/vps" element={<VpsHosting />} />
            <Route path="/vps/:slug" element={<ProductDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/checkout/success" element={<CheckoutSuccess />} />
            <Route path="/checkout/cancel" element={<CheckoutCancel />} />
          </Route>

          {/* Portal (authenticated) */}
          <Route element={<ProtectedRoute><PortalLayout /></ProtectedRoute>}>
            <Route path="/portal/dashboard" element={<Dashboard />} />
            <Route path="/portal/orders" element={<Orders />} />
            <Route path="/portal/orders/:id" element={<OrderDetail />} />
            <Route path="/portal/services" element={<Services />} />
            <Route path="/portal/services/:id" element={<ServiceDetail />} />
            <Route path="/portal/invoices" element={<Invoices />} />
            <Route path="/portal/invoices/:id" element={<InvoiceDetail />} />
            <Route path="/portal/billing" element={<BillingMethods />} />
            <Route path="/portal/security" element={<Security />} />
            <Route path="/portal/cart" element={<Cart />} />
          </Route>

          {/* Admin */}
          <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/products" element={<AdminProducts />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/invoices" element={<AdminInvoices />} />
            <Route path="/admin/payments" element={<AdminPayments />} />
            <Route path="/admin/customers" element={<AdminCustomers />} />
            <Route path="/admin/system" element={<AdminSystem />} />
            <Route path="/admin/content" element={<AdminContent />} />
            <Route path="/admin/templates" element={<AdminTemplates />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </PageTransition>
      </Suspense>
      <ToastContainer />
    </SetupGuard>
  )
}
