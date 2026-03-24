"""Jaettu rate limiter -instanssi slowapi-kirjastolla.

Käytetään sekä main.py:ssä (rekisteröinti) että
routers/analyze.py:ssä (dekoraattorit per endpoint).
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

# Tunnistaa käyttäjän IP-osoitteen perusteella
limiter = Limiter(key_func=get_remote_address)
