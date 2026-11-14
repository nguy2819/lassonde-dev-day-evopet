import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { destroySession } from "@/lib/auth";
import { DEMO_ROLE_COOKIE, SESSION_COOKIE } from "@/lib/env";

export async function POST(req: Request) {
  await destroySession((await cookies()).get(SESSION_COOKIE)?.value);
  const res = NextResponse.redirect(new URL("/", req.url), { status: 303 });
  res.cookies.delete(DEMO_ROLE_COOKIE);
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
