
import { useMemo, useState } from "react";
import Navbar from "./Navbar";
import "./Issues.css";

interface IssuesProps {
  darkMode: boolean;
  setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
  currentPage: "dashboard" | "issues" | "analytics" | "reviews";
  setCurrentPage: React.Dispatch<
    React.SetStateAction<
      "dashboard" | "issues" | "analytics" | "reviews"
    >
  >;
  onLogoClick: () => void;
  analyzed: boolean;
  analyzedAppId: string;
}

type Priority = "Critical" | "High" | "Medium" | "Low";

type IssueStatus =
  | "Detected"
  | "Investigating"
  | "In Progress"
  | "Resolved";

type Sentiment = "positive" | "negative";

/**
 * ============================================================
 * BACKEND HANDOFF: ISSUE DATA CONTRACT
 * ============================================================
 *
 * This is the data shape currently expected by the Issues UI.
 * The backend response should match this interface, or the
 * frontend should transform the response before displaying it.
 *
 * Proposed endpoint:
 * GET /api/games/{appId}/issues
 *
 * Suggested field meanings:
 * - name: issue category identified from player reviews.
 * - mentions: number of reviews associated with this category.
 * - negative / positive: sentiment counts for those reviews.
 * - helpfulVotes: helpful-vote metric for associated reviews.
 * - description: summary of the issue.
 * - priority: priority assigned by agreed analysis rules.
 * - examples: representative review text and its sentiment.
 * - trend: historical activity values for the trend chart.
 *
 * This is a proposed frontend contract, not an existing API.
 * Agree on field names and calculations with the backend
 * developer before implementing the endpoint.
 */
interface Issue {
  name: string;
  mentions: number;
  negative: number;
  positive: number;
  helpfulVotes: number;
  description: string;
  priority: Priority;
  examples: {
    type: Sentiment;
    text: string;
  }[];
  trend: number[];
}

/**
 * BACKEND TODO: REPLACE THIS DEMO ARRAY WITH API DATA
 *
 * These values are hardcoded sample data for UI development.
 * Once the backend is available, fetch issues for analyzedAppId
 * from GET /api/games/{appId}/issues and store the response in
 * React state instead of relying on this array.
 *
 * The backend should derive issue counts and sentiment from
 * reviews stored in the database. Do not present these sample
 * values as actual Steam statistics.
 *
 * Keeping demoIssues as a fallback during development is fine,
 * provided the UI continues to identify the data as illustrative.
 */
const demoIssues: Issue[] = [
  {
    name: "Performance",
    mentions: 932,
    negative: 728,
    positive: 204,
    helpfulVotes: 14.2,
    priority: "Critical",
    description:
      "Players frequently mention performance problems that affect gameplay, including frame drops and inconsistent performance.",
    examples: [
      {
        type: "negative",
        text: "Performance problems make the game difficult to enjoy.",
      },
      {
        type: "negative",
        text: "Frame drops become very noticeable during combat.",
      },
      {
        type: "positive",
        text: "The game looks great when performance is stable.",
      },
    ],
    trend: [42, 55, 48, 68, 61, 83, 100],
  },
  {
    name: "Inventory",
    mentions: 821,
    negative: 594,
    positive: 227,
    helpfulVotes: 11.8,
    priority: "High",
    description:
      "Players discuss inventory organization, item management, and difficulties managing large amounts of equipment and materials.",
    examples: [
      {
        type: "negative",
        text: "Managing the inventory becomes frustrating after collecting more items.",
      },
      {
        type: "negative",
        text: "There should be better sorting and filtering options.",
      },
      {
        type: "positive",
        text: "The inventory system works well once you understand it.",
      },
    ],
    trend: [70, 63, 72, 57, 61, 48, 42],
  },
  {
    name: "Bugs",
    mentions: 523,
    negative: 401,
    positive: 122,
    helpfulVotes: 9.6,
    priority: "High",
    description:
      "Players report bugs and unexpected behavior that can interfere with gameplay and progression.",
    examples: [
      {
        type: "negative",
        text: "I encountered several bugs during my playthrough.",
      },
      {
        type: "negative",
        text: "Some quests do not behave as expected.",
      },
      {
        type: "positive",
        text: "Most of the issues I encountered were minor.",
      },
    ],
    trend: [34, 40, 38, 52, 46, 59, 65],
  },
  {
    name: "Multiplayer",
    mentions: 482,
    negative: 317,
    positive: 165,
    helpfulVotes: 12.4,
    priority: "Medium",
    description:
      "Players discuss multiplayer connectivity, matchmaking, and the overall quality of the online experience.",
    examples: [
      {
        type: "negative",
        text: "Multiplayer connections can become unstable during longer sessions.",
      },
      {
        type: "negative",
        text: "Matchmaking sometimes takes too long.",
      },
      {
        type: "positive",
        text: "Playing with friends makes the experience much better.",
      },
    ],
    trend: [58, 52, 61, 45, 50, 42, 38],
  },
];

