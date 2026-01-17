# 3D Battery Monitoring Integration Guide

**Source of truth**: Aligns with spatial schema decisions in `plans/3d-battery-monitoring-schema-design.md` to describe how backend APIs, the 3D viewport, sensor simulator, and MLOps services exchange data using the new columns and tables.

---

## 1. API Layer Design

### 1.1 Spatial Battery Data Endpoints

| Endpoint | Method | Purpose | Key Query Strategies |
| --- | --- | --- | --- |
| `/api/zones/{zoneId}/viewport` | `GET` | Returns zone envelope with `boundary_coordinates`, `zone_width_m`, `zone_length_m`, `zone_height_m`, `floor_plan_image_url` for initial scene sizing. | Filter by `(facility_id, floor_level)` via `idx_zones_facility_floor`. Cache envelopes per zone because layout rarely changes. |
| `/api/batteries` | `GET` | Lists batteries filtered by `zoneId`, `status`, `rackId`, and optional bounding-box query params (`minX`, `maxX`, `minY`, `maxY`, `minZ`, `maxZ`). | Combine `idx_battery_systems_zone_status_position` with range filters on positional columns. For PostGIS-ready deployments, translate params into `ST_MakeBox3D`. |
| `/api/batteries/{batteryId}/spatial` | `GET` | Returns a single battery’s placement attributes, `display_color`, `icon_type`, and linked sensors to drive UI overlays. | Leverage PK lookup plus `sensors` join filtered by `(battery_system_id, status)` index. |
| `/api/batteries/{batteryId}/telemetry` | `GET` | Streams paginated sensor readings (cursor or `startTs/endTs`) mapped to `sensor_readings` hypertable. | Use `(battery_system_id, timestamp)` composite indexes; support `pageSize` + `nextCursor` derived from `timestamp`. |

**Sample query**

```http
GET /api/batteries?zoneId=ZONE-123&status=active&minX=0&maxX=3.5&minY=0&maxY=2.5&pageSize=50
Authorization: Bearer <token>
```

**Sample response**

```json
{
  "zoneId": "ZONE-123",
  "cursor": {
    "next": "2026-01-17T06:51:00.000Z|BAT-BKK-03"
  },
  "items": [
    {
      "batteryId": "BAT-BKK-01",
      "position": { "x": 0.0, "y": 0.0, "z": 0.0 },
      "rotation": { "pitch": 0, "yaw": 0, "roll": 0 },
      "dimensions": { "width": 0.6, "height": 1.9, "depth": 0.9 },
      "zoneBoundary": { "width": 4.0, "length": 3.0, "height": 3.2 },
      "displayColor": "#1E90FF",
      "iconType": "battery_rack",
      "model3d": "models/rack_unit.glb",
      "rackPlacement": { "rackId": "Rack-A", "bay": "U01", "offsetTemplate": "rack_standard" },
      "status": "active"
    }
  ]
}
```

_Note: Payload coordinates are zeroed; clients derive visual positions from `rackPlacement` or zone templates._

### 1.2 Sensor Simulator Control Endpoints

| Endpoint | Method | Purpose | Notes |
| --- | --- | --- | --- |
| `/api/simulations/scenarios` | `GET` | Fetches active `simulation_scenarios` for picker UI. | Supports query params `isActive`, `search`. |
| `/api/simulations/config` | `POST` | Creates or updates `battery_simulation_config` for a battery. | Body carries `batterySystemId`, `simulationScenarioId`, overrides, and `configurationJson`. Wrap write + `simulation_event_log` insert in single transaction. |
| `/api/simulations/{batteryId}/start` | `POST` | Activates configuration and enqueues simulator job. | Validates that `is_active=false` before flipping and logs `event_type='scenario_changed'`. |
| `/api/simulations/{batteryId}/stop` | `POST` | Gracefully stops active scenario. | Logs `event_type='config_updated'` and sets `end_time=now()`. |
| `/api/simulations/events` | `GET` | Returns paginated `simulation_event_log` per battery or scenario. | Filter by `(battery_system_id, created_at DESC)` index. |

**Sample start payload**

