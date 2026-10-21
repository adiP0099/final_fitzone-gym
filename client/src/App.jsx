import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import PublicLayout from './layouts/PublicLayout.jsx'
import DashboardLayout from './layouts/DashboardLayout.jsx'
import AdminLayout from './layouts/AdminLayout.jsx'
import HomePage from './pages/HomePage.jsx'
import AboutPage from './pages/AboutPage.jsx'
import PlansPage from './pages/PlansPage.jsx'
import TrainersPage from './pages/TrainersPage.jsx'
import ContactPage from './pages/ContactPage.jsx'
import AccountPage from './pages/AccountPage.jsx'
import MemberPages from './member/MemberPages.jsx'
import AdminPages from './admin/AdminPages.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import RequireAuth from './routes/RequireAuth.jsx'
import DumbbellScrollbar from './components/DumbbellScrollbar.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DumbbellScrollbar />
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/plans" element={<PlansPage />} />
            <Route path="/trainers" element={<TrainersPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/login" element={<AccountPage />} />
            <Route path="/register" element={<AccountPage />} />
          </Route>
          <Route element={<RequireAuth />}>
            <Route path="/member" element={<DashboardLayout kind="member" />}>
              <Route index element={<MemberPages page="overview" />} />
              <Route path="profile" element={<MemberPages page="profile" />} />
              <Route path="membership" element={<MemberPages page="membership" />} />
              <Route path="plans" element={<MemberPages page="plans" />} />
              <Route path="trainers" element={<MemberPages page="trainers" />} />
              <Route path="payments" element={<MemberPages page="payments" />} />
            </Route>
          </Route>
          <Route element={<RequireAuth adminOnly />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminPages page="overview" />} />
              <Route path="members" element={<AdminPages page="members" />} />
              <Route path="plans" element={<AdminPages page="plans" />} />
              <Route path="membership-requests" element={<AdminPages page="membership-requests" />} />
              <Route path="trainers" element={<AdminPages page="trainers" />} />
              <Route path="payments" element={<AdminPages page="payments" />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
