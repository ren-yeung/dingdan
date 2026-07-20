import sys
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
for p in (BASE_DIR, os.path.join(BASE_DIR, "localpkgs")):
    if p not in sys.path:
        sys.path.insert(0, p)

import uvicorn

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False)
