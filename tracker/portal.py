"""Polite HTTP client for digital.parliament.gov.np.

The portal keeps the display language in a server session, set by POSTing to
/portal/locale with the page's CSRF token. We switch the session to English
once and re-check on each page that the locale stuck.
"""
import re
import time

import requests

BASE = "https://digital.parliament.gov.np"
UA = "Mozilla/5.0 (compatible; nepal-parliament-tracker/1.0; public-interest research)"


class Portal:
    def __init__(self, delay=0.4, locale="en"):
        self.s = requests.Session()
        self.s.headers["User-Agent"] = UA
        self.delay = delay
        self.locale = locale
        self.requests = 0
        if locale != "ne":
            self._set_locale(locale)

    def _set_locale(self, locale):
        html = self._get(BASE + "/members")
        tok = re.search(r'name="_token"[^>]*value="([^"]+)"', html)
        if not tok:
            raise RuntimeError("could not find CSRF token on /members")
        r = self.s.post(BASE + "/portal/locale", data={"_token": tok.group(1), "locale": locale},
                        headers={"Referer": BASE + "/members"}, timeout=60)
        r.raise_for_status()

    def _get(self, url, tries=4):
        for attempt in range(tries):
            try:
                time.sleep(self.delay)
                r = self.s.get(url, timeout=60)
                self.requests += 1
                if r.status_code == 404:
                    return None
                r.raise_for_status()
                return r.text
            except requests.RequestException:
                if attempt == tries - 1:
                    raise
                time.sleep(5 * (attempt + 1))
        return None

    def get(self, path):
        html = self._get(BASE + path)
        if html and self.locale == "en" and 'lang="en"' not in html[:600]:
            self._set_locale("en")  # session expired; switch back and retry once
            html = self._get(BASE + path)
        return html
