# Repair quote and completion regression checks

From `backend/`, run API checks with the project's Python dependencies:

```powershell
python -m unittest discover -s tests -v
```

For browser checks, start the User app and Technician app in development mode,
then install the optional test dependency and a browser:

```powershell
python -m pip install playwright==1.63.0
python -m playwright install chromium
python tests/check_repair_costs_ui.py
```

The script uses `http://localhost:3002` for the User app and
`http://localhost:3001` for the Technician app. Override these with `USER_APP_URL`
and `TECHNICIAN_APP_URL`. To use an existing browser, set
`REPAIR_TEST_BROWSER_EXECUTABLE` to its executable path.

Browser API requests run through the real FastAPI handlers with a shared
in-memory database and test authentication. They do not modify Supabase data.
The checks cover equal/lower/higher final costs, additional parts and services,
approval/rejection of additional costs, zero final cost, customer receipts,
and duplicate completion calls.