/**
 * BACKEND NOTE: These are initial demonstration statuses.
 *
 * They currently exist only in frontend memory. If statuses should
 * survive refreshes or be shared among developers, the backend
 * should read and write them in SQL using a stable issue ID and
 * the selected game's appId.
 *
 * A proposed status endpoint is:
 * PATCH /api/games/{appId}/issues/{issueId}/status
 *
 * Example request body:
 * { "status": "Investigating" }
 *
 * Coordinate the final database schema and API contract with
 * the backend developer. Do not use issue name alone as a permanent
 * identifier if the backend can provide a stable issue ID.
 */
const initialStatuses: Record<string, IssueStatus> = {
  Performance: "Investigating",
  Inventory: "Detected",
  Bugs: "In Progress",
  Multiplayer: "Detected",
};

function Issues({
  darkMode,
  setDarkMode,
  currentPage,
  setCurrentPage,
  onLogoClick,
  analyzed,
  analyzedAppId,
}: IssuesProps) {
  const [selectedIssueName, setSelectedIssueName] =
    useState("Performance");

  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortBy, setSortBy] = useState("mentions");

  /**
   * BACKEND TODO: PERSIST STATUS CHANGES
   *
   * For now, changing a status only updates this component's
   * React state; a page reload resets it to initialStatuses.
   *
   * Once the API is implemented:
   * 1. Send the selected status to the backend.
   * 2. Let the backend validate and save it to SQL.
   * 3. Update this state after a successful response.
   * 4. Show an error if saving fails.
   *
   * When loading issue data, also load saved statuses from the API.
   */
  const [statuses, setStatuses] =
    useState<Record<string, IssueStatus>>(initialStatuses);

  /**
   * FRONTEND FILTERING AND SORTING
   *
   * This currently filters the local demoIssues array.
   * Search, priority, status, category, and sorting can remain
   * client-side if the API returns a small set of issues.
   *
   * For larger datasets, the backend could support query parameters
   * such as ?search=performance&priority=High&status=Detected.
   * These are suggestions only; no such endpoint is implemented here.
   *
   * If filtering moves server-side, replace demoIssues with the
   * fetched data and keep the filter behavior consistent.
   */
  const filteredIssues = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return demoIssues
      .filter((issue) => {
        const matchesSearch =
          !query ||
          issue.name.toLowerCase().includes(query) ||
          issue.description.toLowerCase().includes(query) ||
          issue.examples.some((example) =>
            example.text.toLowerCase().includes(query)
          );

        const matchesPriority =
          priorityFilter === "All" ||
          issue.priority === priorityFilter;

        const matchesStatus =
          statusFilter === "All" ||
          (statuses[issue.name] ?? "Detected") === statusFilter;

        const matchesCategory =
          categoryFilter === "All" ||
          issue.name === categoryFilter;

        return (
          matchesSearch &&
          matchesPriority &&
          matchesStatus &&
          matchesCategory
        );
      })
      .sort((a, b) => {
        if (sortBy === "mentions") {
          return b.mentions - a.mentions;
        }

        if (sortBy === "negative") {
          return (
            b.negative / b.mentions -
            a.negative / a.mentions
          );
        }

        if (sortBy === "priority") {
          const rank: Record<Priority, number> = {
            Critical: 0,
            High: 1,
            Medium: 2,
            Low: 3,
          };

          return rank[a.priority] - rank[b.priority];
        }

        return a.name.localeCompare(b.name);
      });
  }, [
    searchQuery,
    priorityFilter,
    statusFilter,
    categoryFilter,
    sortBy,
    statuses,
  ]);

  /**
   * BACKEND TODO: SELECTED ISSUE
   *
   * This looks up the selected issue in the demo array.
   * When issues come from the API, look up the selected issue in
   * the fetched issue state instead. If issues have stable IDs,
   * store the selected issue ID rather than its display name.
   */
  const selectedIssue =
    demoIssues.find((issue) => issue.name === selectedIssueName) ??
    demoIssues[0];

  /**
   * SUMMARY METRICS
   *
   * These totals are calculated from demoIssues. When live issue
   * data is loaded, calculate them from the fetched records or
   * use summary metrics returned by the backend.
   *
   * Confirm with the backend developer whether "mentions" means
   * unique reviews or total category mentions. A single review may
   * mention more than one issue, so category totals may overlap.
   */
  const totalMentions = demoIssues.reduce(
    (total, issue) => total + issue.mentions,
    0
  );

  const totalNegative = demoIssues.reduce(
    (total, issue) => total + issue.negative,
    0
  );

  const negativePercentage = Math.round(
    (totalNegative / totalMentions) * 100
  );

  const highPriorityCount = demoIssues.filter(
    (issue) =>
      issue.priority === "Critical" ||
      issue.priority === "High"
  ).length;

  const resolvedCount = demoIssues.filter(
    (issue) => statuses[issue.name] === "Resolved"
  ).length;

  const selectedStatus = statuses[selectedIssue.name] ?? "Detected";

  const changeStatus = (name: string, status: IssueStatus) => {
    // BACKEND TODO: Send this change to the status API before
    // treating it as saved. This handler currently updates local
    // state only and does not persist anything to the database.
    setStatuses((previous) => ({
      ...previous,
      [name]: status,
    }));
  };

  const clearFilters = () => {
    setSearchQuery("");
    setPriorityFilter("All");
    setStatusFilter("All");
    setCategoryFilter("All");
    setSortBy("mentions");
  };

  return (
    <div
      className={`issues-page ${darkMode ? "issues-dark" : ""}`}
    >
      <Navbar
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        onLogoClick={onLogoClick}
      />

      <main className="issues-main">
        {/* PAGE HEADER */}
        <section className="issues-header">
          <span className="issues-label">
            <span className="issues-live-dot" />
            GAMESCOPE / ISSUE INTELLIGENCE
          </span>

          <div className="issues-heading-row">
            <div>
              <h1>Issue Intelligence</h1>
              <p>
                Turn player feedback into actionable insights.
                Discover recurring problems, examine review evidence,
                and track the issues that matter most.
              </p>
            </div>

            <div className="issues-analysis-badge">
              <span className="issues-badge-dot" />
              {analyzed ? "ANALYSIS SELECTED" : "DEMO ANALYSIS"}
              {analyzed && analyzedAppId && (
                <small>App ID: {analyzedAppId}</small>
              )}
            </div>
          </div>
        </section>

        {/* SUMMARY CARDS */}
        <section className="issues-stats">
          <div className="issues-stat-card stat-purple">
            <span className="stat-icon">◎</span>
            <span className="stat-label">ISSUE CATEGORIES</span>
            <strong>{demoIssues.length}</strong>
            <small>Recurring topics identified</small>
          </div>

          <div className="issues-stat-card stat-blue">
            <span className="stat-icon">▤</span>
            <span className="stat-label">ISSUE MENTIONS</span>
            <strong>{totalMentions.toLocaleString()}</strong>
            <small>Across tracked categories</small>
          </div>

          <div className="issues-stat-card stat-red">
            <span className="stat-icon">↗</span>
            <span className="stat-label">NEGATIVE ASSOCIATION</span>
            <strong>{negativePercentage}%</strong>
            <small>Negative issue mentions</small>
          </div>

          <div className="issues-stat-card stat-amber">
            <span className="stat-icon">⚑</span>
            <span className="stat-label">HIGH PRIORITY</span>
            <strong>{highPriorityCount}</strong>
            <small>Critical or high-priority categories</small>
          </div>
        </section>

        {/* FILTERS AND ISSUE LIST */}
        <section className="issues-card issues-browser">
          <div className="issues-card-header">
            <div>
              <span className="issues-card-label">
                REVIEW ANALYSIS
              </span>
              <h2>Detected Issues</h2>
              <p className="issues-section-subtitle">
                Select an issue to inspect its evidence and update its status.
              </p>
            </div>

            <span className="issues-card-count">
              {filteredIssues.length} of {demoIssues.length}
            </span>
          </div>

          <div className="issues-filters">
            <label className="issues-search">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder="Search issues or review text..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                aria-label="Search issues"
              />
            </label>

            <label className="issues-filter-control">
              <span>Priority</span>
              <select
                value={priorityFilter}
                onChange={(event) =>
                  setPriorityFilter(event.target.value)
                }
              >
                <option value="All">All priorities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </label>

            <label className="issues-filter-control">
              <span>Status</span>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
              >
                <option value="All">All statuses</option>
                <option value="Detected">Detected</option>
                <option value="Investigating">Investigating</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </label>

            <label className="issues-filter-control">
              <span>Category</span>
              <select
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(event.target.value)
                }
              >
                <option value="All">All categories</option>
                {demoIssues.map((issue) => (
                  <option key={issue.name} value={issue.name}>
                    {issue.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="issues-filter-control">
              <span>Sort by</span>
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
              >
                <option value="mentions">Most mentions</option>
                <option value="negative">Most negative</option>
                <option value="priority">Highest priority</option>
                <option value="name">Name A–Z</option>
              </select>
            </label>

            <button
              type="button"
              className="issues-clear-button"
              onClick={clearFilters}
            >
              Reset filters
            </button>
          </div>

          <div className="issues-list">
            {filteredIssues.map((issue) => {
              const negativeRate = Math.round(
                (issue.negative / issue.mentions) * 100
              );

              const mentionRate = Math.round(
                (issue.mentions / demoIssues[0].mentions) * 100
              );

              const status = statuses[issue.name] ?? "Detected";

              return (
                <button
                  type="button"
                  className={`issue-row ${
                    selectedIssue.name === issue.name ? "selected" : ""
                  }`}
                  key={issue.name}
                  onClick={() => setSelectedIssueName(issue.name)}
                  aria-pressed={selectedIssue.name === issue.name}
                >
                  <div className="issue-row-top">
                    <div className="issue-row-title">
                      <strong>{issue.name}</strong>
                      <span>
                        {issue.mentions.toLocaleString()} mentions
                      </span>
                    </div>

                    <div className="issue-row-badges">
                      <span
                        className={`priority-badge priority-${issue.priority.toLowerCase()}`}
                      >
                        {issue.priority}
                      </span>

                      <span
                        className={`status-badge status-${status
                          .toLowerCase()
                          .replace(/\s+/g, "-")}`}
                      >
                        {status}
                      </span>
                    </div>
                  </div>

                  <div className="issue-row-bottom">
                    <div className="issue-progress">
                      <div
                        className="issue-progress-fill"
                        style={{ width: `${mentionRate}%` }}
                      />
                    </div>

                    <div className="issue-row-metrics">
                      <span>{negativeRate}% negative</span>
                      <strong>{issue.mentions.toLocaleString()}</strong>
                    </div>
                  </div>
                </button>
              );
            })}

            {filteredIssues.length === 0 && (
              <div className="issues-empty-state">
                <span>⌕</span>
                <h3>No matching issues</h3>
                <p>
                  Try another search term or remove some filters.
                </p>
                <button
                  type="button"
                  className="issues-primary-button"
                  onClick={clearFilters}
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </section>

        {/* SELECTED ISSUE DETAILS */}
        <section className="issue-detail-grid">
          <div className="issues-card issue-detail-card">
            <div className="issues-card-header">
              <div>
                <span className="issues-card-label">
                  ISSUE BREAKDOWN
                </span>
                <h2>{selectedIssue.name}</h2>
              </div>

              <span
                className={`priority-badge priority-${selectedIssue.priority.toLowerCase()}`}
              >
                {selectedIssue.priority} priority
              </span>
            </div>

            <p className="issue-description">
              {selectedIssue.description}
            </p>

            <div className="issue-status-editor">
              <label htmlFor="issue-status-select">
                Issue status
              </label>

              <select
                id="issue-status-select"
                value={selectedStatus}
                onChange={(event) =>
                  changeStatus(
                    selectedIssue.name,
                    event.target.value as IssueStatus
                  )
                }
              >
                <option value="Detected">Detected</option>
                <option value="Investigating">Investigating</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>

              <span className="issues-status-note">
                Demo only · status is not saved to the database yet
              </span>
            </div>

            <div className="issue-detail-stats">
              <div>
                <span>MENTIONS</span>
                <strong>
                  {selectedIssue.mentions.toLocaleString()}
                </strong>
              </div>

              <div>
                <span>NEGATIVE</span>
                <strong>
                  {Math.round(
                    (selectedIssue.negative /
                      selectedIssue.mentions) *
                      100
                  )}
                  %
                </strong>
              </div>

              <div>
                <span>POSITIVE</span>
                <strong>
                  {Math.round(
                    (selectedIssue.positive /
                      selectedIssue.mentions) *
                      100
                  )}
                  %
                </strong>
              </div>

              <div>
                <span>AVG. HELPFUL VOTES</span>
                <strong>{selectedIssue.helpfulVotes}</strong>
              </div>
            </div>

            <div className="issue-sentiment">
              <div className="sentiment-bar">
                <div
                  className="sentiment-negative"
                  style={{
                    width: `${
                      (selectedIssue.negative /
                        selectedIssue.mentions) *
                      100
                    }%`,
                  }}
                />

                <div
                  className="sentiment-positive"
                  style={{
                    width: `${
                      (selectedIssue.positive /
                        selectedIssue.mentions) *
                      100
                    }%`,
                  }}
                />
              </div>

              <div className="sentiment-legend">
                <span>
                  <i className="legend-dot negative-dot" />
                  Negative feedback
                </span>
                <span>
                  <i className="legend-dot positive-dot" />
                  Positive feedback
                </span>
              </div>
            </div>

            <div className="issues-recommendation">
              <span className="recommendation-icon">✦</span>
              <div>
                <strong>Suggested next step</strong>
                <p>
                  {selectedIssue.name === "Performance"
                    ? "Investigate frame-rate drops and compare player reports against recent game updates."
                    : selectedIssue.name === "Inventory"
                    ? "Review inventory sorting, filtering, and item-management workflows."
                    : selectedIssue.name === "Bugs"
                    ? "Group similar bug reports and investigate reproducible gameplay problems."
                    : "Examine connection stability and matchmaking feedback across player reports."}
                </p>
                <small>
                  Suggested from the issue category, not a verified root cause.
                </small>
              </div>
            </div>
          </div>

          {/* PLAYER REVIEW EVIDENCE
              BACKEND TODO:
              These are currently hardcoded examples. Replace them with
              real review text associated with the selected issue.
              Proposed endpoint:
              GET /api/games/{appId}/issues/{issueId}/reviews
              Return only fields actually stored or available, such as
              review text, sentiment, and helpful-vote count.
              Keep account identifiers out of the UI if reviews are
              intended to remain anonymous in GameScope.
          */}
          <div className="issues-card feedback-card">
            <div className="issues-card-header">
              <div>
                <span className="issues-card-label">
                  PLAYER FEEDBACK
                </span>
                <h2>Review Evidence</h2>
                <p className="issues-section-subtitle">
                  Example comments associated with this issue.
                </p>
              </div>
              <span className="issues-card-count">
                {selectedIssue.examples.length} examples
              </span>
            </div>

            <div className="issue-examples">
              {selectedIssue.examples.map((example, index) => (
                <article className="issue-example" key={index}>
                  <div className="example-heading">
                    <span
                      className={`example-type ${example.type}`}
                    >
                      <span>
                        {example.type === "positive" ? "+" : "−"}
                      </span>
                      {example.type === "positive"
                        ? "Positive"
                        : "Negative"}
                    </span>

                    <span className="example-number">
                      REVIEW EXAMPLE {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <p>“{example.text}”</p>
                </article>
              ))}
            </div>

            <div className="issues-evidence-note">
              <span>ⓘ</span>
              <p>
                These are illustrative examples. Connect the review
                pipeline to display actual Steam review text here.
              </p>
            </div>
          </div>
        </section>

        {/* ISSUE TRENDS
            BACKEND TODO:
            trend currently contains seven hardcoded relative values,
            not dated review counts. Real trend analysis requires dated
            reviews or stored analysis snapshots.
            Proposed endpoint:
            GET /api/games/{appId}/issues/{issueId}/trends
            The response should include actual time periods and counts.
            The chart labels should then use those returned periods.
        */}
        <section className="issues-card issues-trend-card">
          <div className="issues-card-header">
            <div>
              <span className="issues-card-label">
                TREND MONITOR
              </span>
              <h2>{selectedIssue.name} activity</h2>
              <p className="issues-section-subtitle">
                Illustrative relative activity across seven sample periods.
              </p>
            </div>

            <span className="issues-trend-tag">
              DEMO TREND
            </span>
          </div>

          <div
            className="issues-trend-chart"
            role="img"
            aria-label={`Illustrative activity trend for ${selectedIssue.name}`}
          >
            {selectedIssue.trend.map((value, index) => (
              <div className="trend-column" key={index}>
                <span className="trend-value">{value}</span>
                <div className="trend-bar-track">
                  <div
                    className="trend-bar"
                    style={{ height: `${value}%` }}
                  />
                </div>
                <span className="trend-label">
                  {["P1", "P2", "P3", "P4", "P5", "P6", "P7"][index]}
                </span>
              </div>
            ))}
          </div>

          <div className="issues-trend-footer">
            <span>
              <i className="legend-dot trend-dot" />
              Relative activity index
            </span>
            <span>
              Replace with dated review counts from your backend for
              real trend analysis.
            </span>
          </div>
        </section>

        {/* TRACKING SUMMARY */}
        <section className="issues-card issues-tracking-card">
          <div className="issues-card-header">
            <div>
              <span className="issues-card-label">
                WORKFLOW OVERVIEW
              </span>
              <h2>Issue tracking</h2>
            </div>
            <span className="issues-card-count">
              {resolvedCount} resolved
            </span>
          </div>

          <div className="issues-workflow-grid">
            {(
              [
                "Detected",
                "Investigating",
                "In Progress",
                "Resolved",
              ] as IssueStatus[]
            ).map((status) => {
              const count = demoIssues.filter(
                (issue) => (statuses[issue.name] ?? "Detected") === status
              ).length;

              return (
                <button
                  type="button"
                  className={`workflow-item workflow-${status
                    .toLowerCase()
                    .replace(/\s+/g, "-")}`}
                  key={status}
                  onClick={() => setStatusFilter(status)}
                >
                  <span>{status}</span>
                  <strong>{count}</strong>
                  <small>Click to filter issues</small>
                </button>
              );
            })}
          </div>
        </section>

        <p className="issues-disclaimer">
          GameScope demo data is used for this view. Counts, priorities,
          statuses, review examples, and trends are illustrative until
          connected to the live analysis backend.
        </p>
      </main>
    </div>
  );
}

export default Issues;
