import { createFileRoute } from "@tanstack/react-router";
import { RacerPage } from "../../pages/racer-page";

export const Route = createFileRoute("/racer/")({
  validateSearch: (search): { eventId?: string; source?: string; tab?: string } => ({
    eventId: typeof search.eventId === "string" ? search.eventId : undefined,
    source: typeof search.source === "string" ? search.source : undefined,
    tab: typeof search.tab === "string" ? search.tab : undefined
  }),
  component: RacerIndexPage
});

function RacerIndexPage() {
  const search = Route.useSearch();
  return <RacerPage focusEventId={search.eventId} source={search.source} initialTab={search.tab} />;
}
