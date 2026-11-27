import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const AUTHENTICATION_ERROR = "Invalid username or password.";
const RATE_LIMIT_ERROR = "Too many login attempts. Please try again later.";
const SERVICE_ERROR = "Authentication is temporarily unavailable.";
const MAX_BODY_BYTES = 8 * 1024;
const WINDOW_SECONDS = 60;
const MAX_ATTEMPTS_PER_IP = 20;
const MAX_ATTEMPTS_PER_USERNAME = 8;

type LoginPayload = {
  username?: unknown;
  password?: unknown;
};

type RateLimitResult = {
  allowed: boolean;
  unavailable: boolean;
};

const getRequiredEnv = (name: string) => {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const getNamedSupabaseKey = (jsonName: string, legacyName: string) => {
  const jsonValue = Deno.env.get(jsonName)?.trim();
  if (jsonValue) {
    try {
      const keys = JSON.parse(jsonValue) as Record<string, unknown>;
      const defaultKey = keys.default;
      if (typeof defaultKey === "string" && defaultKey.trim()) {
        return defaultKey.trim();
      }
    } catch {
      throw new Error(`Invalid ${jsonName} configuration.`);
    }
  }

  const legacyValue = Deno.env.get(legacyName)?.trim();
  if (legacyValue) return legacyValue;
  throw new Error(`Missing ${jsonName} or ${legacyName} configuration.`);
};

const supabaseUrl = getRequiredEnv("SUPABASE_URL");
const serviceRoleKey = getNamedSupabaseKey(
  "SUPABASE_SECRET_KEYS",
  "SUPABASE_SERVICE_ROLE_KEY",
);
const authApiKey = getNamedSupabaseKey(
  "SUPABASE_PUBLISHABLE_KEYS",
  "SUPABASE_ANON_KEY",
);
const rateLimitUrl = getRequiredEnv("RATE_LIMIT_REDIS_URL").replace(/\/$/, "");
const rateLimitToken = getRequiredEnv("RATE_LIMIT_REDIS_TOKEN");

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const authClient = createClient(supabaseUrl, authApiKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

const getAllowedOrigins = () => (Deno.env.get("EMPLOYEE_LOGIN_ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const getCorsHeaders = (request: Request) => {
  const origin = request.headers.get("origin");
  const allowedOrigins = getAllowedOrigins();
  const headers: Record<string, string> = {
    ...jsonHeaders,
    vary: "Origin",
  };

  if (origin && allowedOrigins.includes(origin)) {
    headers["access-control-allow-origin"] = origin;
  }

  return headers;
};

const respond = (
  request: Request,
  status: number,
  body: Record<string, unknown>,
) => new Response(JSON.stringify(body), {
  status,
  headers: getCorsHeaders(request),
});

const normalizeUsername = (value: unknown) => {
  if (typeof value !== "string") return null;

  // This mirrors the case-insensitive lower-case username index. Trimming is
  // applied at the boundary so accidental surrounding whitespace cannot create
  // a different login identity.
  const normalized = value.trim().toLocaleLowerCase("en-US");
  if (!normalized || normalized.length > 64) return null;
  return normalized;
};

const escapeLikePattern = (value: string) => value.replace(/[\\%_]/g, "\\$&");

const isValidPassword = (value: unknown) => (
  typeof value === "string" && value.length > 0 && value.length <= 1024
);

const sha256 = async (value: string) => {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const isValidIpv4 = (value: string) => {
  const octets = value.split(".");
  return octets.length === 4 && octets.every((octet) => {
    if (!/^(0|[1-9]\d{0,2})$/.test(octet)) return false;
    const number = Number(octet);
    return number >= 0 && number <= 255;
  });
};

const isValidIpv6 = (value: string) => {
  if (!value || /[\s,\[\]]/.test(value)) return false;

  let address = value;
  if (address.includes(".")) {
    const separator = address.lastIndexOf(":");
    if (separator < 0) return false;

    const ipv4 = address.slice(separator + 1);
    if (!isValidIpv4(ipv4)) return false;

    const number = ipv4.split(".").reduce(
      (result, octet) => result * 256 + Number(octet),
      0,
    );
    const highHextet = ((number >>> 16) & 0xffff).toString(16);
    const lowHextet = (number & 0xffff).toString(16);
    address = `${address.slice(0, separator)}:${highHextet}:${lowHextet}`;
  }

  if ((address.match(/::/g) ?? []).length > 1) return false;

  const hasCompression = address.includes("::");
  const [left, right = ""] = address.split("::");
  const leftHextets = left ? left.split(":") : [];
  const rightHextets = right ? right.split(":") : [];
  const hextets = [...leftHextets, ...rightHextets];

  if (
    hextets.some((hextet) => !/^[0-9a-f]{1,4}$/i.test(hextet))
    || (hasCompression && hextets.length >= 8)
    || (!hasCompression && hextets.length !== 8)
  ) {
    return false;
  }

  return true;
};

const getClientAddress = (request: Request) => {
  // Supabase's hosted edge ingress is fronted by Cloudflare. Cloudflare
  // provides CF-Connecting-IP as a single client address and recommends it
  // over X-Forwarded-For, whose client-supplied chain can be preserved.
  const rawCloudflareIp = request.headers.get("cf-connecting-ip");
  const cloudflareIp = rawCloudflareIp?.trim();
  const isValidClientIp = Boolean(
    cloudflareIp
    && !cloudflareIp.includes(",")
    && (isValidIpv4(cloudflareIp) || isValidIpv6(cloudflareIp))
  );
  console.log(
    `[employee-login] cf-connecting-ip header present=${rawCloudflareIp !== null}`,
  );
  console.log(
    `[employee-login] cf-connecting-ip validation=${isValidClientIp ? "passed" : "failed"}`,
  );

  if (!isValidClientIp) {
    return null;
  }

  return cloudflareIp;
};

const incrementRateLimit = async (
  rateLimitName: "username" | "ip",
  key: string,
  limit: number,
): Promise<RateLimitResult> => {
  const script = [
    "local current = redis.call('INCR', KEYS[1])",
    "if current == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end",
    "return current",
  ].join(" ");

  try {
    const response = await fetch(rateLimitUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${rateLimitToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(["EVAL", script, "1", key, String(WINDOW_SECONDS)]),
    });

    if (!response.ok) {
      console.log(
        `[employee-login] redis ${rateLimitName} rate-limit status=${response.status} success=false`,
      );
      return { allowed: false, unavailable: true };
    }

    let result: { result?: unknown };
    try {
      result = await response.json() as { result?: unknown };
    } catch {
      console.log(
        `[employee-login] redis ${rateLimitName} rate-limit status=${response.status} success=false`,
      );
      return { allowed: false, unavailable: true };
    }
    const count = Number(result.result);
    if (!Number.isFinite(count)) {
      console.log(
        `[employee-login] redis ${rateLimitName} rate-limit status=${response.status} success=false`,
      );
      return { allowed: false, unavailable: true };
    }

    console.log(
      `[employee-login] redis ${rateLimitName} rate-limit status=${response.status} success=true`,
    );

    return { allowed: count <= limit, unavailable: false };
  } catch {
    // Fail closed if the persistent limiter is unavailable. This prevents a
    // Redis outage from silently disabling brute-force protection.
    console.log(
      `[employee-login] redis ${rateLimitName} rate-limit status=unavailable success=false`,
    );
    return { allowed: false, unavailable: true };
  }
};

const checkRateLimits = async (request: Request, username: string) => {
  const usernameHash = await sha256(username);
  const usernameLimitPromise = incrementRateLimit(
    "username",
    `motopots:employee-login:username:${usernameHash}`,
    MAX_ATTEMPTS_PER_USERNAME,
  );
  const clientAddress = getClientAddress(request);

  if (!clientAddress) {
    // Keep applying the username limiter, but never substitute an arbitrary
    // client-provided header when the trusted edge IP is unavailable.
    await usernameLimitPromise;
    return { allowed: false, unavailable: true };
  }

  const clientHash = await sha256(clientAddress);

  const [ipLimit, usernameLimit] = await Promise.all([
    incrementRateLimit(
      "ip",
      `motopots:employee-login:ip:${clientHash}`,
      MAX_ATTEMPTS_PER_IP,
    ),
    usernameLimitPromise,
  ]);

  return {
    allowed: ipLimit.allowed && usernameLimit.allowed,
    unavailable: ipLimit.unavailable || usernameLimit.unavailable,
  };
};

const readBodyWithinLimit = async (request: Request) => {
  if (!request.body) return null;

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(body);
  } catch {
    return null;
  }
};

const parsePayload = async (request: Request): Promise<LoginPayload | null> => {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) return null;

  const rawBody = await readBodyWithinLimit(request);
  if (rawBody === null) return null;

  try {
    const payload = JSON.parse(rawBody);
    return payload && typeof payload === "object" && !Array.isArray(payload)
      ? payload as LoginPayload
      : null;
  } catch {
    return null;
  }
};

const handleRequest = async (request: Request) => {
  const corsHeaders = getCorsHeaders(request);

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers":
          "authorization, apikey, content-type, x-client-info",
      },
    });
  }

  if (request.method !== "POST") {
    return respond(request, 405, { error: "Method not allowed." });
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    return respond(request, 400, { error: AUTHENTICATION_ERROR });
  }

  const payload = await parsePayload(request);
  const username = normalizeUsername(payload?.username);
  const password = payload?.password;

  if (!username || !isValidPassword(password)) {
    return respond(request, 401, { error: AUTHENTICATION_ERROR });
  }

  const rateLimit = await checkRateLimits(request, username);
  if (rateLimit.unavailable) {
    return respond(request, 503, { error: SERVICE_ERROR });
  }
  if (!rateLimit.allowed) {
    return respond(request, 429, { error: RATE_LIMIT_ERROR });
  }

  try {
    console.log("[employee-login] authentication stage=employee-lookup-started");
    const { data: employee, error: employeeError } = await adminClient
      .from("employee")
      .select("auth_user_id, status")
      .ilike("username", escapeLikePattern(username))
      .maybeSingle();

    if (
      employeeError
      || !employee
      || employee.status !== "active"
      || !employee.auth_user_id
    ) {
      return respond(request, 401, { error: AUTHENTICATION_ERROR });
    }

    const { data: authUser, error: authUserError } = await adminClient.auth.admin
      .getUserById(employee.auth_user_id);

    if (authUserError || !authUser.user?.email) {
      return respond(request, 401, { error: AUTHENTICATION_ERROR });
    }

    const { data: authResult, error: signInError } = await authClient.auth
      .signInWithPassword({
        email: authUser.user.email,
        password: password as string,
      });

    if (signInError || !authResult.session) {
      return respond(request, 401, { error: AUTHENTICATION_ERROR });
    }

    const session = authResult.session;
    return respond(request, 200, {
      authenticated: true,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
      token_type: session.token_type,
    });
  } catch {
    return respond(request, 503, { error: SERVICE_ERROR });
  }
};

Deno.serve(handleRequest);
