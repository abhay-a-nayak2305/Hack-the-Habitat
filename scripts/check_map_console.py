"""End-to-end verification: frontend <-> backend connectivity and interactions."""
import sys
from playwright.sync_api import sync_playwright

errors = []
api_hits = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False, args=["--window-size=1280,800"])
    page = browser.new_page(viewport={"width": 1280, "height": 720})

    def on_console(msg):
        text = msg.text.lower()
        if msg.type == "error" or "no style added" in text or "getlayer" in text:
            errors.append(f"[{msg.type}] {msg.text}")

    def on_pageerror(exc):
        errors.append(f"[pageerror] {exc}")

    def on_response(resp):
        if "/api/" in resp.url:
            n = ""
            try:
                body = resp.json()
                if isinstance(body, dict):
                    n = f"features={len(body.get('features', []))}"
                elif isinstance(body, list):
                    n = f"records={len(body)}"
            except Exception:
                pass
            api_hits.append(f"{resp.request.method} {resp.url.split('5173')[-1]} -> {resp.status} {n}".strip())
            if resp.status >= 400:
                errors.append(f"API ERROR {resp.status} {resp.url}")

    page.on("console", on_console)
    page.on("pageerror", on_pageerror)
    page.on("response", on_response)

    page.goto("http://localhost:5173", wait_until="domcontentloaded")
    page.wait_for_timeout(8000)

    print("=== 1. MAP RENDER ===")
    print("maplibre map divs:", page.locator(".maplibregl-map").count())
    print("maplibre canvas:", page.locator(".maplibregl-canvas").count())
    print("risk-strip buttons (hotspots rendered):", page.locator("button[title*='risk']").count())

    print("=== 2. FILTER -> BACKEND QUERY ===")
    # Move the min-score slider to 50 -> triggers a new API request
    page.locator("input[type='range']").fill("50")
    page.wait_for_timeout(2000)
    print("risk-strip buttons after min_score=50:", page.locator("button[title*='risk']").count())

    print("=== 3. SIGHTING FORM -> POST /api/sightings ===")
    page.get_by_role("button", name="Report a sighting").click()
    page.wait_for_timeout(500)
    page.locator("input[placeholder='11.6700']").fill("11.6700")
    page.locator("input[placeholder='76.4200']").fill("76.4200")
    page.locator("input[placeholder='Chital, Indian peafowl, ...']").fill("Playwright verification species")
    page.get_by_role("button", name="Submit sighting").click()
    page.wait_for_timeout(2000)
    print("form success message:", page.locator("text=Recorded. Thank you").count() > 0)

    browser.close()

print("=== 4. API TRAFFIC THROUGH VITE PROXY ===")
for h in api_hits:
    print("  ", h)

if errors:
    print("CONSOLE/JS/API ERRORS:")
    for e in errors:
        print(" -", e)
    sys.exit(1)
print("NO ERRORS — frontend and backend connected and working")