```json
{
  "batterySystemId": "BAT-PKT-02",
  "simulationScenarioId": "SCN-SAG-001",
  "customNoiseLevel": 0.015,
  "randomSeed": 9345,
  "configuration": {
    "thermalSpikes": true,
    "voltageSagPercent": 5,
    "resumeFrom": "2026-01-16T23:55:00Z"
  }
}
```

**Sample control response**

```json
{
  "batterySystemId": "BAT-PKT-02",
  "status": "started",
  "activeConfig": {
    "configId": "CFG-88c6",
    "scenario": "Thermal Sag",
    "startTime": "2026-01-17T06:54:10.000Z",
    "expectedEndTime": null
  },
  "eventLogEntryId": "EVT-12b3"
}
```

### 1.3 MLOps Insight Endpoints

| Endpoint | Method | Purpose | Query Strategies |
| --- | --- | --- | --- |
| `/api/ml/feature-store` | `GET` | Returns aggregated features filtered by `batterySystemId`, `fromTs`, `toTs`. | Partition-pruned scans on `feature_store` monthly partitions. Support `featureVersion` filter. |
| `/api/ml/models/versions` | `GET` | Lists `model_versions` with active flag, framework, metrics, and attached training dataset metadata. | Use `(model_name, is_active)` index; optionally include `?batterySystemId` to join `model_performance_per_battery`. |
| `/api/ml/predictions` | `GET` | Delivers paginated `prediction_history` with optional `predictionType`, `modelVersionId` filters. | Rely on `(battery_system_id, prediction_timestamp DESC)` index. |
| `/api/ml/drift-metrics` | `GET` | Retrieves latest `model_drift_metrics` entries. | Filter by `modelVersionId` + `driftType` and read top-N per `battery_system_id`. |

**Sample drift response**

```json
{
  "modelVersionId": "RUL-V2.3",
  "batterySystemId": "BAT-CNX-01",
  "metrics": [
    {
      "metricTimestamp": "2026-01-17T06:50:00Z",
      "driftType": "data_drift",
      "metricName": "population_stability",
      "driftScore": 0.21,
      "thresholdExceeded": true,
      "alertTriggered": true
    }
  ]
}
```

### 1.4 Authentication & Access Control

1. **OAuth2 + JWT**: All endpoints require facility-scoped bearer tokens; tokens embed `facility_ids` and role claims (`viewer`, `simulator_operator`, `ml_admin`).
2. **Fine-grained filters**: API layer enforces `facility_ids` on every `zone_id` and `battery_system_id` query to prevent cross-tenant leakage.
3. **Simulator roles**: `simulator_operator` is required for `POST /api/simulations/*`; read-only UI users can only call `GET` endpoints.
4. **Audit context**: `triggered_by` in `simulation_event_log` is filled from JWT subject; MLOps endpoints capture `X-Request-ID` for lineage.

---

## 2. 3D Viewport Integration

### 2.1 Data-Fetching Workflow

1. **Scene bootstrap**
   - Fetch `/api/zones/{zoneId}/viewport` to size the world, load floor textures, and compute clipping planes based on `zone_height_m`.
   - Warm cache with `floor_plan_image_url` and `layout_type` for UI toggles.
2. **Placement load**
   - Query `/api/batteries?zoneId=...` with bounding box covering the camera frustum. Use server-provided `cursor.next` to request additional slices when users pan/zoom.
3. **Sensor overlays**
   - Batch `batteryId` list and call `/api/batteries/{batteryId}/spatial` or `/api/batteries/{batteryId}/telemetry` for highlight states.
4. **Polling / streaming**
   - For static dashboards, poll `telemetry` every 5 s using `If-None-Match` headers (ETags derived from `sensor_readings` latest timestamp).
   - For control rooms, upgrade to WebSocket or SSE channel keyed by `battery_system_id`; server pushes delta payloads described below.

### 2.2 Metadata → Rendering Mapping

| Database Field | Rendering Usage |
| --- | --- |
| `position_x/y/z` | Persisted as `0,0,0`; renderers derive world coordinates from rack metadata or zone plans before drawing.
| `rotation_pitch/yaw/roll` | Map to Euler rotations (XYZ order). Keep units in degrees to match most rendering engines; convert to radians at shader level.
| `width_m/height_m/depth_m` | Define axis-aligned bounding box (AABB) for collisions and box geometries; also drives label placement offsets.
| `display_color` | Fills base material color channel; fallback palette when textures unavailable.
| `icon_type` + `model_3d_reference` | Select GLB/OBJ asset and instantiate GPU buffers.
| `rack_id` + `bay_position` | Anchor battery to rack rigs; drives snapping guides in UI for drag/drop planning.
| `last_maintenance_date` | Controls conditional overlays (e.g., amber outline if > 180 days).

