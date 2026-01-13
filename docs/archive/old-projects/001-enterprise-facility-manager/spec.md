# Feature Specification: Enterprise Facility Manager

**Feature Branch**: `001-enterprise-facility-manager`
**Created**: 2026-01-08
**Status**: Draft
**Input**: User description: "Complete migration and modernization of Facility 3D Manager UI - Transform the current React facility monitoring application into a production-ready, enterprise-grade 3D facility management system with enhanced real-time monitoring, AI-powered insights, comprehensive reporting, and improved UX/performance"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Real-Time Facility Monitoring Dashboard (Priority: P1)

Facility managers need to monitor the operational status, environmental conditions, and critical alerts across all facilities in real-time from a unified dashboard. They must be able to quickly identify critical issues, view facility metrics (power usage, temperature, humidity, server load, PUE, occupancy), and navigate between regional and facility-specific views.

**Why this priority**: This is the core value proposition of the system. Without reliable real-time monitoring, facility managers cannot respond to critical infrastructure issues, leading to potential downtime, equipment damage, or safety hazards. This is the MVP that must work before any advanced features.

**Independent Test**: Can be fully tested by opening the dashboard, verifying that all facility statuses are displayed correctly, simulating facility metric changes, and confirming that alerts appear in real-time without requiring any AI or 3D visualization features.

**Acceptance Scenarios**:

1. **Given** a facility manager logs into the system, **When** they view the main dashboard, **Then** they see an overview of all facilities with current status indicators (operational, warning, critical) and key metrics displayed
2. **Given** a critical alert is triggered at any facility, **When** the alert system processes it, **Then** the alert appears in the dashboard within 2 seconds with appropriate severity indication and the facility status updates immediately
3. **Given** a facility manager is viewing the dashboard, **When** they click on a specific facility, **Then** detailed metrics panel opens showing real-time power usage, temperature, humidity, server load, PUE, and occupancy levels
4. **Given** multiple facilities have different statuses, **When** the manager views the regional map, **Then** facilities are color-coded by status and can be filtered by region (Northern, Northeastern, Central, Eastern, Southern)
5. **Given** real-time data is updating, **When** metric values change, **Then** the dashboard updates smoothly without page refresh and displays trend indicators (increasing/decreasing)

---

### User Story 2 - Interactive 3D Facility Visualization (Priority: P1)

Facility managers need to visualize the internal structure and zone status of facilities in 3D to understand spatial relationships, identify problematic zones, and assess environmental conditions across different areas of a facility. They must be able to navigate the 3D environment, inspect individual zones, and see real-time sensor data overlaid on the 3D model.

**Why this priority**: This is the differentiating feature that transforms basic monitoring into spatial intelligence. Facility managers can immediately see which physical zones have issues, understand heat distribution patterns, identify occupancy hotspots, and make informed decisions about equipment placement and HVAC optimization. This is essential MVP functionality for spatial facility management.

**Independent Test**: Can be fully tested by opening a facility's 3D view, verifying that all zones are rendered with correct dimensions and colors based on status, clicking on zones to see sensor details, and navigating the 3D space smoothly at 30+ FPS without requiring AI insights or reporting features.

**Acceptance Scenarios**:

1. **Given** a facility manager selects a facility, **When** they click "View in 3D", **Then** a 3D visualization loads showing all facility zones with color-coding based on zone status (optimal, warning, critical)
2. **Given** the 3D view is loaded, **When** the manager clicks on a specific zone, **Then** a tooltip displays zone name, status, and all sensor readings (HVAC, temperature, CO2, occupancy) with units
3. **Given** the 3D visualization is active, **When** sensor values update in real-time, **Then** zone colors change accordingly and the 3D view reflects the current state without requiring manual refresh
4. **Given** the manager is viewing a large facility, **When** they use mouse/touch controls to navigate, **Then** the 3D view maintains smooth performance (30+ FPS) and allows rotation, zoom, and pan operations
5. **Given** multiple zones have critical status, **When** the manager views the 3D model, **Then** critical zones are visually distinct (red coloring) and can be quickly identified for priority response

---

### User Story 3 - Intelligent Alert Management (Priority: P2)

Facility managers need to efficiently manage incoming alerts, understand their context and severity, track alert history, and take appropriate actions. They must be able to view all active alerts, filter by severity and category, mark alerts as read/resolved, and navigate directly to the affected facility from an alert.

