import os
import time
import requests
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

OUTPUT_DIR = os.path.abspath("screenshots")
os.makedirs(OUTPUT_DIR, exist_ok=True)

def get_auth_token(email, password):
    try:
        r = requests.post("http://127.0.0.1:8000/api/auth/login", json={"email": email, "password": password})
        if r.status_code == 200:
            return r.json().get("access_token")
    except Exception as e:
        print("Login err:", e)
    return None

def create_driver(width, height, is_mobile=False):
    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument(f"--window-size={width},{height}")
    if is_mobile:
        opts.add_argument("--user-agent=Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1")

    driver = webdriver.Chrome(options=opts)
    driver.set_window_size(width, height)
    return driver

def capture(driver, url, filename, token=None):
    print(f"Navigating to {url} -> {filename}...")
    driver.get("http://127.0.0.1:5173/#/")
    time.sleep(1)

    if token:
        driver.execute_script(f"sessionStorage.setItem('wishwell_session_token', '{token}');")
        time.sleep(0.5)

    driver.get(url)
    time.sleep(3.5)  # Wait for animations, stats count-up, and rendering

    out_path = os.path.join(OUTPUT_DIR, filename)
    driver.save_screenshot(out_path)
    print(f"Saved: {out_path} ({os.path.getsize(out_path)} bytes)")

def main():
    admin_token = get_auth_token("admin@wishwell.org", "Password123!")
    donor_token = get_auth_token("sarah.jenkins@example.com", "Password123!")
    print(f"Tokens - Admin: {'OK' if admin_token else 'FAIL'}, Donor: {'OK' if donor_token else 'FAIL'}")

    # 1. Desktop Screenshots (1280x900)
    print("Starting Desktop Driver...")
    d_desktop = create_driver(1280, 900, is_mobile=False)
    try:
        capture(d_desktop, "http://127.0.0.1:5173/#/", "landing_desktop.png")
        capture(d_desktop, "http://127.0.0.1:5173/#/browse", "browse_desktop.png")
        capture(d_desktop, "http://127.0.0.1:5173/#/admin/analytics", "admin_desktop.png", token=admin_token)
        capture(d_desktop, "http://127.0.0.1:5173/#/donor/impact", "donor_desktop.png", token=donor_token)
    finally:
        d_desktop.quit()

    # 2. Mobile Screenshots (375x812)
    print("Starting Mobile Driver...")
    d_mobile = create_driver(375, 812, is_mobile=True)
    try:
        capture(d_mobile, "http://127.0.0.1:5173/#/", "landing_mobile.png")
        capture(d_mobile, "http://127.0.0.1:5173/#/browse", "browse_mobile.png")
        capture(d_mobile, "http://127.0.0.1:5173/#/admin/analytics", "admin_mobile.png", token=admin_token)
        capture(d_mobile, "http://127.0.0.1:5173/#/donor/impact", "donor_mobile.png", token=donor_token)
    finally:
        d_mobile.quit()

    print("All screenshots captured successfully!")

if __name__ == "__main__":
    main()
