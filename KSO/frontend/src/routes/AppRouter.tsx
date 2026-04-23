import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";

import { AppShell } from "../components/layout/AppShell";
import { AccompanimentPage } from "../pages/AccompanimentPage";
import { AboutPage } from "../pages/AboutPage";
import { AnalyticsPage } from "../pages/AnalyticsPage";
import { ChatPage } from "../pages/ChatPage";
import { DashboardPage } from "../pages/DashboardPage";
import { ForgotPasswordPage } from "../pages/ForgotPasswordPage";
import { GradesPage } from "../pages/GradesPage";
import { GuidancePage } from "../pages/GuidancePage";
import { LandingPage } from "../pages/LandingPage";
import { LoginPage } from "../pages/LoginPage";
import { NotFoundPage } from "../pages/NotFoundPage";
import { OrientationPage } from "../pages/OrientationPage";
import { RegisterPage } from "../pages/RegisterPage";
import { ResetPasswordPage } from "../pages/ResetPasswordPage";
import { SchoolDetailsPage } from "../pages/SchoolDetailsPage";
import { SchoolsPage } from "../pages/SchoolsPage";
import { StudentsPage } from "../pages/StudentsPage";
import { SuperAdminAnnouncementsPage } from "../pages/SuperAdminAnnouncementsPage";
import { SuperAdminProgressPage } from "../pages/SuperAdminProgressPage";
import { ProtectedRoute } from "./ProtectedRoute";

function ShellLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

const allRoles = [
  "SUPER_ADMIN",
  "SCHOOL_ADMIN",
  "COLLEGE_ADMIN",
  "HIGH_SCHOOL_ADMIN",
  "UNIVERSITY_ADMIN",
  "TEACHER",
  "STUDENT",
  "UNIVERSITY_STUDENT",
  "PARENT"
] as const;

const adminRoles = ["SUPER_ADMIN", "SCHOOL_ADMIN", "COLLEGE_ADMIN", "HIGH_SCHOOL_ADMIN", "UNIVERSITY_ADMIN"] as const;

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/a-propos" element={<AboutPage />} />
        <Route path="/about" element={<Navigate to="/a-propos" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute roles={[...allRoles]} />}>
          <Route element={<ShellLayout />}>
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="orientation" element={<OrientationPage />} />
            <Route path="accompaniment" element={<AccompanimentPage />} />
            <Route path="guidance" element={<GuidancePage />} />
            <Route path="chat" element={<ChatPage />} />

            <Route element={<ProtectedRoute roles={["SUPER_ADMIN"]} />}>
              <Route path="schools" element={<SchoolsPage />} />
              <Route path="schools/:id" element={<SchoolDetailsPage />} />
              <Route path="superadmin/annonces" element={<SuperAdminAnnouncementsPage />} />
              <Route path="superadmin/announcements" element={<Navigate to="/superadmin/annonces" replace />} />
              <Route path="superadmin/progression" element={<SuperAdminProgressPage />} />
              <Route path="superadmin/progress" element={<Navigate to="/superadmin/progression" replace />} />
            </Route>

            <Route element={<ProtectedRoute roles={[...adminRoles, "TEACHER"]} />}>
              <Route path="students" element={<StudentsPage />} />
              <Route path="grades" element={<GradesPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