**Why this priority**: While real-time monitoring shows current state, intelligent alert management enables proactive response and historical tracking. This prevents alert fatigue, ensures critical issues aren't missed, and provides accountability for incident response. It builds on P1 monitoring to make it actionable.

**Independent Test**: Can be fully tested by generating various alerts (equipment, energy, security categories with different severities), verifying filtering and sorting works, marking alerts as read, navigating to affected facilities, and confirming alert persistence across sessions without requiring AI analysis or reporting features.

**Acceptance Scenarios**:

1. **Given** an alert is generated for a facility, **When** the alert appears, **Then** it displays title, message, severity (critical, warning, info), category (equipment, energy, security), timestamp, and affected facility
2. **Given** multiple alerts exist, **When** the manager opens the alert dropdown, **Then** alerts are sorted by severity (critical first) and timestamp (newest first) with unread count badge displayed
3. **Given** the manager views an alert, **When** they click on it, **Then** the alert is marked as read, the affected facility is highlighted on the map, and the facility detail panel opens
4. **Given** alerts are accumulating, **When** the manager filters by severity or category, **Then** only matching alerts are displayed and filter selections persist during the session
5. **Given** critical alerts exist, **When** the manager views the alert list, **Then** critical alerts are visually distinct with red indicators and appear at the top of the list

---

### User Story 4 - AI-Powered Insights and Recommendations (Priority: P2)

Facility managers need AI assistance to understand complex patterns, get recommendations for optimizing facility operations, and receive predictive insights about potential issues. They interact with an AI chat widget that can answer questions about facility status, generate reports, and provide data-driven recommendations.

**Why this priority**: AI transforms reactive monitoring into proactive optimization. Facility managers can ask natural language questions, get instant insights without manual analysis, and receive recommendations that improve energy efficiency, equipment lifespan, and operational safety. This builds on P1/P2 to add intelligence layer.

**Independent Test**: Can be fully tested by asking various questions through the AI chat (facility status, energy usage patterns, optimization recommendations), verifying AI responses are contextually relevant, testing action execution (navigate to facility, generate report), and confirming error handling when AI service is unavailable, without requiring comprehensive reporting features.

**Acceptance Scenarios**:

1. **Given** the facility manager opens the AI chat widget, **When** they ask a question about facility status (e.g., "What's the status of Bangkok facilities?"), **Then** the AI responds within 5 seconds with accurate, contextually relevant information including facility names, statuses, and key metrics
2. **Given** the manager asks for recommendations, **When** they query about energy optimization (e.g., "How can we reduce energy usage?"), **Then** the AI analyzes facility data and provides specific, actionable recommendations with expected impact
3. **Given** the AI suggests an action, **When** the manager approves the action (e.g., "Navigate to Bangrak facility"), **Then** the system executes the action automatically (changes view, opens facility panel) without requiring manual navigation
4. **Given** the AI chat is processing a request, **When** the request takes time, **Then** a loading indicator is displayed and the chat remains responsive to new messages
5. **Given** the AI service is unavailable or encounters an error, **When** the manager sends a message, **Then** a friendly error message is displayed with fallback options (manual search, direct navigation) and the system remains usable

---

### User Story 5 - Comprehensive ISO-Compliant Reporting (Priority: P3)

Facility managers and compliance officers need to generate detailed incident reports, operational reports, and audit documentation that meets ISO standards (ISO-27001, ISO-22301, ISO-50001). They must be able to create reports from alerts, manually author reports, classify reports by sensitivity level, track report versions, and collaborate on report reviews.

**Why this priority**: Regulatory compliance and audit requirements demand structured documentation. This ensures facilities meet industry standards, provides legal protection during incidents, and maintains historical records for continuous improvement. While important, this can be implemented after core monitoring (P1) and AI features (P2) are stable.

**Independent Test**: Can be fully tested by creating a new report, selecting ISO standard and classification level, authoring content with structured blocks (headings, paragraphs, lists), auto-generating a report from an alert using AI, tracking version history, and exporting reports, without requiring advanced analytics or full system integration.

**Acceptance Scenarios**:

1. **Given** a facility manager needs to document an incident, **When** they create a new report, **Then** they can select ISO standard (ISO-27001, ISO-22301, ISO-50001, GENERAL), specify classification level (Public, Internal, Confidential, Restricted), and assign an ISO control ID
2. **Given** the manager is authoring a report, **When** they add content, **Then** they can use structured blocks (H1, H2, H3 headings, paragraphs, bullet lists, todo items, code blocks, AI insights) with a user-friendly editor
3. **Given** an alert requires documentation, **When** the manager selects "Auto-Draft Report from Alert", **Then** the AI generates a structured report draft including incident summary, affected facility details, metrics at time of incident, and recommended actions within 10 seconds
4. **Given** a report is being reviewed, **When** multiple users access it, **Then** they can see current status (draft, review, approved, published), version number, author, last modified timestamp, and linked alert ID if applicable
5. **Given** reports accumulate over time, **When** the manager searches or filters reports, **Then** they can find reports by ISO standard, status, classification level, date range, or full-text search across report content

