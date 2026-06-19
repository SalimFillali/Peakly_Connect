# ============================================================
# PEAKLY — Scraping Business of Apps (statistiques Spotify)
# Compatible Google Colab ou exécution locale
# Source : https://www.businessofapps.com/data/spotify-statistics/
# ============================================================

# !pip install requests beautifulsoup4 lxml pandas openpyxl -q

import re
import os
import requests
import pandas as pd
from bs4 import BeautifulSoup

URL = "https://www.businessofapps.com/data/spotify-statistics/"
SAVE_PATH = "data/businessofapps/"   # en Colab : "/content/drive/MyDrive/PEAKLY/data/businessofapps/"
os.makedirs(SAVE_PATH, exist_ok=True)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    )
}


def slugify(text: str) -> str:
    text = text.strip().lower()
    text = re.sub(r"[^a-z0-9]+", "_", text)
    return text.strip("_")[:60]


def fetch_page(url: str) -> BeautifulSoup:
    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    try:
        return BeautifulSoup(resp.text, "lxml")
    except Exception:
        # Repli sur le parser standard si lxml n'est pas installé
        return BeautifulSoup(resp.text, "html.parser")


def table_to_dataframe(table) -> pd.DataFrame:
    """Convertit une balise <table> BeautifulSoup en DataFrame, sans passer par pd.read_html
    (évite les soucis de compatibilité lxml/pandas selon les versions)."""
    rows = []
    for tr in table.find_all("tr"):
        cells = tr.find_all(["th", "td"])
        rows.append([c.get_text(strip=True) for c in cells])

    if not rows:
        return pd.DataFrame()

    header, *data = rows
    # Si la première ligne ne ressemble pas à un en-tête (longueurs différentes), on garde tout en données
    if data and all(len(r) == len(header) for r in data):
        return pd.DataFrame(data, columns=header)
    return pd.DataFrame(rows)


def extract_tables(soup: BeautifulSoup) -> dict:
    """Associe chaque <table> au titre (h2/h3) qui la précède le plus près."""
    tables = soup.find_all("table")
    results = {}
    for i, table in enumerate(tables):
        heading = table.find_previous(["h2", "h3"])
        title = heading.get_text(strip=True) if heading else f"table_{i}"
        df = table_to_dataframe(table)
        key = slugify(title) or f"table_{i}"
        # éviter les collisions de noms
        suffix = 1
        base_key = key
        while key in results:
            suffix += 1
            key = f"{base_key}_{suffix}"
        results[key] = (title, df)
    return results


def extract_key_stats(soup: BeautifulSoup) -> list:
    """Récupère la liste à puces 'Spotify Key Statistics'."""
    heading = soup.find(lambda tag: tag.name in ("h2", "h3") and "key statistic" in tag.get_text(strip=True).lower())
    if not heading:
        return []
    ul = heading.find_next("ul")
    if not ul:
        return []
    return [li.get_text(strip=True) for li in ul.find_all("li")]


def extract_faq(soup: BeautifulSoup) -> pd.DataFrame:
    """Récupère les questions/réponses de la section FAQ."""
    faq_heading = soup.find(lambda tag: tag.name in ("h2", "h3") and "faq" in tag.get_text(strip=True).lower())
    rows = []
    if not faq_heading:
        return pd.DataFrame(columns=["Question", "Reponse"])

    node = faq_heading.find_next_sibling()
    current_q = None
    while node:
        if node.name in ("h2",):  # fin de la section FAQ
            break
        if node.name == "h4":
            current_q = node.get_text(strip=True)
        elif node.name == "p" and current_q:
            answer = node.get_text(strip=True)
            if answer:
                rows.append({"Question": current_q, "Reponse": answer})
                current_q = None
        node = node.find_next_sibling()
    return pd.DataFrame(rows)


def main():
    print(f"Téléchargement : {URL}")
    soup = fetch_page(URL)

    # 1) Toutes les tables de données
    tables = extract_tables(soup)
    print(f"\n📊 {len(tables)} tableaux trouvés")
    for key, (title, df) in tables.items():
        path = os.path.join(SAVE_PATH, f"{key}.csv")
        df.to_csv(path, index=False, encoding="utf-8-sig")
        print(f"  ✅ {title} → {path} ({len(df)} lignes)")

    # 2) Statistiques clés (bullet points)
    key_stats = extract_key_stats(soup)
    if key_stats:
        df_stats = pd.DataFrame({"Statistique": key_stats})
        path = os.path.join(SAVE_PATH, "key_statistics.csv")
        df_stats.to_csv(path, index=False, encoding="utf-8-sig")
        print(f"  ✅ Key Statistics → {path} ({len(df_stats)} lignes)")

    # 3) FAQ
    df_faq = extract_faq(soup)
    if not df_faq.empty:
        path = os.path.join(SAVE_PATH, "faq.csv")
        df_faq.to_csv(path, index=False, encoding="utf-8-sig")
        print(f"  ✅ FAQ → {path} ({len(df_faq)} questions)")

    # 4) Export combiné (toutes les tables dans un seul Excel, un onglet par tableau)
    excel_path = os.path.join(SAVE_PATH, "businessofapps_spotify_ALL.xlsx")
    with pd.ExcelWriter(excel_path, engine="openpyxl") as writer:
        for key, (title, df) in tables.items():
            df.to_excel(writer, sheet_name=key[:31], index=False)
        if key_stats:
            pd.DataFrame({"Statistique": key_stats}).to_excel(writer, sheet_name="key_statistics", index=False)
        if not df_faq.empty:
            df_faq.to_excel(writer, sheet_name="faq", index=False)
    print(f"\n🎯 Export combiné → {excel_path}")
    print("Terminé.")


if __name__ == "__main__":
    main()
