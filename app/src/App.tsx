import { BrowserRouter, Route, Routes } from "react-router-dom";
import Explore from "./pages/Explore";
import Trip from "./pages/Trip";
import Login from "./pages/Login";
import Plans from "./pages/Plans";
import PlanEditor from "./pages/PlanEditor";

/** Two pages: the map you arrive on, and the plan.
 *  "/" is a real map — every place on the trip, and directions from where you are
 *  standing to anywhere.  "/trip" is the day-by-day itinerary that used to be the
 *  landing page, and "/plans" is where his own saved trips live. */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Explore />} />
        <Route path="/trip" element={<Trip />} />
        <Route path="/login" element={<Login />} />
        <Route path="/plans" element={<Plans />} />
        <Route path="/plans/:id" element={<PlanEditor />} />
        {/* Anything else is a mistyped link, not an error worth a page of its own. */}
        <Route path="*" element={<Explore />} />
      </Routes>
    </BrowserRouter>
  );
}
