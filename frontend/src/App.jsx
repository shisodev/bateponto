import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'

import Login from './pages/Login'
import AdminLayout from './components/layout/AdminLayout'
import EmployeeLayout from './components/layout/EmployeeLayout'

// Admin pages
import AdminDashboard from './pages/admin/Dashboard'
import AdminEmployees from './pages/admin/Employees'
import AdminTimeRecords from './pages/admin/TimeRecords'
import AdminSchedules from './pages/admin/Schedules'
import AdminAdjustments from './pages/admin/Adjustments'
import AdminReports from './pages/admin/Reports'

// Employee pages
import EmployeeDashboard from './pages/employee/Dashboard'
import EmployeeHistory from './pages/employee/History'
import EmployeeSchedule from './pages/employee/Schedule'
import EmployeeAdjustments from './pages/employee/AdjustmentRequest'

function RequireAuth({ children, adminOnly = false }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && user.role !== 'admin') return <Navigate to="/employee" replace />
  return children
}

function RootRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'admin') return <Navigate to="/admin" replace />
  return <Navigate to="/employee" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RootRedirect />} />

          {/* Admin */}
          <Route path="/admin" element={
            <RequireAuth adminOnly>
              <AdminLayout />
            </RequireAuth>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="employees" element={<AdminEmployees />} />
            <Route path="time-records" element={<AdminTimeRecords />} />
            <Route path="schedules" element={<AdminSchedules />} />
            <Route path="adjustments" element={<AdminAdjustments />} />
            <Route path="reports" element={<AdminReports />} />
          </Route>

          {/* Employee */}
          <Route path="/employee" element={
            <RequireAuth>
              <EmployeeLayout />
            </RequireAuth>
          }>
            <Route index element={<EmployeeDashboard />} />
            <Route path="history" element={<EmployeeHistory />} />
            <Route path="schedule" element={<EmployeeSchedule />} />
            <Route path="adjustments" element={<EmployeeAdjustments />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
