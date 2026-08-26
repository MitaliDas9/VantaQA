const LAYERS = [
  'Functional',
  'Validation',
  'Compatibility',
  'Security',
  'Performance'
];

function unique(values) {
  return [...new Set(values)];
}

function splitScenarios(text) {
  const normalized = (text || '').replace(/\r/g, '');

  const lines = normalized
    .split(/\n+/)
    .map(line => line.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean);

  const candidates = lines.filter(line =>
    /acceptance|given|when|then|should|must|verify|validate|user can|system|criteria/i.test(line)
  );

  return candidates.length
    ? candidates
    : [text || 'Verify the Jira requirement'];
}

function extractAcceptanceCriteria(text) {
  const normalized = (text || '')
    .replace(/\r/g, '')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const blocks = [];

  /*
   * Supports:
   *
   * AC-01 Given ... When ... Then ...
   * AC-02 Given ... When ... Then ...
   *
   * and:
   *
   * AC 01 - Given ...
   */
  const matcher =
    /(?:^|\s)(AC\s*\d+\s*[-:]?\s*.*?(?=\s+AC\s*\d+\s*[-:]?|$))/gi;

  let match;

  while ((match = matcher.exec(normalized)) !== null) {
    const item = match[0].trim();

    if (
      item &&
      /Given|When|Then|should|must|can|verify|validate|user/i.test(item)
    ) {
      blocks.push(item);
    }
  }

  if (blocks.length) {
    return blocks.map(block =>
      block
        .replace(/^AC\s*\d+\s*[-:]?\s*/i, '')
        .trim()
    );
  }

  /*
   * Fallback for line-based acceptance criteria.
   */
  const lines = (text || '')
    .replace(/\r/g, '')
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean);

  const fallback = lines.filter(line =>
    /(?:AC\s*\d+|Given|When|Then|must|should|verify|validate|user can)/i.test(
      line
    )
  );

  return fallback.map(line =>
    line
      .replace(/^AC\s*\d+\s*[-:]?\s*/i, '')
      .trim()
  );
}

/**
 * Determine the layer explicitly represented by an acceptance criterion.
 *
 * Important:
 * "access Employee List" is NOT automatically Security.
 *
 * Security requires security-specific language such as:
 * authorization, unauthorized, role, permission, credentials, etc.
 */
function detectLayerFromText(text) {
  const value = (text || '').toLowerCase();

  if (
    /invalid|empty|required|boundary|negative|error|incorrect|missing|validation|validate/i.test(
      value
    )
  ) {
    return 'Validation';
  }

  if (
    /unauthori|permission|role-based|role based|credential|password|session|authorization|security|secure|access denied|forbidden|csrf|xss|lockout|brute force/i.test(
      value
    )
  ) {
    return 'Security';
  }

  if (
    /response time|latency|throughput|performance|under .* second|seconds?|concurrent|load time/i.test(
      value
    )
  ) {
    return 'Performance';
  }

  if (
    /browser|chrome|firefox|webkit|responsive|mobile|compatib|cross[- ]browser/i.test(
      value
    )
  ) {
    return 'Compatibility';
  }

  return 'Functional';
}

/**
 * Parse a single Jira Acceptance Criterion.
 *
 * The AC itself is authoritative.
 * We do not manufacture Validation/Security/Performance behavior here.
 */
function parseAcceptanceCriterion(criterion, index) {
  const text = (criterion || '')
    .replace(/\s+/g, ' ')
    .trim();

  const acMatch = text.match(
    /^AC\s*\d+\s*[-–:]?\s*(.*)$/i
  );

  const labelPart = acMatch
    ? acMatch[1].trim()
    : text;

  const titleMatch = labelPart.match(
    /^(.*?)(?=\s+(?:Given|When|Then)\b|$)/i
  );

  const titleValue = (
    titleMatch
      ? titleMatch[1].trim()
      : labelPart
  )
    .replace(/^[-–:\s]+/, '')
    .trim();

  const title =
    titleValue ||
    `Verify ${criterion}`;

  const givenMatch = text.match(
    /Given\s+(.+?)(?=\s+When\b)/i
  );

  const whenMatch = text.match(
    /When\s+(.+?)(?=\s+Then\b)/i
  );

  const thenMatch = text.match(
    /Then\s+(.+?)(?=\s+(?:Given|When|Then|$))/i
  );

  const steps = [];

  if (givenMatch) {
    steps.push(
      `Given ${givenMatch[1].trim()}`
    );
  }

  if (whenMatch) {
    steps.push(
      `When ${whenMatch[1].trim()}`
    );
  }

  if (thenMatch) {
    steps.push(
      `Then ${thenMatch[1].trim()}`
    );
  }

  if (!steps.length) {
    steps.push(
      'Open the feature under test.'
    );

    steps.push(
      `Perform the requested behavior: "${title}".`
    );

    steps.push(
      'Validate the result matches the expected outcome.'
    );
  }

  const expected = thenMatch
    ? thenMatch[1].trim()
    : title;

  /*
   * Determine the layer from the actual AC.
   *
   * Normal AC-01/02/03 -> Functional.
   *
   * If the AC explicitly says "invalid input", it becomes Validation.
   * If the AC explicitly says "unauthorized user", it becomes Security.
   */
  const layer = detectLayerFromText(
    text
  );

  return {
    id: `AC-${String(index + 1).padStart(2, '0')}`,
    layer,
    source: 'Acceptance Criteria',
    title: `Verify ${title.charAt(0).toLowerCase()}${title.slice(1)}`,
    steps,
    expected
  };
}