---

### User Story 6 - Geospatial Facility Overview (Priority: P3)

Facility managers need to visualize facility locations on a geographical map of Thailand to understand regional distribution, identify regional patterns, assess geographical risks, and coordinate responses across nearby facilities. They must be able to see all facilities on an interactive map with real-time status indicators.

**Why this priority**: Geographical context helps managers understand regional issues (weather impacts, power grid problems, regulatory zones) and coordinate multi-facility responses. While valuable, this is less critical than core monitoring and can be implemented after P1-P2 are complete. Basic map functionality already exists in the codebase.

**Independent Test**: Can be fully tested by viewing the Thailand map, verifying all facility markers are correctly positioned, clicking on facilities to see details, filtering by region or status, and confirming that map updates reflect real-time status changes, without requiring AI features or advanced reporting.

**Acceptance Scenarios**:

1. **Given** the facility manager opens the map view, **When** the map loads, **Then** all facilities are displayed as markers on a Thailand map with color-coding by status (green=operational, yellow=warning, red=critical) and clustered appropriately at different zoom levels
2. **Given** the manager interacts with the map, **When** they click on a facility marker, **Then** a popup displays facility name, region, current status, and key metrics with an option to open detailed view
3. **Given** multiple facilities in a region have issues, **When** the manager views the map, **Then** regional patterns are visually apparent through marker clustering and color distribution
4. **Given** the manager wants to focus on a specific region, **When** they select a region filter (Northern, Northeastern, Central, Eastern, Southern), **Then** the map zooms to that region and highlights only facilities in that region
5. **Given** facility statuses change in real-time, **When** an alert triggers, **Then** the corresponding map marker updates its color immediately without requiring page refresh

---

### Edge Cases

- **What happens when a facility is offline or unresponsive?** The system displays the facility with a distinct "offline" status indicator, shows last known metrics with timestamps, generates a critical alert, and provides a troubleshooting checklist for connectivity issues.

- **What happens when the AI service is unavailable?** The chat widget displays a clear "AI service temporarily unavailable" message, suggests alternative actions (manual search, direct navigation, FAQ), and allows users to continue using all non-AI features without degradation.

- **What happens when 3D visualization fails to load or render?** The system automatically falls back to a 2D schematic view or tabular zone listing, logs the error for debugging, and displays a message explaining the fallback with an option to retry 3D rendering.

- **What happens when real-time data updates fail?** The system displays a warning indicator showing "Last updated: [timestamp]", continues showing cached data, automatically retries connection in the background, and notifies the manager when live data resumes.

- **What happens when a facility has thousands of historical alerts?** The system implements pagination (50 alerts per page), provides date range filters, allows searching by keywords, and archives alerts older than 90 days (configurable) to maintain performance.

- **What happens when multiple critical alerts trigger simultaneously?** The system prioritizes by severity and facility criticality, prevents notification spam by grouping related alerts, displays a count badge, and provides a "View all critical alerts" action.

- **What happens when a user has slow network connectivity?** The system loads critical monitoring data first (statuses, alerts), defers loading of 3D visualizations and AI features, shows progressive loading indicators, and provides a "low bandwidth mode" option.

- **What happens when generating a large report with many AI insights?** The system displays progress indicators, allows cancellation, generates the report in chunks to prevent timeout, and saves drafts automatically to prevent data loss.

- **What happens when a facility metric exceeds safety thresholds?** The system immediately generates a critical alert, visually highlights the facility and affected zone in red, sends notifications to designated personnel, and provides emergency response protocols.

- **What happens during facility maintenance or scheduled downtime?** The system allows marking facilities as "Under Maintenance" status, suppresses routine alerts for that facility, displays maintenance schedule and expected resolution time, and automatically returns to normal monitoring when maintenance completes.

## Requirements *(mandatory)*

### Functional Requirements

#### Real-Time Monitoring & Data

