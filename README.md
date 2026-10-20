# Schwab Lab 🚀

**Research in motion.** A responsive, browser-based website for educational rocket flight visualization, 3D trajectory plotting and post-flight vector analysis.

> No server, installation, API key, or npm build required. This project uses plain HTML, CSS and JavaScript, and can be hosted on GitHub Pages.

## Project structure

```text
schwab-lab/
├── index.html                 # Landing page (required at the publishing root)
├── lab.html                   # Flight Lab interface
├── physics.html               # Model physics, OpenRocket inspection, saving
├── assets/
│   ├── css/
│   │   ├── home.css           # Landing page styles
│   │   ├── lab.css            # Flight Lab styles
│   │   └── physics.css        # Design Archive styles
│   ├── js/
│   │   ├── flight-lab-ork-v4.js # Flight playback, charting and CSV parsing (lab.html and flight.html)
│   │   ├── flight-lab.js      # Older copy of the above; no page loads it any more
│   │   ├── physics-lab.js     # OpenRocket inspection and project saving
│   │   ├── simulation-viewer.js # Saved OpenRocket data visualization
│   │   └── jszip.min.js       # Locally bundled JSZip ZIP reader
│   └── icons/
│       └── favicon.svg
├── data/
│   └── sample_flight.csv      # Example dataset for import
├── .nojekyll                 # Serve static source without Jekyll processing
├── .gitignore
└── README.md
```

## Launch it locally

1. Open `index.html` in your browser.
2. Click **Open Flight Lab**.
3. Use the example dataset, or choose **Import flight CSV** in the lab and select `data/sample_flight.csv`.

For development, you can optionally run a local static server from the folder root:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/` in your browser. No external dependencies are used.

## Publish on GitHub Pages

1. Visit [GitHub](https://github.com/new) and create a new **public** repository named `schwab-lab` (or any other name).
2. Open the repository. Select **Add file → Upload files**.
3. Drag the **contents of this folder** into GitHub: `index.html` and `lab.html` must be at the **repository root**, alongside `assets/` and `data/`.
4. Commit the files to the `main` branch.
5. Open **Settings → Pages → Build and deployment**.
6. Select **Source: Deploy from a branch**, **Branch: main**, and **Folder: /(root)**. Click **Save**.
7. When publishing is complete, GitHub shows your website URL in the Pages settings. It will normally look like:

   `https://YOUR-USERNAME.github.io/schwab-lab/`