/**
 * Build ONE test from ONE Acceptance Criterion.
 *
 * IMPORTANT:
 * Previously this function expanded every AC into:
 *
 * Functional
 * Validation
 * Security
 * Performance
 *
 * That was incorrect because an AC only describes the behavior it explicitly
 * contains.
 *
 * Example:
 *
 * AC-03:
 * Given Employee List
 * When click Add Employee
 * Then Cancel and Save are visible
 *
 * becomes ONLY:
 *
 * AC-03-FUNCTIONAL
 */
function buildAcceptanceCriterionCases(issue, criteria) {
  return criteria.map((criterion, index) => {
    const parsed = parseAcceptanceCriterion(
      criterion,
      index
    );

    const baseId =
      `AC-${String(index + 1).padStart(2, '0')}`;

    return {
      id: `${baseId}-${parsed.layer.toUpperCase()}`,
      layer: parsed.layer,
      source: 'Acceptance Criteria',
      title: parsed.title,
      steps: parsed.steps,
      expected: parsed.expected
    };
  });
}

function isExplicitLoginStory(issue) {
  const summary =
    (issue.summary || '').toLowerCase();

  /*
   * Only treat the ticket as a login story when the summary itself is
   * clearly about authentication/sign-in behavior.
   */
  return /\b(login|log in|sign in|signin|authentication|authenticate|access management)\b/
    .test(summary);
}

function isLoginRequirement(issue) {
  return isExplicitLoginStory(issue);
}

/**
 * Identify layers explicitly represented by the Jira requirement.
 *
 * Functional is always present.
 *
 * IMPORTANT:
 * "access" by itself is NOT a Security signal.
 *
 * Example:
 * "Verify access Employee List"
 *
 * is Functional, not Security.
 */
function identifyLayers(text) {
  const t = (text || '').toLowerCase();

  const result = new Set([
    'Functional'
  ]);

  if (
    /validat|error|boundary|negative|invalid|constraint|empty|required|missing|incorrect|wrong/.test(
      t
    )
  ) {
    result.add('Validation');
  }

  if (
    /browser|chrome|firefox|webkit|responsive|mobile|compatib|cross[- ]browser/.test(
      t
    )
  ) {
    result.add('Compatibility');
  }

  if (
    /security|permission|role-based|role based|credential|password|session|unauthori|authorization|access denied|forbidden|lockout|brute force|csrf|xss/.test(
      t
    )
  ) {
    result.add('Security');
  }

  if (
    /performance|latency|load time|response time|throughput|concurrent|under .*\ssecond|seconds?/.test(
      t
    )
  ) {
    result.add('Performance');
  }

  return LAYERS.filter(
    layer => result.has(layer)
  );
}

/**
 * Determine whether a gap exists by category.
 *
 * Gap strings are generated by analyzeRequirement().
 */
function hasGap(gaps, pattern) {
  return (gaps || []).some(
    gap => pattern.test(gap)
  );
}

/**
 * Build tests ONLY for genuine requirement gaps.
 *
 * This function must never create a test merely because a layer exists.
 *
 * Example:
 *
 * layers = [Functional, Security]
 *
 * does NOT mean:
 *
 * create SEC-001
 *
 * Security test is created only if:
 *
 * gaps contains "Security/access-control coverage is not explicit."
 */
