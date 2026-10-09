import { NextResponse } from "next/server";

/**
 * The legacy public PDF endpoint embedded a hypothetical premix engineered to
 * satisfy vitamin/mineral targets. Retire it rather than issuing a misleading
 * "complete feed" document after that premix has been withdrawn.
 */
export async function POST() {
  return NextResponse.json(
    {
      status: "retired",
      message: "The theoretical-premix PDF is retired. Use FeedSport Studio with a named commercial premix; unverified micronutrients must not be presented as complete-feed compliance.",
      studio_url: "/dashboard",
    },
    { status: 410, headers: { "cache-control": "no-store" } },
  );
}
