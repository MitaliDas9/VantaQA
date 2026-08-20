const LAYERS = ['Functional', 'Validation', 'Compatibility', 'Security', 'Performance'];

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

  return candidates.length ? candidates : [text || 'Verify the Jira requirement'];
}

function extractAcceptanceCriteria(text) {
  const normalized = (text || '').replace(/\r/g, '');
  const lines = normalized
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean);

  const found = [];
  let insideAcceptanceSection = false;

  for (const line of lines) {
    const isSectionMarker = /acceptance criteria|acceptance criterion|criteria/i.test(line);
    if (isSectionMarker) {
      insideAcceptanceSection = true;
      continue;
    }

    if (insideAcceptanceSection) {
      const match = line.match(/^(?:\d+[\).]|\d+\.|[a-z][\).]|[-*]\s*)?\s*(.+)$/i);
      const value = match ? match[1].trim() : line.trim();

      if (value && /(?:must|should|can|will|verify|validate|user can|system|page|user)/i.test(value)) {
        found.push(value.replace(/\s+/g, ' '));
      }
    }
  }

  if (found.length) return found;

  const fallback = lines.filter(line =>
    /^(?:\d+[\).]|\d+\.|[a-z][\).]|[-*]\s*)?\s*(?:given|when|then|must|should|verify|validate|user can|system|page)/i.test(line)
  );

  return fallback.map(line => line.replace(/^(?:\d+[\).]|\d+\.|[a-z][\).]|[-*]\s*)/i, '').trim());
}

function detectLayerFromText(text) {
  const value = (text || '').toLowerCase();

  if (/invalid|empty|required|boundary|negative|error|incorrect|missing|validate|validation/.test(value)) {
    return 'Validation';
  }
  if (/unauthori|permission|role|access|credential|password|session|authorization|security/.test(value)) {
    return 'Security';
  }
  if (/response time|latency|throughput|load|performance|under .* second|seconds?/.test(value)) {
    return 'Performance';
  }
  if (/browser|chrome|firefox|webkit|responsive|mobile|compatib|cross[- ]browser/.test(value)) {
    return 'Compatibility';
  }
  return 'Functional';
}

function buildAcceptanceCriterionCases(issue, criteria) {
  return criteria.map((criterion, index) => {
    const cleaned = criterion.replace(/^[\d\-\)\]\s.]+/, '').trim();
    const title = cleaned || `Verify ${issue.summary}`;
    const layer = detectLayerFromText(title);

    return {
      id: `AC-${String(index + 1).padStart(2, '0')}`,
      layer,
      source: 'Acceptance Criteria',
      title: `Verify ${title.charAt(0).toLowerCase() + title.slice(1)}`,
      steps: [
        'Open the feature under test.',
        `Perform the behavior described by: "${title}".`,
        'Validate the result against the expected outcome.'
      ],
      expected: title
    };
  });
}

function isExplicitLoginStory(issue) {
  const summary = (issue.summary || '').toLowerCase();

  // Only treat the ticket as a login story when the summary itself is clearly
  // about authentication or sign-in behavior. This avoids misclassifying
  // unrelated stories that happen to mention login in the description or as a
  // precondition for a different workflow.
  return /\b(login|log in|sign in|signin|authentication|authenticate|access management)\b/.test(summary);
}

function isLoginRequirement(issue) {
  return isExplicitLoginStory(issue);
}

function identifyLayers(text) {
  const t = (text || '').toLowerCase();
  const result = new Set(['Functional']);

  if (/validat|error|boundary|negative|invalid|constraint|empty|required|missing|incorrect|wrong/.test(t)) {
    result.add('Validation');
  }
  if (/browser|chrome|firefox|webkit|responsive|mobile|compatib|cross[- ]browser/.test(t)) {
    result.add('Compatibility');
  }
  if (/security|permission|role|access|authentication|authorization|login|log in|sign in|credential|password|session|unauthori|lockout|brute force|csrf|xss/.test(t)) {
    result.add('Security');
  }
  if (/performance|latency|load|response time|throughput|concurrent|under .* second|seconds?/.test(t)) {
    result.add('Performance');
  }

  return LAYERS.filter(x => result.has(x));
}

