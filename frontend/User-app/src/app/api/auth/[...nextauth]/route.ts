import { handlers } from "@/auth";

export async function GET(request: Request) {
  return (handlers.GET as any)(request);
}

export async function POST(request: Request) {
  return (handlers.POST as any)(request);
}