- **FR-001**: System MUST display real-time status (operational, warning, critical, offline) for all facilities on the main dashboard with visual indicators
- **FR-002**: System MUST update facility metrics (power usage, temperature, humidity, server load, PUE, occupancy) in real-time with updates propagated within 2 seconds of data changes
- **FR-003**: System MUST support monitoring of facilities across five regions (Northern, Northeastern, Central, Eastern, Southern) with regional filtering capabilities
- **FR-004**: System MUST calculate and display Power Usage Effectiveness (PUE) metric for each facility with historical trending
- **FR-005**: System MUST persist facility data, metrics history, and configuration with automatic data retention management (configurable retention period, default 90 days for detailed metrics, 2 years for aggregated data)

#### 3D Visualization

- **FR-006**: System MUST render 3D visualizations of facility layouts with zones represented as 3D boxes with configurable dimensions and positions
- **FR-007**: System MUST color-code 3D zones based on status (optimal=green, warning=yellow, critical=red) with smooth color transitions
- **FR-008**: System MUST display zone-specific sensor data (HVAC, temperature, CO2, occupancy) when users interact with 3D zones via click or hover
- **FR-009**: System MUST maintain minimum 30 FPS performance for 3D visualizations with up to 50 zones per facility view
- **FR-010**: System MUST provide 3D navigation controls (rotate, zoom, pan) using mouse/trackpad/touch with intuitive gesture support
- **FR-011**: System MUST provide 2D fallback visualization when 3D rendering fails or is unavailable, displaying same zone information in tabular or schematic format

#### Alert Management

- **FR-012**: System MUST generate alerts automatically when metrics exceed configured thresholds with three severity levels (critical, warning, info)
- **FR-013**: System MUST categorize alerts by type (equipment, energy, security) with appropriate icons and color coding
- **FR-014**: System MUST display unread alert count badge and sort alerts by severity (critical first) then timestamp (newest first)
- **FR-015**: System MUST allow users to mark alerts as read, filter alerts by severity and category, and navigate to affected facility from alert
- **FR-016**: System MUST retain alert history with pagination (50 alerts per page) and provide search/filter capabilities across historical alerts
- **FR-017**: System MUST support configurable alert thresholds per facility with inheritance from default values and override capabilities

#### AI-Powered Insights

- **FR-018**: System MUST provide conversational AI chat interface that accepts natural language questions about facility status, metrics, and recommendations
- **FR-019**: AI MUST respond to user queries within 5 seconds with contextually relevant information including facility data, trends, and analysis
- **FR-020**: AI MUST support action execution including navigation to facilities, opening 3D views, generating reports, and filtering data based on natural language commands
- **FR-021**: AI MUST generate structured report drafts from alerts within 10 seconds including incident summary, facility context, metrics, and recommendations
- **FR-022**: System MUST provide graceful fallback when AI service is unavailable including error messages, alternative actions, and continued access to non-AI features
- **FR-023**: AI MUST use facility context including current metrics, historical patterns, alert history, and regional data to provide accurate and relevant recommendations

#### Reporting & Compliance

- **FR-024**: System MUST support creating reports with ISO standard selection (ISO-27001, ISO-22301, ISO-50001, GENERAL) and classification levels (Public, Internal, Confidential, Restricted)
- **FR-025**: System MUST provide structured report editor with block types (H1/H2/H3 headings, paragraphs, bullet lists, todo items, code blocks, AI insights)
- **FR-026**: System MUST track report metadata including author, version number, creation date, last modified date, status (draft/review/approved/published), and linked alert ID
- **FR-027**: System MUST support auto-generation of report drafts from alerts using AI with editable content and structure
- **FR-028**: System MUST provide report search and filtering by ISO standard, status, classification, date range, and full-text search across report content
- **FR-029**: System MUST implement version control for reports with ability to view version history and restore previous versions
- **FR-030**: System MUST export reports in standard formats (PDF, formatted text) with proper ISO standard formatting and classification watermarks

#### User Interface & Experience

- **FR-031**: System MUST provide responsive layout that works on desktop (1920x1080+), tablet (768x1024+), and mobile (375x667+) devices with appropriate UI adaptations
- **FR-032**: System MUST maintain session state including selected facility, active view, filter selections, and chat history across page refreshes
- **FR-033**: System MUST provide keyboard navigation support for all primary functions with visible focus indicators and ARIA labels
- **FR-034**: System MUST display loading indicators for operations taking longer than 500ms with progress indication where applicable
- **FR-035**: System MUST implement error boundaries that catch rendering errors, display user-friendly error messages, and allow recovery without full page reload
- **FR-036**: System MUST support multiple simultaneous views including map view, facility detail panels, 3D visualizations, and chat widget without performance degradation

