// Curated practice prompts; these are not company-specific hiring predictions.
export const questions = {
  hr: {
    beginner: ['Introduce yourself and connect one skill to the role you want.', 'Why are you interested in this role? Give one concrete reason.', 'What is one strength you have demonstrated in a college project?', 'What would you like to learn during your first internship?'],
    intermediate: ['Give a one-minute introduction that connects your projects to this role.', 'Describe a skill gap you identified and how you are addressing it.', 'Why should a team select you for this role? Support your answer with evidence.', 'How would you prioritise learning during your first three months?'],
    advanced: ['Explain your strongest evidence of readiness for this role without overstating your experience.', 'How would you decide between two offers with different learning opportunities?', 'Describe feedback that changed your career or learning priorities.', 'What questions would you ask to understand a team’s expectations of a new graduate?'],
  },
  projects: {
    beginner: ['Explain one project: the problem, your contribution and the result.', 'Describe the main components of your project and how they interact.', 'What was one bug you found, and how did you investigate it?', 'What would you improve if you had one more week?'],
    intermediate: ['Explain a design choice in your project and an alternative you considered.', 'How did you test your project, including a failure case?', 'What evidence shows the project solved its intended problem?', 'How did you divide work and integrate contributions in your project?'],
    advanced: ['Identify the weakest assumption in your project and how you would validate it.', 'How would your project behave under ten times its current workload?', 'Explain a trade-off between reliability, cost and complexity in your project.', 'What would you change before exposing your project to real users?'],
  },
  dsa: {
    beginner: ['Write a function that finds the largest number in an array. Explain empty input handling and complexity.', 'Determine whether a string is a palindrome. State your assumptions about spaces and case.', 'Count the occurrences of each value in an array. Explain your data structure.', 'Find the first repeated element in a list and explain your approach.'],
    intermediate: ['Given an array and a target sum, return indices of two values adding to the target. Explain time and space complexity.', 'Find the length of the longest substring without repeated characters. Explain your invariant.', 'Merge overlapping intervals and explain how you would test boundary cases.', 'Detect a cycle in a linked list and compare time and space trade-offs.'],
    advanced: ['Find the shortest path in an unweighted graph and explain disconnected cases and complexity.', 'Design an LRU cache with constant-time get and put operations. Explain invariants.', 'Solve coin change for the minimum number of coins, including an impossible target.', 'Find the kth largest value and compare sorting, a heap and selection approaches.'],
  },
  cs: {
    beginner: ['Explain the difference between a process and a thread with an example.', 'Explain a primary key and a foreign key using a college database.', 'Explain encapsulation and why it helps maintain code.', 'What happens when a browser sends an HTTP request to a server?'],
    intermediate: ['Explain database transactions and a situation where atomicity matters.', 'What causes a deadlock, and how might a system prevent it?', 'Compare TCP and UDP and justify a use case for each.', 'Explain when an index helps a SQL query and what it costs.'],
    advanced: ['Explain how two concurrent transactions can produce a lost update and how to prevent it.', 'How does virtual memory work, and why can excessive paging hurt performance?', 'Design retry behaviour for an HTTP operation that must not happen twice.', 'Compare composition and inheritance for a changing application requirement.'],
  },
  ml: {
    beginner: ['Explain supervised learning and give a classification example.', 'Why should training and test data be separated?', 'What is overfitting, and how would you recognise it?', 'Explain precision and recall for a spam classifier.'],
    intermediate: ['A model has 98% accuracy on an imbalanced dataset. How would you decide whether it is useful?', 'Describe a preprocessing pipeline and how you would prevent data leakage.', 'How would you compare two models fairly with a small dataset?', 'Explain when transfer learning is useful and what you would fine-tune.'],
    advanced: ['Design an evaluation plan for a model whose production data changes over time.', 'Your validation score rises but real-world performance falls. How would you investigate?', 'Choose a decision threshold when false negatives cost more than false positives.', 'How would you balance model quality, inference latency and monitoring requirements?'],
  },
  behavioural: {
    beginner: ['Tell me about a time you worked with others toward a deadline.', 'Describe a mistake you made and what you learned.', 'How did you respond when a teammate needed help?', 'Describe a time you had to learn something unfamiliar.'],
    intermediate: ['Describe a disagreement in a project team and how you handled it.', 'Tell me about competing deadlines and how you prioritised.', 'Describe feedback that was difficult to hear and what you did next.', 'Tell me about a time you took ownership of an unclear task.'],
    advanced: ['Describe a decision you made with incomplete information and how you managed the risk.', 'Tell me about a time you challenged a team decision respectfully.', 'Describe a project outcome that fell short and separate your responsibility from external factors.', 'How have you balanced helping teammates with delivering your own commitments?'],
  },
};

export const rubric = [
  { name: 'Subject understanding', prompt: 'Check the answer’s technical or role-related claims. What needs verification?', },
  { name: 'Reasoning', prompt: 'Explain why you chose this approach and compare one alternative.' },
  { name: 'Completeness', prompt: 'Address every part of the question and include a concrete example or edge case.' },
  { name: 'Communication', prompt: 'Use a clear structure: context, approach, evidence and conclusion.' },
];