### 2.3 Collision Detection & Bounding Boxes

- Perform client-side collision checks before sending placement updates by comparing expanded AABB volumes.
- Use derived world offsets (not the persisted zeros) to evaluate overlap:
  $$
  \text{overlap}_x = \left|x_a - x_b\right| \le \frac{w_a + w_b}{2} + c
  $$
  $$
  \text{overlap}_y = \left|y_a - y_b\right| \le \frac{d_a + d_b}{2} + c
  $$
  $$
  \text{overlap}_z = \left|z_a - z_b\right| \le \frac{h_a + h_b}{2}
  $$
  where $c$ is the clearance requirement (≥ 0.5 m). Raise a `409 Conflict` if client submits placements violating the constraint; server-side triggers also guard against invalid writes.
- Zone boundary validation uses `boundary_coordinates` polygons; on the backend, run containment checks (PostGIS `ST_Contains` or manual polygon winding tests).

### 2.4 Caching & Delta Updates

1. **Client cache**: Store placements in an indexed map keyed by `batteryId`. Each entry tracks `hash(position, rotation, status)` to detect deltas.
2. **Server delta payload**: WebSocket messages follow structure `{ batteryId, changedFields: { position, rotation, status, telemetry } }`, keeping payloads under 2 KB.
3. **Cache invalidation**: When `simulation_event_log` emits `failure_injected`, publish invalidation notifications so viewport fetches updated colors/status.
4. **Cold-start strategy**: Preload GLB assets referenced by `model_3d_reference` using `prefetch` hints; fallback to generic meshes if fetch fails.

---

## 3. Sensor Simulation Integration

### 3.1 Scenario Control Flow

1. UI operator selects a scenario via `/api/simulations/scenarios`.
2. UI posts configuration to `/api/simulations/config` specifying `startTime`, noise overrides, and metadata.
3. Backend writes config, logs previous/new state snapshots, and enqueues a simulator job (e.g., to a queue worker or Kubernetes CronJob) identified by `battery_system_id`.
4. UI calls `/api/simulations/{batteryId}/start` which flips `is_active` and returns scheduler metadata.
5. Simulator reads `battery_simulation_config` + `sensor_types` to synthesize readings.
6. Stop command triggers `/api/simulations/{batteryId}/stop`, ensuring `end_time` captured and worker receives cancellation message.

### 3.2 Data Ingestion Pipeline

```
Simulator -> HTTP/GRPC ingest -> sensor_readings hypertable -> feature_store aggregation job
```

1. **Simulator output**: Emits per-sensor messages containing `batterySystemId`, `sensorTypeId`, `readingValue`, `readingTs`, `qualityFlag`, `scenarioId`.
2. **Ingest API**: Validates sensor registration, attaches `simulation_event_log` context, and writes to `sensor_readings` partition keyed by `readingTs`.
3. **Aggregation**: A streaming job (e.g., Timescale continuous aggregate or Node worker) computes rolling stats every minute and upserts into `feature_store` with `feature_version` derived from scenario parameters.
4. **Feature-store triggers**: When anomalies detected (`anomaly_score` > threshold), insert into `prediction_history` with `prediction_type='anomaly'` and notify MLOps pipeline.
5. **Back-pressure**: Use Timescale chunk intervals sized to 1 day plus compression on chunks older than 7 days to keep ingest cost predictable.

### 3.3 Metadata Synchronization

- Every simulator mutation writes a `simulation_event_log` row with `previous_state` / `new_state`. These snapshots feed:
  - **UI timelines** showing when scenarios changed.
  - **ML feature lineage**, as `feature_store.feature_version` references the config checksum stored in the event log.
- During replay/testing, filter event logs by `scenario_changed` to reconstruct simulator timelines for debugging.

---

## 4. MLOps Workflow Integration

### 4.1 Data Flow