#### Performance & Scalability

- **FR-037**: System MUST load initial dashboard view within 3 seconds on 3G network connection with critical data displayed first
- **FR-038**: System MUST support concurrent monitoring of up to 100 facilities with real-time updates without performance degradation
- **FR-039**: System MUST handle up to 1000 concurrent users viewing the dashboard simultaneously
- **FR-040**: System MUST implement efficient data fetching with request batching, caching, and incremental updates to minimize network traffic
- **FR-041**: System MUST optimize bundle size to keep main application bundle under 500KB gzipped

#### Security & Authentication

- **FR-042**: System MUST implement user authentication with secure session management and automatic session timeout after 30 minutes of inactivity
- **FR-043**: System MUST provide logout functionality that terminates session, clears sensitive data, and redirects to login page
- **FR-044**: System MUST store API keys and sensitive configuration in environment variables with no hardcoded credentials in source code
- **FR-045**: System MUST validate all user inputs before processing to prevent injection attacks and malformed data
- **FR-046**: System MUST implement audit logging for all report modifications, alert actions, and configuration changes with user attribution and timestamps

### Key Entities

- **Facility (Branch)**: Represents a physical facility location with properties including unique identifier, name, geographical region (Northern/Northeastern/Central/Eastern/Southern), GPS coordinates (latitude, longitude), operational status (operational, warning, critical, offline), and real-time metrics (power usage in kW, temperature in Celsius, humidity percentage, server load percentage, PUE value, occupancy count). Related to multiple Zones, Alerts, and Reports.

- **Zone**: Represents a physical area within a facility with properties including unique identifier, name, 3D position coordinates (x, y, z), 3D dimensions (width, height, depth), status (optimal, warning, critical), and sensor readings. Each Zone contains multiple Sensors and belongs to one Facility. Zones are the primary unit for spatial monitoring and 3D visualization.

- **Sensor**: Represents a monitoring device within a zone with properties including unique identifier, type (HVAC, temperature, CO2, occupancy), current value, unit of measurement, and last update timestamp. Each Sensor belongs to one Zone and provides real-time telemetry data for environmental monitoring.

- **Alert**: Represents a system-generated notification with properties including unique identifier, associated facility identifier, title, descriptive message, severity level (critical, warning, info), category (equipment, energy, security), timestamp, read status (boolean), and optional link to generated report. Alerts are generated automatically when metrics exceed thresholds and can be manually marked as read or archived.

- **Report**: Represents a compliance or incident documentation with properties including unique identifier, title, selected ISO standard (ISO-27001/ISO-22301/ISO-50001/GENERAL), ISO control identifier, classification level (Public/Internal/Confidential/Restricted), author name, version number, creation timestamp, last modified timestamp, status (draft/review/approved/published), structured content blocks, and optional linked alert identifier. Reports support version control and can be auto-generated from alerts or manually authored.

- **User**: Represents an authenticated user with properties including unique identifier, username, role (facility manager, compliance officer, administrator), authentication session details, preferences (default view, notification settings), and activity history. Users have access to different features based on their role and create Reports and manage Alerts.

- **Metric History**: Represents time-series data for facility metrics with properties including facility identifier, metric type (power, temperature, humidity, load, PUE, occupancy), timestamp, recorded value, and aggregation level (raw/hourly/daily). Used for trending, historical analysis, and AI-powered insights. Data retention is tiered based on age.

- **Chat Session**: Represents an AI chat interaction with properties including session identifier, user identifier, conversation history (messages with timestamps and roles), executed actions, and context (selected facility, active view). Chat sessions persist during user session and are used to maintain conversation context for AI responses.

## Success Criteria *(mandatory)*

### Measurable Outcomes

#### Performance Metrics

- **SC-001**: Dashboard loads and displays facility status within 3 seconds on 3G network connection for 95% of page loads
- **SC-002**: Real-time metric updates propagate to dashboard within 2 seconds of data changes for 99% of updates
- **SC-003**: 3D facility visualizations maintain 30+ FPS framerate during navigation and rendering for facilities with up to 50 zones
- **SC-004**: AI chat responses are delivered within 5 seconds for 90% of queries
- **SC-005**: System supports 100 monitored facilities with concurrent real-time updates without degradation
- **SC-006**: System handles 1000 concurrent users viewing dashboards simultaneously with response times under 1 second
- **SC-007**: Main application bundle size remains under 500KB gzipped

#### User Experience Metrics

