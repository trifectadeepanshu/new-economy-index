"""
Daily Upstox token refresh — run via GitHub Actions cron.
Generates a fresh access token and stores it in the Neon DB
via the /api/cron/store-token endpoint.
"""

import os
import sys
import requests
from upstox_totp import UpstoxTOTP


def main() -> None:
    required = [
        "UPSTOX_USERNAME", "UPSTOX_PIN_CODE", "UPSTOX_TOTP_SECRET",
        "UPSTOX_CLIENT_ID", "UPSTOX_CLIENT_SECRET", "UPSTOX_REDIRECT_URI",
        "TOKEN_STORE_URL", "CRON_SECRET",
    ]
    missing = [k for k in required if not os.environ.get(k)]
    if missing:
        print(f"ERROR: Missing env vars: {', '.join(missing)}", file=sys.stderr)
        sys.exit(1)

    print("Generating Upstox access token...")
    client = UpstoxTOTP(
        username=os.environ["UPSTOX_USERNAME"],
        pin_code=os.environ["UPSTOX_PIN_CODE"],
        totp_secret=os.environ["UPSTOX_TOTP_SECRET"],
        client_id=os.environ["UPSTOX_CLIENT_ID"],
        client_secret=os.environ["UPSTOX_CLIENT_SECRET"],
        redirect_uri=os.environ["UPSTOX_REDIRECT_URI"],
    )

    response = client.app_token.get_access_token()
    if not response.data or not response.data.access_token:
        print(f"ERROR: No access_token in response: {response}", file=sys.stderr)
        sys.exit(1)

    token = response.data.access_token
    print(f"Token generated for user: {response.data.user_name} ({response.data.email})")

    store_url = os.environ["TOKEN_STORE_URL"]
    result = requests.post(
        store_url,
        json={"token": token},
        headers={"Authorization": f"Bearer {os.environ['CRON_SECRET']}"},
        timeout=30,
    )
    result.raise_for_status()
    print(f"Token stored: {result.json()}")


if __name__ == "__main__":
    main()