function buildDerivedTestCases(issue, layers, gaps) {
  const text = `${issue.summary}\n${issue.description}`;
  const login = isLoginRequirement(issue);
  const cases = [];

  // Functional coverage
  if (login) {
    cases.push({
      id: 'FUNC-001',
      layer: 'Functional',
      source: 'Requirement',
      title: 'Verify successful login with valid credentials',
      steps: [
        'Open the login page.',
        'Enter valid username/email.',
        'Enter valid password.',
        'Click Login/Sign in.'
      ],
      expected: 'User is authenticated and redirected to the authenticated landing page.'
    });
  } else {
    cases.push({
      id: 'FUNC-001',
      layer: 'Functional',
      source: 'Requirement',
      title: `Verify the primary behavior of ${issue.summary}`,
      steps: [
        'Open the feature under test.',
        `Perform the action described by "${issue.summary}".`,
        'Observe the application response.'
      ],
      expected: 'The application performs the requested business behavior according to the Jira acceptance criteria.'
    });
  }

  // Gap-driven negative/validation coverage
  if (gaps.some(g => /negative|boundary/i.test(g)) || login) {
    if (login) {
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
        expected: 'Required-field validation is displayed and authentication is not attempted.'
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
        expected: 'A safe authentication error is displayed and the user remains unauthenticated.'
      });
    } else {
      cases.push({
        id: 'VAL-001',
        layer: 'Validation',
        source: 'Requirement Gap',
        title: `Verify negative and boundary validation for ${issue.summary}`,
        steps: [
          'Open the feature under test.',
          'Provide missing, invalid, or boundary input relevant to the requirement.',
          'Submit the action.'
        ],
        expected: 'The application rejects invalid input with the correct validation and does not perform the invalid operation.'
      });
    }
  }

  // Security coverage for authentication/access-related stories.
  if (layers.includes('Security')) {
    if (login) {
      cases.push({
        id: 'SEC-001',
        layer: 'Security',
        source: 'STLC Layer',
        title: 'Verify unauthenticated user cannot access protected content',
        steps: [
          'Open a protected application URL without an authenticated session.'
        ],
        expected: 'The application prevents unauthorized access and redirects the user to the login page or an authorized access-denied experience.'
      });
      cases.push({
        id: 'SEC-002',
        layer: 'Security',
        source: 'STLC Layer',
        title: 'Verify password is not exposed in the UI or URL',
        steps: [
          'Open the login page.',
          'Enter a password.',
          'Submit or inspect the page URL and visible fields.'
        ],
        expected: 'Password input is masked and the password is not exposed in the URL or visible page content.'
      });
    }
  }

  // Compatibility is a recommended STLC layer for UI stories when no explicit browser
  // coverage exists. It is marked as a derived coverage item rather than pretending it
  // came from the Jira acceptance criteria.
  if (login && !layers.includes('Compatibility')) {
    cases.push({
      id: 'COMP-001',
      layer: 'Compatibility',
      source: 'STLC Recommended Coverage',
      title: 'Verify login works across supported browsers',
      steps: [
        'Open the login page in each supported Playwright browser.',
        'Authenticate using valid credentials.'
      ],
      expected: 'Login behaves consistently across supported browsers.'
    });
  }

  // The VantaQA STLC diagram explicitly covers all five test layers.
  // Generate a baseline test for every layer, marking inferred coverage as
  // STLC Recommended Coverage when Jira did not explicitly mention it.
  if (!cases.some(tc => tc.layer === 'Compatibility')) {
    cases.push({
      id: 'COMP-001',
      layer: 'Compatibility',
      source: 'STLC Recommended Coverage',
      title: `Verify ${issue.summary} across supported browsers`,
      steps: [
        'Open the feature in each supported Playwright browser.',
        'Execute the primary user flow.'
      ],
      expected: 'The feature behaves consistently across supported browsers.'
    });
  }

  if (!cases.some(tc => tc.layer === 'Security')) {
    cases.push({
      id: 'SEC-001',
      layer: 'Security',
      source: 'STLC Recommended Coverage',
      title: `Verify authorized access and secure handling for ${issue.summary}`,
      steps: [
        'Open the feature without an authorized session/role.',
        'Attempt the protected operation.',
        'Repeat with an authorized session/role.'
      ],
      expected: 'Unauthorized access is denied and authorized users can perform the operation without exposing sensitive data.'
    });
  }

  if (!cases.some(tc => tc.layer === 'Performance')) {
    cases.push({
      id: 'PERF-001',
      layer: 'Performance',
      source: 'STLC Recommended Coverage',
      title: `Verify acceptable response time for ${issue.summary}`,
      steps: [
        'Open the feature under test.',
        'Perform the primary operation.',
        'Measure the response time.'
      ],
      expected: 'The operation completes within the response-time target defined by the requirement or agreed performance baseline.'
    });
  }

  if (!cases.some(tc => tc.layer === 'Validation')) {
    cases.push({
      id: 'VAL-001',
      layer: 'Validation',
      source: 'STLC Recommended Coverage',
      title: `Verify invalid and boundary input validation for ${issue.summary}`,
      steps: [
        'Open the feature under test.',
        'Provide missing, invalid, and boundary input where applicable.',
        'Submit the operation.'
      ],
      expected: 'Invalid input is rejected with the correct validation and the application does not perform an invalid operation.'
    });
  }

  // De-duplicate IDs in case explicit and inferred rules generated the same layer.
  const seen = new Set();
  return cases.filter(tc => {
    const key = `${tc.id}:${tc.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function analyzeRequirement(issue) {
  const text = `${issue.summary}\n${issue.description}`;
  const scenarios = splitScenarios(text);
  const acceptanceCriteria = extractAcceptanceCriteria(text);
  const gaps = [];

  if (!acceptanceCriteria.length) {
    gaps.push('Acceptance criteria or explicit expected behavior is missing.');
  }
  if (!acceptanceCriteria.some(c => /error|invalid|negative|boundary|empty|required|exception/i.test(c))) {
    gaps.push('Negative/boundary scenarios are not explicit.');
  }
  if (!acceptanceCriteria.some(c => /security|permission|role|access|authentication|authorization|login|credential|password|session|unauthori/i.test(c))) {
    gaps.push('Security/access-control coverage is not explicit.');
  }
  if (!acceptanceCriteria.some(c => /browser|chrome|firefox|webkit|responsive|mobile|compatib|cross[- ]browser/i.test(c))) {
    gaps.push('Compatibility/browser coverage is not explicit.');
  }
  if (!acceptanceCriteria.some(c => /performance|latency|load|response time|throughput|concurrent|under .* second|seconds?/i.test(c))) {
    gaps.push('Performance/response-time coverage is not explicit.');
  }

  const layers = identifyLayers(text);
  const testCases = acceptanceCriteria.length
    ? buildAcceptanceCriterionCases(issue, acceptanceCriteria)
    : buildDerivedTestCases(issue, layers, gaps);

  // The test matrix is the authoritative layer output. Ensure each layer represented
  // by a generated case is visible even when the original Jira text did not name it.
  const generatedLayers = unique(testCases.map(tc => tc.layer));
  return {
    scenarios,
    acceptanceCriteria,
    gaps,
    layers: LAYERS.filter(layer => generatedLayers.includes(layer)),
    testCases,
    automationFeasible: !/manual only|cannot automate|not automatable/i.test(text),
    reusableComponent: isLoginRequirement(issue),
    recommendation: 'Automate deterministic UI/API-verifiable behavior; keep exploratory/manual-only behavior in Jira.'
  };
}

module.exports = { analyzeRequirement, identifyLayers, isLoginRequirement };
