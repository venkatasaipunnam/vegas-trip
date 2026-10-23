import { BrowserRouter, Route, Routes } from "react-router-dom";
import Explore from "./pages/Explore";
import Trip from "./pages/Trip";

/** Two pages: the map you arrive on, and the plan.
 *  "/" is a real map — every place on the trip, and directions from where you are
 *  standing to anywhere.  "/trip" is the day-by-day itinerary that used to be the
 *  landing page. */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Explore />} />
        <Route path="/trip" element={<Trip />} />
        {/* Anything else is a mistyped link, not an error worth a page of its own. */}
        <Route path="*" element={<Explore />} />
      </Routes>
    </BrowserRouter>
  );
}