Refer to [GitHub's official Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) if the menu changes.

### Using git instead of uploading files

From inside the `schwab-lab` directory:

```bash
git init
git branch -M main
git add .
git commit -m "Initial Schwab Lab website"
git remote add origin https://github.com/YOUR-USERNAME/schwab-lab.git
git push -u origin main
```

Create the empty GitHub repository first and replace `YOUR-USERNAME` with your GitHub username. If you create a repository with an initial README, use GitHub's upload UI or reconcile the commits before pushing.

## What Flight Lab supports

- Rotatable 2D-canvas projection of a 3D trajectory (east, north, up axes)
- Animation timeline, scrubber, playback speed, and step-by-step review
- Direction overlays for velocity, acceleration, and an optional reference vector
- Current and peak altitude, displacement, velocity components, and speed readouts
- Time series charts of altitude and speed
- Import/export CSV files locally in the browser
- Illustrative, simplified free-flight demonstration

### CSV schema

Required columns: `time` and `z` (altitude). Optional positions: `x`, `y`. Optional velocity and acceleration columns: `vx`, `vy`, `vz`, `ax`, `ay`, `az`.

- Time is in seconds and **must strictly increase**.
- Position is in meters, in an east / north / up Cartesian frame.
- Provide at least three samples.
- If vector columns are absent, the browser approximates them by finite differences.
- CSV data remains on your device; files are not sent to any server.

Example:

```csv
time,x,y,z
0,0,0,0
1,1,0,10
2,2,1,18
3,3,2,21
4,4,3,19
5,5,3,12
6,6,4,0
```

## Scope and limitations

Schwab Lab is for **educational visualization and post-flight analysis**. Its built-in example does not model a specific rocket or motor, and the 3D display is a projected drawing rather than a high-fidelity rigid-body simulator. The displayed vector arrows indicate direction, not absolute magnitude. The project does **not** provide commands for steering, targeting, guidance, or in-flight control of physical vehicles. Do not use the demonstration to determine launch conditions, expected apogee, flight safety, or deployment timing.

## Editing

- Change homepage text/markup in `index.html` and colors/layout in `assets/css/home.css`.
- Change Flight Lab controls/markup in `lab.html` and styling in `assets/css/lab.css`.
- Change data-processing and visualization logic in `assets/js/flight-lab-ork-v4.js`. Run `python3 tests/site_check.py` and `node tests/csv_parser_check.js` before committing.
- Publish updates simply by committing changes to `main` after enabling Pages.


## Design Archive (version 2.1)

The `physics.html` workspace inspects previously saved OpenRocket `.ork` or uncompressed XML design files locally. It lists rocket components, recorded motor selections, and saved OpenRocket simulation summaries when present. It allows you to document recorded mass, aerodynamic drag coefficient, impulse and burn time without creating a powered-flight prediction or guidance output.

- **Import .ork**: unpack the ZIP in the browser with a locally bundled copy of JSZip and read `rocket.ork` metadata. Files are limited to 8 MB; XML is capped at 12 MB.
- **Save to browser**: local IndexedDB project library.
- **Export project**: portable `.schwab.json` file, including notes, recorded properties and any attached original `.ork` bytes.
- **Open project**: restore from exported `.schwab.json` files.
- **Download original .ork**: recover the unmodified source file.
- **Flight Lab**: save and reload one trajectory locally, import recorded CSV trajectories, visualize measured motion, and export CSV.

All data stays in the browser. Browser storage can be cleared, so export backups. The site is an educational inspection/analysis tool and does **not** predict powered rocket performance, control hardware, or provide flight guidance.

### Replay saved OpenRocket simulation results

In **Design Archive**, import a `.ork` file and scroll down to **Saved Flight Replay**. Select a simulation and, where applicable, a flight-data branch (for example, a separated stage).

The viewer reads existing OpenRocket XML `<flightdata><databranch types="..."><datapoint>...` entries and displays **only recorded data** in four customizable graphs. Available fields may include altitude, total or vertical velocity, acceleration, drag, thrust, mass, and other fields already saved in the file. The time scrubber displays a moving cursor and nearby recorded event labels. You can click a chart to inspect a saved timestamp and export the selected branch as CSV. The selected plot/time position is included in Schwab Lab project saves.

Not all `.ork` files contain the full time series: OpenRocket may store only summary metadata depending on its save settings. When no data points are embedded, Schwab Lab displays a clear summary-only message rather than generating values. Up to 12 flight-data branches and 12,000 displayed samples per branch are parsed; longer time series are *downsampled for viewing and CSV export*, while the original `.ork` is preserved in the project file.

**This is a read-only viewer, not a replacement for OpenRocket's physics simulation engine.** It does not calculate expected launch behavior or provide active guidance or control.

## Site Conditions, Regulatory Flags & Guidance Research (v2.2)

In **Design Archive → Site Conditions & Safety Review**, record a place and date associated with an experiment or existing design, including a point selected from an OpenStreetMap map (Leaflet), site elevation, observed atmospheric values, and the angle noted in a prior report. Entries are **documentation only** and are never fed into launch commands, launch-angle optimization, or a new rocket flight prediction. All these fields are included in **Save to browser**, **Export project**, and **Open project**. Previously exported v1 archives without the site fields remain readable.

The **Automatic regulatory flagger** is a conservative, offline screening tool based on selected provisions of [14 CFR Part 101 Subpart C](https://www.ecfr.gov/current/title-14/chapter-I/subchapter-F/part-101/subpart-C) (reviewed October 2026):

- Highlights recorded mass above 1,500 grams including propellant, or propellant above 125 grams, as **possible Class 1 classification mismatches** under § 101.22.
- Flags uncertainty about structural materials, substantial metal parts, and slow-burning propellant.
- Flags any self-reported potential hazard under § 101.23 and records whether airspace, site permission and hazard reviews have been separately documented.
- Always warns that applicable FAA restrictions and ATC requirements may need independent review.

**It never returns a launch authorization or a legal compliance certificate.** Being outside the Class 1 definition does **not** mean that an operation is necessarily unlawful; it may be in a different class with different requirements. This app has no live FAA/NOTAM, airport-boundary, restricted-airspace, or governmental approval feed. The interactive map is for a reference point **only**. OpenStreetMap map tiles require internet access and receive map tile requests; manual coordinate input and project data processing are local. When requested, weather data is retrieved from Open-Meteo; availability varies by date and location, and output is not verified on-site. Regulations may change—always review the official sources and consult qualified personnel.

**Guidance Research** is a reserved, read-only educational section about coordinate frames, measurement uncertainty, and comparing previously recorded data. It contains no steering logic, flight control outputs, targeting, or actuator interfaces.

The standalone `guidance.html` is also available as a passive research roadmap.


## New workspaces — local-first archive

- `physics.html`: OpenRocket `.ork` ZIP/XML component inventory, recorded motor metadata, saved flight-data branch graphs with selectable channels (altitude, velocity, acceleration, drag, thrust, mass), events, and CSV export. Summary-only simulation files cannot create missing timeseries.
- `physics.html#siteConditions`: optional site map (Leaflet/OpenStreetMap), site-local date/time, launch-angle **observation**, pressure, temperature, humidity, visibility, cloud, wind, preliminary FAA Part 101 flags. Weather lookup uses Open-Meteo forecast or historical modeling when supported. Weather is not verified, the map does not check airspace, and flags do not convey launch permission.
- `guidance.html`: non-operational guidance research roadmap and locally saved/exported notebook; no commands, targeting, control-system or live interface.
- `cad.html`: offline-model CAD inspection for STL, OBJ, and 3MF meshes, Prusa printer metadata, materials, print notes and revision labels. Raw 3MF meshes are shown without build-transform handling. CAD models can be saved locally and exported as `.schwabcad.json` archives. Preview dimensions are **not** print, structural, or flight validation.

### Persistence and external services

Project and CAD browser saves use IndexedDB; guidance notes use localStorage. Export portable `.schwab.json` and `.schwabcad.json` files to keep copies independently. The original imported `.ork` and CAD file bytes are included in their respective archive exports (subject to size limits). Clearing browser site data deletes local saves.

No upload backend or account is provided. For mapping, Leaflet and OpenStreetMap are requested over the network; weather requests contact Open-Meteo **only when you press the weather lookup button**. Imported CAD `.3mf` archives are read with the locally bundled JSZip parser. Internet access is needed for map tiles and weather lookup but not for local file inspection or archiving.

### Safety and limitations

This project is an educational, passive software archive. It does not generate guidance commands, powered flight planning, flight-critical CAD geometry, airspace clearance, or legal determinations. The federal review checklist references [14 CFR Part 101 Subpart C](https://www.ecfr.gov/current/title-14/chapter-I/subchapter-F/part-101/subpart-C); consult authoritative FAA guidance and qualified local launch supervisors. Weather model data must not be used as a safety or launch permission decision.

## Validation

Run `python3 tests/site_check.py` from the repository root to check internal page links, referenced assets and duplicate element IDs. The script also runs `node --check` on JavaScript when Node.js is available. Browser-based file import and IndexedDB saving should be retested after UI changes.\n\n## Telemetry & Validation v3\n\nOpen [telemetry.html](telemetry.html) for passive CSV telemetry comparison, synchronized time-series plots, reference interpolation, data-quality flags, illustrative measurement-uncertainty bands, RMSD and mean residual metrics. Save a project locally or export and reimport a versioned `.schwab.json` file. Data remains in the browser.\n\nThis does not estimate live attitude from IMU logs, model active control, validate launch safety, or predict geographic flight paths. The reference must provide a matching channel label and timestamp units (seconds). The project JSON can contain original imported CSV data; review it before sharing publicly.\n

## Live Sensors v3.1

Visit [`live.html`](live.html) for a virtual Arduino Uno dashboard, local recording, CSV downloads and replay. In compatible Chromium desktop browsers over HTTPS, the **USB Serial (read only)** option can open a device the user explicitly selects. Schwab Lab never writes serial data to the hardware.

Expected serial line, with comma-separated **numeric** values: `time,pressure,temperature,acceleration,rotation,altitude` (seconds, hPa, °C, m/s², °/s, m). Optional header accepted. The physical hardware and firmware must already supply this stream; the application does not install firmware, provide a sensor wiring guide, or send device commands. Readings remain on the local machine unless explicitly downloaded/shared. The synthetic mode is a software demonstration, not a flight predictor.


## CAD Library: OpenRocket design references

The CAD Library (`cad.html`) now accepts `.ork` files alongside STL, OBJ and 3MF. It reads OpenRocket's ZIP archive containing `rocket.ork` (or its uncompressed XML form), validates size and XML structure, and shows a **non-scaled component hierarchy** with available component lengths/radii converted from meters to millimeters. The original `.ork` bytes, study notes, project tag and revision can be stored in the existing local CAD library, exported as a `.schwabcad.json` record, and reopened.

An `.ork` is not a mesh. The component hierarchy **does not represent actual surface geometry, placement, printable parts, or a validated digital twin**; the tool does not export manufacturable rocket geometry or generate slicer files from `.ork`. 8 MB maximum import, with limits for archive entries, XML length and displayed components. Existing STL/OBJ/3MF inspection remains available.
