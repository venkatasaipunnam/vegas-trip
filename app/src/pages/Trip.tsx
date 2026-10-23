import MapView from "../map/MapView";
import Top from "../ui/Top";
import Sheet from "../ui/Sheet";
import Legend from "../ui/Legend";

/** The day-by-day plan: the map follows the leg he is on and the sheet holds the
 *  itinerary.  This was the whole app until the landing page took over "/". */
export default function Trip() {
  return (
    <>
      <MapView />
      <Top />
      <Legend />
      <Sheet />
    </>
  );
}
