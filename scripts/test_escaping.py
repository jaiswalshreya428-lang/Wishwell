import urllib.request
import json
import sqlite3

def run_test():
    # 0. Ensure a category called 'A & B' exists in the database
    con = sqlite3.connect('wishwell.db')
    cur = con.cursor()
    cur.execute("SELECT id FROM categories WHERE name = 'A & B'")
    row = cur.fetchone()
    if not row:
        cur.execute("INSERT INTO categories (name, description, created_at) VALUES ('A & B', 'Notebooks & Geometry Set', datetime('now'))")
        con.commit()
    con.close()

    # 1. Login as institution
    login_req = urllib.request.Request(
        'http://127.0.0.1:8000/api/auth/login',
        data=json.dumps({'email': 'contact@stmarys.org', 'password': 'Password123!'}).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(login_req) as resp:
        token = json.loads(resp.read().decode('utf-8'))['access_token']

    # 2. Get categories and verify 'A & B' and all other categories are plain text (no &amp;)
    cat_req = urllib.request.Request('http://127.0.0.1:8000/api/categories')
    with urllib.request.urlopen(cat_req) as resp:
        categories = json.loads(resp.read().decode('utf-8'))

    print("CATEGORIES RETURNED:")
    has_ab = False
    for c in categories:
        print(f" - ID {c['id']}: {c['name']}")
        assert "&amp;" not in c["name"], f"Double-escaped &amp; found in category: {c['name']}"
        assert "&amp;" not in (c.get("description") or ""), f"Double-escaped &amp; found in description"
        if c["name"] == "A & B":
            has_ab = True
            cat_ab_id = c["id"]

    assert has_ab, "Category 'A & B' was not found in API response!"
    print("✓ Category 'A & B' displays correctly with literal '&' and zero double-escaping.")

    # 3. Create a wish with '<script>alert(\"xss\")</script>' and ampersands
    wish_payload = {
        'title': '<script>alert("xss")</script> Math & Science Books',
        'description': 'Text containing & and <script> tags to ensure plain text rendering in React',
        'item_name': 'Math & Science Set A',
        'qty_requested': 15,
        'needed_by': '2026-12-15T00:00:00',
        'category_id': cat_ab_id,
        'confirm_duplicate': True
    }
    create_req = urllib.request.Request(
        'http://127.0.0.1:8000/api/wishes',
        data=json.dumps(wish_payload).encode('utf-8'),
        headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}
    )
    with urllib.request.urlopen(create_req) as resp:
        created = json.loads(resp.read().decode('utf-8'))

    print("\nCREATED WISH RESPONSE:")
    print(" - Title:", created["title"])
    print(" - Item Name:", created["item_name"])
    print(" - Description:", created["description"])

    assert created["title"] == '<script>alert("xss")</script> Math & Science Books'
    assert "&amp;" not in created["title"]
    assert "&lt;" not in created["title"]
    assert created["item_name"] == "Math & Science Set A"
    assert "&amp;" not in created["item_name"]
    print("✓ '<script>' tag is preserved cleanly as plain text without double-escaping.")

    # 4. Check Detail endpoint
    detail_req = urllib.request.Request(f"http://127.0.0.1:8000/api/wishes/{created['id']}")
    with urllib.request.urlopen(detail_req) as resp:
        detail = json.loads(resp.read().decode('utf-8'))

    assert detail["title"] == '<script>alert("xss")</script> Math & Science Books'
    assert detail["category_name"] == "A & B"
    assert "&amp;" not in detail["category_name"]
    print("✓ Detail endpoint returns plain text 'A & B' and script tag safely.")

    print("\n=======================================================")
    print("ALL TESTS PASSED: 'A & B' and '<script>' plain text verified!")
    print("=======================================================")

if __name__ == '__main__':
    run_test()
