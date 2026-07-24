import { expect, test, describe } from "bun:test";
import { z } from "zod";

const domainSchema = z.string().min(1).refine((val) => {
  try {
    const url = val.startsWith('http') ? val : `https://${val}`;
    const parsed = new URL(url);
    const hostname = parsed.hostname;

    if (hostname === 'localhost') return false;
    if (hostname.endsWith('.local') || hostname.endsWith('.internal')) return false;

    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);
    if (match) {
      const octet1 = parseInt(match[1], 10);
      const octet2 = parseInt(match[2], 10);
      if (octet1 === 10) return false;
      if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) return false;
      if (octet1 === 192 && octet2 === 168) return false;
      if (octet1 === 127) return false;
    }

    return true;
  } catch (e) {
    return false;
  }
}, { message: "Invalid domain or URL" });

describe("Business Domain Validation", () => {
  test("allows public domains", () => {
    expect(domainSchema.safeParse("google.com").success).toBe(true);
    expect(domainSchema.safeParse("https://my-saas.co.uk").success).toBe(true);
  });

  test("rejects localhost", () => {
    expect(domainSchema.safeParse("localhost").success).toBe(false);
    expect(domainSchema.safeParse("http://localhost:3000").success).toBe(false);
  });

  test("rejects internal and local hostnames", () => {
    expect(domainSchema.safeParse("service.local").success).toBe(false);
    expect(domainSchema.safeParse("api.internal").success).toBe(false);
  });

  test("rejects private IPv4 ranges", () => {
    expect(domainSchema.safeParse("10.0.0.1").success).toBe(false);
    expect(domainSchema.safeParse("172.16.4.5").success).toBe(false);
    expect(domainSchema.safeParse("192.168.1.100").success).toBe(false);
    expect(domainSchema.safeParse("127.0.0.1").success).toBe(false);
  });
});
