import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StoreProvider } from "@/lib/store";
import { MobileShell, OwnerShell } from "@/components/layout/Shells";
import Landing from "./pages/Landing";
import SignIn from "./pages/SignIn";
import JobsHome from "./pages/technician/JobsHome";
import JobDetail from "./pages/technician/JobDetail";
import Scan from "./pages/technician/Scan";
import EquipmentList from "./pages/technician/EquipmentList";
import EquipmentProfile from "./pages/technician/EquipmentProfile";
import Diagnostics from "./pages/technician/Diagnostics";
import Approval from "./pages/technician/Approval";
import Report from "./pages/technician/Report";
import Copilot from "./pages/technician/Copilot";
import Documents from "./pages/technician/Documents";
import DocumentViewer from "./pages/technician/DocumentViewer";
import Parts from "./pages/technician/Parts";
import Knowledge from "./pages/technician/Knowledge";
import More from "./pages/technician/More";
import Settings from "./pages/technician/Settings";
import Training from "./pages/technician/Training";
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import OwnerJobs from "./pages/owner/OwnerJobs";
import OwnerCustomers from "./pages/owner/OwnerCustomers";
import OwnerEquipment from "./pages/owner/OwnerEquipment";
import OwnerMore from "./pages/owner/OwnerMore";
import Today from "./pages/technician/Today";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <StoreProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-center" />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/signin" element={<SignIn />} />

            <Route path="/app" element={<MobileShell />}>
              <Route index element={<Navigate to="/app/jobs" replace />} />
              <Route path="jobs" element={<JobsHome />} />
              <Route path="jobs/:id" element={<JobDetail />} />
              <Route path="jobs/:id/diagnose" element={<Diagnostics />} />
              <Route path="jobs/:id/approval" element={<Approval />} />
              <Route path="jobs/:id/report" element={<Report />} />
              <Route path="scan" element={<Scan />} />
              <Route path="copilot" element={<Copilot />} />
              <Route path="equipment" element={<EquipmentList />} />
              <Route path="equipment/:id" element={<EquipmentProfile />} />
              <Route path="documents" element={<Documents />} />
              <Route path="documents/:id" element={<DocumentViewer />} />
              <Route path="parts" element={<Parts />} />
              <Route path="knowledge" element={<Knowledge />} />
              <Route path="training" element={<Training />} />
              <Route path="settings" element={<Settings />} />
              <Route path="more" element={<More />} />
            </Route>

            <Route path="/app/owner" element={<OwnerShell />}>
              <Route index element={<OwnerDashboard />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </StoreProvider>
  </QueryClientProvider>
);

export default App;
