from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1280, "height": 1024})

        print("Navigating to index...")
        page.goto("http://localhost:8000")
        time.sleep(2)  # Wait for scene to load

        # We need to simulate a click that would trigger the raycaster.
        # But for automated verification we can just verify the click logic works
        # Let's write a simple script that executes a click event exactly at the position of "ARTISTS" node.

        # But we can also check index.html routing

        browser.close()

if __name__ == "__main__":
    run()
