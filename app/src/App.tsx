import { BrowserRouter, Route, Routes } from "react-router-dom";
import Explore from "./pages/Explore";
import Trip from "./pages/Trip";
import Login from "./pages/Login";
import Plans from "./pages/Plans";
import PlanEditor from "./pages/PlanEditor";
import PlanView from "./pages/PlanView";
import RequireUser from "./ui/RequireUser";

/** Two pages: the map you arrive on, and the plan.
 *  "/" is a real map — every place on the trip, and directions from where you are
 *  standing to anywhere.  "/trip" is the day-by-day itinerary that used to be the
 *  landing page, and "/plans" is where his own saved trips live.  Everything but the
 *  landing map and the sign-in page belongs to a profile. */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Explore />} />
        <Route path="/trip" element={<RequireUser><Trip /></RequireUser>} />
        <Route path="/login" element={<Login />} />
        <Route path="/plans" element={<Plans />} />
        <Route path="/plans/:id" element={<PlanEditor />} />
        <Route path="/plans/:id/view" element={<PlanView />} />
        {/* Anything else is a mistyped link, not an error worth a page of its own. */}
        <Route path="*" element={<Explore />} />
      </Routes>
    </BrowserRouter>
  );
}
