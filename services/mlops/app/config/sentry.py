import os

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration


def init_sentry() -> None:
    integrations = [FastApiIntegration()]
    try:
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

        integrations.append(SqlalchemyIntegration())
    except Exception:
        pass

    sentry_sdk.init(
        dsn=os.getenv("SENTRY_DSN"),
        environment=os.getenv("ENVIRONMENT", "development"),
        traces_sample_rate=0.1,
        profiles_sample_rate=0.1,
        integrations=integrations,
    )
