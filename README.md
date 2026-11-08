# beantagecoffee.com

Static, bilingual site for Beantage Specialty Coffee Roasters (Bogotá, Colombia). Spanish at `/`, English at `/en/`. No build step is required.

## Structure

| Path | What |
|---|---|
| `/`, `/en/` | Home |
| `/experiencia/`, `/en/experience/` | The experience (private cupping and coffee tour) |
| `/libro/`, `/en/book/` | The gift book and free chapter 1 |
| `/preguntas/`, `/en/faq/` | FAQ (with FAQPage JSON-LD) |
| `assets/css/site.css` | Design tokens, header, footer, buttons |
| `404.html`, `robots.txt`, `llms.txt`, `sitemap.xml`, `CNAME` | Site files |
| `scripts/build_sitemap.py` | Regenerates `sitemap.xml` (lastmod from git, hreflang alternates) |
| `.github/workflows/pages.yml` | Deploy to GitHub Pages on push to `main` |

Assets are versioned with `?v=20261108c` (Cloudflare caches for 4 h). Bump the string in every page when CSS/JS change.

## Run locally

```bash
python3 -m http.server 8811
# open http://localhost:8811/
```

Regenerate the sitemap after adding or changing pages: `python3 scripts/build_sitemap.py`.

## TODO before launch

- `assets/og/og-home.jpg` (1200x630) is referenced by every page's Open Graph tags and does not exist yet.
- Price, duration and meeting point are unknown. They are marked in the experience page with `<!-- data-pendiente: precio, duracion, punto de encuentro -->` and are not in the JSON-LD. The FAQ answer "Cuánto cuesta y dónde nos encontramos" must be updated when they exist.
- The FAQ states Spanish, English, Portuguese and French because the current Google Sites page says so. Confirm with the owner.

## Deploy

1. Create the GitHub repository and push `main` (not done yet).
2. Settings, Pages, Source: GitHub Actions. Set the custom domain `beantagecoffee.com` and enable Enforce HTTPS once the certificate is issued. With an Actions workflow, GitHub ignores the `CNAME` file; the domain is set in Settings.
3. Check the workflow run, then browse the `github.io` URL.
4. Do the DNS migration below.

## DNS migration checklist

Facts verified on 2026-11-08 (curl and dig):

- `https://beantagecoffee.com` answers `HTTP/2 302` with `server: Squarespace` and `location: https://sites.google.com/view/www-beantagecoffee-com/home`. The apex A records (198.185.159.144, 198.185.159.145, 198.49.23.144, 198.49.23.145) are Squarespace domain-forwarding addresses, not Google. The domain is likely registered at Squarespace Domains (formerly Google Domains).
- `www` is a CNAME to `ghs.googlehosted.com.`.
- NS records were reported as Google Cloud DNS (`ns-cloud-c1..c4.googledomains.com`).
- MX points to Mailgun (`mxa.mailgun.org`, `mxb.mailgun.org`, priority 10) and the TXT SPF is `v=spf1 include:mailgun.org ~all`. Mail for `contacto@beantagecoffee.com` depends on these.
- The Google Sites page is marked "private" in the Sites editor even though it renders anonymously. It can stay as it is.

Checklist:

- [ ] Confirm which panel actually controls DNS (Squarespace Domains or Google Cloud DNS) before changing anything. Take a screenshot or export of the current records.
- [ ] Remove the Squarespace domain forwarding for the apex (it creates the 302 to Google Sites) and the four forwarding A records.
- [ ] Add the GitHub Pages A records for the apex: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`.
- [ ] Add the AAAA records (optional, recommended with the A records): `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`.
- [ ] Replace the `www` CNAME `ghs.googlehosted.com.` with a CNAME to `<github-user>.github.io` (the account that owns the repo).
- [ ] Keep the MX records (Mailgun) and the SPF TXT record untouched. Do not use wildcard DNS records.
- [ ] If the site sits behind Cloudflare, add the same records there and keep Mailgun MX/TXT; mail records must not be proxied.
- [ ] Verify: `dig beantagecoffee.com +noall +answer -t A` returns the four GitHub IPs (or the Cloudflare proxy IPs), `dig beantagecoffee.com MX` still returns Mailgun, `curl -I https://beantagecoffee.com/` returns 200 (no 302 to Sites).
- [ ] Send a test email to `contacto@beantagecoffee.com` after the change.

Source for the IPs and record types: GitHub Docs, "Managing a custom domain for your GitHub Pages site", https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site (fetched 2026-11-08).

_Creado con ❤️ por Luis Felipe Ariza Vesga._
