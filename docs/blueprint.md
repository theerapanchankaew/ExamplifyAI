# **App Name**: ExamplifyAI

## Core Features:

- AI-Powered Course Creation: Generate courses automatically from topics, JSON files, or text, adjusting difficulty and creativity levels. Includes validation and import functions.
- Master Course and Certification: Create programs using TA/ISIC criteria, automatically detecting competency completion for certificate issuance.
- Dashboard Analytics: Provide a dashboard displaying total users, courses, pass rates, and recent activities, updated daily using Cloud Functions. The dashboard helps show a trend for the number of active users, number of new courses added to the system, attempts, and pass rate
- Exam Management: Administer exams with randomized questions, time control, and automated grading for multiple-choice questions. Essay grading uses optional AI assistance tool and rubric to incorporate domain-specific criteria, with policy-based answer display after submission.
- Automated Certificate Generation: Generate PDF certificates with QR verification codes automatically upon Master Course completion, stored securely in masterCertificates.
- Role-Based Access Control: Implement role-based permissions to manage user access, ensuring that admins, instructors, and students have appropriate system privileges.
- Firestore Integration: Use Firestore to manage users, courses, lessons, questions, exams, attempts, metrics, competencies, achievements, master courses, certificates, roadmaps and schedules

## Style Guidelines:

- Primary color: Deep sky blue (#00BFFF) to evoke a sense of trust, knowledge, and professionalism.
- Background color: Very light cyan (#E0FFFF) to keep the layout lightweight.
- Accent color: Electric blue (#7DF9FF) to give important pieces of information additional weight.
- Headline font: 'Space Grotesk' (sans-serif) for headlines, lending a modern and technical feel. Body font: 'Inter' (sans-serif) for body text, providing a neutral and readable appearance.
- Code font: 'Source Code Pro' for displaying code snippets.
- Use consistent and clear icons throughout the platform to represent different functions and modules.
- Maintain a clean and intuitive layout across all modules, ensuring easy navigation and accessibility for all user roles.