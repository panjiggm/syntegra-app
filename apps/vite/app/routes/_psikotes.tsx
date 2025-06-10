import { Outlet } from "react-router";
// import { ParticipantRoute } from "~/components/auth/route-guards";

export default function PsikotesLayout() {
  return (
    <>
      <div className="container mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </div>
    </>
  );
}