- **SC-008**: Facility managers can identify critical facility issues from dashboard within 10 seconds of login
- **SC-009**: Users can navigate from alert notification to affected facility 3D view in under 3 clicks
- **SC-010**: Facility managers successfully complete primary monitoring tasks (check status, review alerts, view 3D facility) on first attempt without training in 90% of cases
- **SC-011**: System maintains usability on mobile devices with 85% feature parity compared to desktop experience
- **SC-012**: Users can complete full incident documentation workflow (alert to published report) in under 10 minutes

#### Reliability Metrics

- **SC-013**: System maintains 99.9% uptime for core monitoring features (dashboard, alerts, status display)
- **SC-014**: Zero data loss occurs during real-time metric updates and alert generation
- **SC-015**: System gracefully handles AI service unavailability without impacting core monitoring functionality in 100% of cases
- **SC-016**: 3D visualization fallback to 2D view occurs within 2 seconds when rendering fails

#### Business Impact Metrics

- **SC-017**: Mean time to identify critical facility issues decreases by 60% compared to manual monitoring
- **SC-018**: Incident response time (from alert to action) improves by 50% compared to previous system
- **SC-019**: Energy optimization recommendations from AI reduce average facility PUE by 5-10% within 3 months of implementation
- **SC-020**: ISO compliance report generation time reduces from 2 hours to 15 minutes (87.5% reduction)
- **SC-021**: System reduces support tickets related to facility monitoring confusion by 70%
- **SC-022**: Facility managers report 80%+ satisfaction with real-time monitoring capabilities in user surveys

#### Scale & Growth Metrics

- **SC-023**: System architecture supports scaling to 500 facilities without requiring major redesign
- **SC-024**: Adding new facility to monitoring system takes under 5 minutes of configuration time
- **SC-025**: System handles alert volumes of up to 10,000 alerts per day without performance degradation

## Assumptions

1. **Network Infrastructure**: Assumes facilities have reliable internet connectivity for real-time telemetry data transmission. Temporary disconnections are handled gracefully with cached data, but extended outages require manual intervention.

2. **Data Sources**: Assumes facility sensor data is available via existing APIs or data streams with standardized formats. Integration with proprietary facility management systems is out of scope unless APIs are documented.

3. **AI Service**: Assumes Google Gemini API is available and accessible with appropriate rate limits and quota. API key management and billing are handled externally. Fallback to non-AI features is standard when service is unavailable.

4. **Authentication System**: Assumes basic session-based authentication is sufficient. Enterprise SSO integration (SAML, OAuth2) may be required later but is not in MVP scope. User provisioning is manual initially.

5. **Browser Support**: Assumes modern browser support (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+) with WebGL capabilities for 3D rendering. Legacy browser support (IE11) is explicitly excluded.

6. **Facility Data Model**: Assumes facilities can be represented with the defined structure (regions, zones, sensors). Custom facility types or complex multi-building campuses may require schema extensions.

7. **ISO Compliance**: Assumes report templates and structure meet basic ISO standard requirements. Legal review and official compliance certification is out of scope and must be performed separately.

8. **Data Retention**: Assumes 90-day detailed metric retention and 2-year aggregated data retention is sufficient for operational needs. Longer retention for compliance purposes requires separate archival system.

9. **Concurrent Users**: Assumes typical usage pattern where not all 1000 users are actively monitoring simultaneously. Peak load testing validates 1000 concurrent connections but average load expected to be 20-30% of maximum.

10. **3D Model Complexity**: Assumes facilities have 10-50 zones on average. Extremely large facilities (100+ zones) may require progressive loading or level-of-detail optimizations not in initial scope.

11. **Mobile Usage**: Assumes mobile access is secondary to desktop usage. Mobile interface prioritizes monitoring and alerts over full 3D visualization and report authoring capabilities.

12. **Language Support**: Assumes Thai language support for facility names and basic UI elements based on existing codebase (Thai facility names in constants.ts). Full internationalization (i18n) is future enhancement.

13. **Performance Baselines**: Assumes performance targets are measured under normal network conditions (3G = 2 Mbps, 50ms latency). Extreme network conditions may degrade experience despite optimizations.

14. **AI Training**: Assumes AI model has general knowledge about facility management, HVAC systems, and energy optimization. Domain-specific training on company facilities is aspirational enhancement.

15. **Alert Thresholds**: Assumes default alert thresholds are provided based on industry standards. Fine-tuning thresholds per facility type and climate zone is expected post-deployment activity.
