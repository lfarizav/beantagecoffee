#!/usr/bin/env python3
"""Write sitemap.xml for beantagecoffee.com.

Run from anywhere: python3 scripts/build_sitemap.py
lastmod = last git commit date of the page file; today's date if untracked or modified.
"""
import datetime
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
BASE = "https://beantagecoffee.com"
# (es path, en path, es file, en file)
PAIRS = [
    ("/", "/en/", "index.html", "en/index.html"),
    ("/experiencia/", "/en/experience/", "experiencia/index.html", "en/experience/index.html"),
    ("/libro/", "/en/book/", "libro/index.html", "en/book/index.html"),
    ("/preguntas/", "/en/faq/", "preguntas/index.html", "en/faq/index.html"),
]


def git(*args):
    return subprocess.run(["git", "-C", str(ROOT), *args], capture_output=True, text=True).stdout.strip()


def lastmod(rel):
    today = datetime.date.today().isoformat()
    if not (ROOT / rel).exists():
        return None
    if not git("ls-files", "--", rel) or git("status", "--porcelain", "--", rel):
        return today
    d = git("log", "-1", "--format=%cs", "--", rel)
    return d or today


def main():
    out = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">']
    for es, en, fes, fen in PAIRS:
        for path, f in ((es, fes), (en, fen)):
            lm = lastmod(f)
            if lm is None:
                print(f"skip (missing): {f}")
                continue
            out += ["  <url>", f"    <loc>{BASE}{path}</loc>", f"    <lastmod>{lm}</lastmod>",
                    f'    <xhtml:link rel="alternate" hreflang="es" href="{BASE}{es}"/>',
                    f'    <xhtml:link rel="alternate" hreflang="en" href="{BASE}{en}"/>',
                    f'    <xhtml:link rel="alternate" hreflang="x-default" href="{BASE}{es}"/>',
                    "  </url>"]
    out.append("</urlset>")
    (ROOT / "sitemap.xml").write_text("\n".join(out) + "\n", encoding="utf-8")
    print("sitemap.xml written")


if __name__ == "__main__":
    main()
