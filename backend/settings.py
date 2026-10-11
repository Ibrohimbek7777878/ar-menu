"""Compatibility shim for tools launched from the repository root.

The canonical Django settings module is ``backend/backend/settings.py``.
``backend/manage.py`` imports that file directly because its working path is
``backend/``. Some external tools run from the repository root, where
``backend.settings`` resolves to this file instead, so keep this shim explicit.
"""

from pathlib import Path
import sys

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from backend.backend.settings import *  # noqa: F401,F403
