import type { Metadata } from "next";
import { CheckinForm } from "./checkin-form";

export const metadata: Metadata = { title: "Check-in" };

export default function CheckinPage() {
  return <CheckinForm />;
}