function buildDerivedTestCases(issue, gaps) {
  const cases = [];

  const login =
    isLoginRequirement(issue);

  /*
   * ------------------------------------------------------------
   * VALIDATION GAP
   * ------------------------------------------------------------
   */
  if (
    hasGap(
      gaps,
      /negative\/boundary|validation/i
    )
  ) {
    if (login) {
      /*
       * Login has enough domain knowledge to safely define these tests.
       */
      cases.push({
        id: 'VAL-001',
        layer: 'Validation',
        source: 'Requirement Gap',
        title: 'Verify login validation for empty username and password',
        steps: [
          'Open the login page.',
          'Leave username/email empty.',
          'Leave password empty.',
          'Click Login/Sign in.'
        ],
        expected:
          'Required-field validation is displayed and authentication is not attempted.'
      });

      cases.push({
        id: 'VAL-002',
        layer: 'Validation',
        source: 'Requirement Gap',
        title: 'Verify login validation for invalid credentials',
        steps: [
          'Open the login page.',
          'Enter an invalid username/email.',
          'Enter an invalid password.',
          'Click Login/Sign in.'
        ],
        expected:
          'A safe authentication error is displayed and the user remains unauthenticated.'
      });
    } else {
      /*
       * For a non-login story, do NOT invent a specific field,
       * selector, or validation message.
       *
       * This is intentionally generic because the Jira requirement
       * did not specify the mandatory fields or expected validation text.
       */
      cases.push({
        id: 'VAL-001',
        layer: 'Validation',
        source: 'Requirement Gap',
        title:
          `Verify negative and boundary behavior for ${issue.summary}`,
        steps: [
          'Open the feature under test.',
          'Identify an applicable missing, invalid, or boundary input based on the feature.',
          'Submit the operation.'
        ],
        expected:
          'The application prevents the invalid operation and provides the appropriate validation behavior defined by the application.'
      });
    }
  }

  /*
   * ------------------------------------------------------------
   * SECURITY GAP
   * ------------------------------------------------------------
   */
  if (
    hasGap(
      gaps,
      /security\/access-control/i
    )
  ) {
    if (login) {
      cases.push({
        id: 'SEC-001',
        layer: 'Security',
        source: 'Requirement Gap',
        title:
          'Verify unauthenticated user cannot access protected content',
        steps: [
          'Open a protected application URL without an authenticated session.'
        ],
        expected:
          'The application prevents unauthorized access and redirects the user to the login page or an authorized access-denied experience.'
      });

      cases.push({
        id: 'SEC-002',
        layer: 'Security',
        source: 'Requirement Gap',
        title:
          'Verify password is not exposed in the UI or URL',
        steps: [
          'Open the login page.',
          'Enter a password.',
          'Submit or inspect the page URL and visible fields.'
        ],
        expected:
          'Password input is masked and the password is not exposed in the URL or visible page content.'
      });
    } else {
      cases.push({
        id: 'SEC-001',
        layer: 'Security',
        source: 'Requirement Gap',
        title:
          `Verify authorized access and secure handling for ${issue.summary}`,
        steps: [
          'Open the feature with an unauthorized session or role.',
          'Attempt the protected operation.',
          'Repeat the operation with an authorized session or role.'
        ],
        expected:
          'Unauthorized access is denied and authorized users can perform the permitted operation without exposing sensitive information.'
      });
    }
  }

  /*
   * ------------------------------------------------------------
   * COMPATIBILITY GAP
   * ------------------------------------------------------------
   */
  if (
    hasGap(
      gaps,
      /compatibility\/browser/i
    )
  ) {
    if (login) {
      cases.push({
        id: 'COMP-001',
        layer: 'Compatibility',
        source: 'Requirement Gap',
        title:
          'Verify login works across supported browsers',
        steps: [
          'Open the login page in each supported Playwright browser.',
          'Authenticate using valid credentials.'
        ],
        expected:
          'Login behaves consistently across supported browsers.'
      });
    } else {
      cases.push({
        id: 'COMP-001',
        layer: 'Compatibility',
        source: 'Requirement Gap',
        title:
          `Verify ${issue.summary} across supported browsers`,
        steps: [
          'Open the feature in each supported Playwright browser.',
          'Execute the primary user flow.'
        ],
        expected:
          'The feature behaves consistently across all supported browsers.'
      });
    }
  }

  /*
   * ------------------------------------------------------------
   * PERFORMANCE GAP
   * ------------------------------------------------------------
   */
  if (
    hasGap(
      gaps,
      /performance\/response-time/i
    )
  ) {
    cases.push({
      id: 'PERF-001',
      layer: 'Performance',
      source: 'Requirement Gap',
      title:
        `Verify acceptable response time for ${issue.summary}`,
      steps: [
        'Open the feature under test.',
        'Perform the primary operation.',
        'Measure the response time.'
      ],
      expected:
        'The operation completes within the response-time target defined by the requirement or agreed performance baseline.'
    });
  }

  /*
   * Remove exact duplicates.
   */
  const seen = new Set();

  return cases.filter(testCase => {
    const key =
      `${testCase.id}:${testCase.title}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

/**
 * Analyze the Jira requirement.
 *
 * Design:
 *
 * 1. Acceptance Criteria are authoritative.
 * 2. Each AC produces exactly one requirement-derived test.
 * 3. Additional STLC tests are created only when an actual gap exists.
 * 4. A gap must never mutate an existing AC into another layer.
 */
function analyzeRequirement(issue, options = {}) {
  const text =
    `${issue.summary || ''}\n${issue.description || ''}`;

  const scenarios =
    splitScenarios(text);

  const acceptanceCriteria =
    extractAcceptanceCriteria(text);

  const gaps = [];

  /*
   * ------------------------------------------------------------
   * ACCEPTANCE CRITERIA GAP
   * ------------------------------------------------------------
   */
  if (!acceptanceCriteria.length) {
    gaps.push(
      'Acceptance criteria or explicit expected behavior is missing.'
    );
  }

  /*
   * ------------------------------------------------------------
   * VALIDATION GAP
   * ------------------------------------------------------------
   *
   * Only look for actual validation language.
   *
   * "Click Add Employee" does not satisfy this,
   * and that is correct: it means validation coverage is missing.
   *
   * But that missing coverage is represented as VAL-001,
   * NOT AC-03-VALIDATION.
   */
  if (
    !acceptanceCriteria.some(c =>
      /error|invalid|negative|boundary|empty|required|exception|validation/i.test(
        c
      )
    )
  ) {
    gaps.push(
      'Negative/boundary scenarios are not explicit.'
    );
  }

  /*
   * ------------------------------------------------------------
   * SECURITY GAP
   * ------------------------------------------------------------
   *
   * Do NOT use plain "access" as proof of security coverage.
   */
  if (
    !acceptanceCriteria.some(c =>
      /security|permission|role-based|role based|authorization|unauthori|credential|password|session|access denied|forbidden/i.test(
        c
      )
    )
  ) {
    gaps.push(
      'Security/access-control coverage is not explicit.'
    );
  }

  /*
   * ------------------------------------------------------------
   * COMPATIBILITY GAP
   * ------------------------------------------------------------
   */
  if (
    !acceptanceCriteria.some(c =>
      /browser|chrome|firefox|webkit|responsive|mobile|compatib|cross[- ]browser/i.test(
        c
      )
    )
  ) {
    gaps.push(
      'Compatibility/browser coverage is not explicit.'
    );
  }

  /*
   * ------------------------------------------------------------
   * PERFORMANCE GAP
   * ------------------------------------------------------------
   */
  if (
    !acceptanceCriteria.some(c =>
      /performance|latency|load|response time|throughput|concurrent|under .* second|seconds?/i.test(
        c
      )
    )
  ) {
    gaps.push(
      'Performance/response-time coverage is not explicit.'
    );
  }

  /*
   * Identify layers explicitly represented by the Jira requirement.
   *
   * This is informational now.
   *
   * It is NOT used to blindly generate tests.
   */
  const layers =
    identifyLayers(text);

  /*
   * ------------------------------------------------------------
   * AC TEST CASES
   * ------------------------------------------------------------
   *
   * expandAC remains supported for CLI compatibility.
   *
   * It no longer means "expand into every STLC layer".
   * It simply controls whether AC-derived test objects are generated.
   */
  const expandAC =
    options.expandAC !== false;

  const acCases = acceptanceCriteria.length && expandAC
    ? buildAcceptanceCriterionCases(
        issue,
        acceptanceCriteria
      )
    : [];

  /*
   * ------------------------------------------------------------
   * GAP-DERIVED TEST CASES
   * ------------------------------------------------------------
   *
   * This is now strictly driven by `gaps`.
   */
  const derived =
    buildDerivedTestCases(
      issue,
      gaps
    );

  /*
   * ------------------------------------------------------------
   * MERGE
   * ------------------------------------------------------------
   */
  const seen = new Set();
  const merged = [];

  for (const testCase of [
    ...acCases,
    ...derived
  ]) {
    const key =
      `${testCase.id}:${testCase.title}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(testCase);
  }

  const testCases = merged;

  /*
   * The generated test cases are now the authoritative layer output.
   *
   * Example SCRUM-2:
   *
   * AC-01-FUNCTIONAL
   * AC-02-FUNCTIONAL
   * AC-03-FUNCTIONAL
   * VAL-001
   * COMP-001
   * SEC-001
   * PERF-001
   */
  const generatedLayers =
    unique(
      testCases.map(
        testCase => testCase.layer
      )
    );

  return {
    scenarios,
    acceptanceCriteria,
    gaps,

    /*
     * Keep only layers that are actually represented
     * by generated test cases.
     */
    layers: LAYERS.filter(
      layer =>
        generatedLayers.includes(layer)
    ),

    testCases,

    automationFeasible:
      !/manual only|cannot automate|not automatable/i.test(
        text
      ),

    reusableComponent:
      isLoginRequirement(issue),

    recommendation:
      'Automate deterministic UI/API-verifiable behavior; keep exploratory/manual-only behavior in Jira.'
  };
}

module.exports = {
  analyzeRequirement,
  identifyLayers,
  isLoginRequirement
};