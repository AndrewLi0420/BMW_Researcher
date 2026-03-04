#!/usr/bin/env python3
"""
server.py — FastAPI backend for the BMW Battery Intelligence frontend.

Endpoints
---------
  GET  /api/segments          → list of supply-chain segments
  POST /api/run               → run pipeline for a segment, return facility count
  GET  /api/download-csv      → download facilities for a segment as CSV

Usage
-----
    source venv/bin/activate
    pip install fastapi uvicorn
    python server.py
"""

from __future__ import annotations

import csv
import io
import logging
import sys
import os

# Ensure project root is on the path so local modules resolve
sys.path.insert(0, os.path.dirname(__file__))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from config import SUPPLY_CHAIN_SEGMENTS
from db.models import init_db, get_session, BatteryFacility
from main import run_pipeline

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("server")

app = FastAPI(title="BMW Battery Intelligence API")

# Allow the Vite dev server (port 5173) to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialise DB tables on startup
init_db()


# ── Request / Response models ────────────────────────────────────────────────

class RunRequest(BaseModel):
    segment: str


class RunResponse(BaseModel):
    segment: str
    facilities_found: int
    status: str


# ── CSV column order ─────────────────────────────────────────────────────────

CSV_COLUMNS = [
    "id",
    "status",
    "supply_chain_segment",
    "company",
    "company_website",
    "naatbatt_member",
    "hq_city",
    "hq_state",
    "facility_name",
    "product_facility_type",
    "product",
    "facility_address",
    "facility_city",
    "facility_state_or_province",
    "facility_country",
    "facility_zip",
    "facility_phone",
    "latitude",
    "longitude",
]


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/api/segments")
def get_segments() -> list[str]:
    """Return the list of all supply-chain segments."""
    return SUPPLY_CHAIN_SEGMENTS


@app.post("/api/run", response_model=RunResponse)
def run_segment(body: RunRequest) -> RunResponse:
    """
    Run the pipeline for a single segment.
    Skips the news phase to keep response times reasonable.
    """
    if body.segment not in SUPPLY_CHAIN_SEGMENTS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown segment '{body.segment}'. "
                   f"Valid options: {SUPPLY_CHAIN_SEGMENTS}",
        )

    logger.info("Running pipeline for segment: %s", body.segment)
    try:
        run_pipeline(
            segments=[body.segment],
            dry_run=False,
            search_news_flag=False,
        )
    except Exception as exc:
        logger.error("Pipeline failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))

    # Count facilities stored for this segment
    session = get_session()
    count = (
        session.query(BatteryFacility)
        .filter(BatteryFacility.supply_chain_segment == body.segment)
        .count()
    )
    session.close()

    logger.info("Pipeline complete — %d facilities for '%s'", count, body.segment)
    return RunResponse(segment=body.segment, facilities_found=count, status="ok")


@app.get("/api/download-csv")
def download_csv(segment: str) -> StreamingResponse:
    """
    Stream a CSV of all facilities for the given segment.
    """
    if segment not in SUPPLY_CHAIN_SEGMENTS:
        raise HTTPException(status_code=400, detail=f"Unknown segment '{segment}'.")

    session = get_session()
    rows = (
        session.query(BatteryFacility)
        .filter(BatteryFacility.supply_chain_segment == segment)
        .all()
    )
    session.close()

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=CSV_COLUMNS)
    writer.writeheader()
    for row in rows:
        writer.writerow({col: getattr(row, col, None) for col in CSV_COLUMNS})

    output.seek(0)
    filename = segment.lower().replace(" ", "_").replace("&", "and") + "_facilities.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
