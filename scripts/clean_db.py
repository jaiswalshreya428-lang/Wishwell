import sqlite3

con = sqlite3.connect('wishwell.db')
cur = con.cursor()
cur.execute("DELETE FROM wishes WHERE title LIKE '%<script>%' OR item_name LIKE '%<script>%' OR description LIKE '%<script>%'")
print("Deleted test wishes:", cur.rowcount)
cur.execute("DELETE FROM categories WHERE name = 'A & B'")
print("Deleted test category:", cur.rowcount)
con.commit()
con.close()
print("Database cleanly sanitized!")