1. **Feature ingestion**: `sensor_readings` → rolling aggregation → `feature_store` (partitioned monthly, referencing `battery_system_id`).
2. **Dataset curation**: Offline jobs select `feature_store` slices (`start_date`, `end_date`) and persist metadata in `training_datasets` with `battery_system_ids` array.
3. **Model training**: `training_pipeline` references dataset record, trains models, uploads artifacts, and writes `model_versions` row linking to dataset + metrics.
4. **Deployment**: When promoted, set `model_versions.is_active=true`; deployment service reads `model_file_path` and hot-swaps inference containers.
5. **Prediction logging**: Inference service records outputs in `prediction_history`, capturing `feature_values_snapshot` for traceability.

### 4.2 Drift Monitoring Loop

1. Nightly or hourly job compares live `feature_store` distributions vs baseline snapshots stored in `model_versions.training_metrics`.
2. Detected drift writes to `model_drift_metrics` with `drift_type`, `drift_score`, and whether thresholds crossed.
3. Alerting service subscribes to these inserts; when `threshold_exceeded=true`, dispatch notifications (Slack/Email) and annotate dashboards.
4. UI surfaces drift overlays within the 3D viewport (e.g., color shift) by joining `model_drift_metrics` on `battery_system_id`.
5. Observability stack (Prometheus + Grafana) exposes counters for drift events per model version.

### 4.3 Model Performance Reporting

1. Batch evaluation jobs compute metrics per battery and write to `model_performance_per_battery` covering windows such as last 7/30 days.
2. `/api/ml/models/versions` optionally joins these metrics to provide precision/recall trendlines.
3. When `error_rate` exceeds SLA, backend pushes `simulation_event_log` entry tagged `failure_injected` to correlate ML behavior with simulator runs.
4. Dashboards aggregate `prediction_history.actual_value` vs `predicted_value` to visualize accuracy; historical data > 6 months is archived following retention plan.

---

## 5. Operational Considerations

### 5.1 Retry & Backoff for Streaming Ingestion

- **Simulator -> API**: Use exponential backoff with jitter (base 500 ms, cap 30 s). Mark retries in `simulation_event_log` metadata to correlate spikes.
- **API -> DB**: Wrap bulk inserts in COPY mode where possible; if hypertable chunk locks fail, retry after 2 s to avoid contention.
- **WebSocket streams**: Clients reconnect with exponential backoff but cap at 15 s to avoid thundering herds.

### 5.2 Monitoring & Alerting Hooks

1. **Ingestion lag**: Prometheus exporter tracks `sensor_readings` write latency and queue depth; alerts trigger when lag > 10 s.
2. **Simulator health**: Heartbeat endpoint `/api/simulations/health` reports active workers vs configs; alert when mismatch > 1 worker.
3. **MLOps pipelines**: emit structured logs with `model_version_id`; Grafana dashboards overlay drift counts, training job durations, and feature freshness metrics.
4. **Viewport UX**: Frontend logs stale data warnings when `telemetry` timestamp is older than 30 s, surfacing to Sentry for visibility.

### 5.3 Data Retention & Lifecycle

- Enforce policies from the schema plan using scheduled jobs:
  - `sensor_readings`: automatically drop chunks older than 30 days after aggregating into `feature_store`.
  - `prediction_history`: archive partitions > 180 days to S3/Glacier; maintain manifest for audit.
  - `simulation_event_log`: weekly purge beyond 90 days while retaining critical `failure_injected` events for 1 year in cold storage.
- Downsampled aggregates (hourly) stored in `feature_store` ensure ML teams can regenerate datasets without raw sensor data beyond 30 days.

---

## 6. Implementation Checklist

1. Expose and document REST endpoints above within backend OpenAPI spec; ensure DTOs include spatial metadata.
2. Update frontend data-access layer to chain zone envelope + placement queries before rendering, and to subscribe to simulator/ML updates.
3. Extend simulator service to honor new config tables and emit ingestion metadata for lineage.
4. Wire MLOps pipelines to read/write feature, dataset, model, prediction, and drift tables with retention-aware queries.
5. Add monitoring dashboards tying ingestion lag, simulator state, and drift alerts back to the 3D viewport for unified troubleshooting.
