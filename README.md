# BMW Battery Industry Data Pipeline

Automated data pipeline that searches for battery industry companies and news using Google Gemini AI, extracts structured data, and stores it in a SQLite database mirroring the NAATBatt Database schema.

## Features
- **AI-Powered Search**: Uses Gemini 2.5 Flash to find battery facility data and industry news
- **Pydantic Validation**: Validates zip codes, coordinates, URLs, and dates before DB insertion
- **Deduplication**: Composite key `(Company, Facility_Name, Facility_City)` prevents duplicates
- **Scheduled Automation**: Weekly pipeline runs via `scheduler.py`

## Setup
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add your GEMINI_API_KEY
```

## Usage
```bash
# Full pipeline
python main.py

# Single segment, dry run
python main.py --segments "Cell Manufacturing" --dry-run

# Export to CSV
sqlite3 -header -csv battery_pipeline.db "SELECT * FROM battery_facilities_full;" > facilities.csv

# Run tests
python -m pytest tests/ -v
```

## Tech Stack
Python 3.10+ · SQLAlchemy · Pydantic · Google Gemini API · SQLite
