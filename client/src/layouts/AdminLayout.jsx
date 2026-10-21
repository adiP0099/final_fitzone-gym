import { Outlet } from 'react-router-dom'
import DashboardLayout from './DashboardLayout.jsx'

export default function AdminLayout() {
  return <DashboardLayout kind="admin"><Outlet /></DashboardLayout>
}
