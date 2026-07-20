import { Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Dashboard } from "@/pages/Dashboard";
import { MockupStudio } from "@/pages/MockupStudio";
import { CinemaStudio } from "@/pages/CinemaStudio";
import { ListingStudio } from "@/pages/ListingStudio";
import { NamingStudio } from "@/pages/NamingStudio";
import { DesignerPdf } from "@/pages/DesignerPdf";
import { SocialStudio } from "@/pages/SocialStudio";
import { Settings } from "@/pages/Settings";
import { Calibrate } from "@/pages/Calibrate";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="mockup" element={<MockupStudio />} />
        <Route path="cinema" element={<CinemaStudio />} />
        <Route path="listing" element={<ListingStudio />} />
        <Route path="naming" element={<NamingStudio />} />
        <Route path="pdf" element={<DesignerPdf />} />
        <Route path="social" element={<SocialStudio />} />
        <Route path="settings" element={<Settings />} />
        <Route path="calibrate" element={<Calibrate />} />
      </Route>
    </Routes>
  );
}
