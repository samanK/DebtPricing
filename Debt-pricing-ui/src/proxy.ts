// Next.js 16 "proxy" (formerly middleware): every page except /signin and the Auth.js endpoints
// requires a signed-in user whose token could be refreshed (see the `authorized` callback in auth.ts).
export { auth as proxy } from "@/auth";

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|signin).*)"],
};
