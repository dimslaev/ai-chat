│ └── container.css
├── top-row/
│ ├── top-row.tsx
│ └── top-row.css
├── messages/
│ ├── messages.tsx
│ ├── messages.css
│ └── message/
│ ├── message.tsx
│ └── message.css
├── input-section/
│ ├── input-section.tsx
│ └── input-section.css
├── input/
│ ├── input.tsx
│ └── input.css
├── token-usage/
│ ├── token-usage.tsx
│ └── token-usage.css
└── settings/
├── settings.tsx
├── settings.css (new)
├── config-dialog.tsx
├── config-dialog.css (new)
├── delete-config-dialog.tsx
└── delete-config-dialog.css (new)

Style Migration Plan

From global.css, extract and move:

1. container.css (lines 17-22 from container.tsx inline styles)


    - .container wrapper styles

2. top-row.css (lines 30-33 from top-row.tsx inline styles)


    - .top-row border and background styles

3. messages.css


    - .messages-viewport (lines 86-89 from messages.tsx inline styles)
    - .scroll-to-bottom-button (lines 142-174 from global.css)

4. message.css


    - .chat-message (lines 74-127 from global.css)
    - .chat-message-user
    - .chat-message-streaming
    - .action-button (lines 40-72 from global.css)
    - .chat-textarea and .chat-textarea-edit (lines 176-194 from global.css)
    - pre and code styles (lines 11-38 from global.css)

5. input-section.css (lines 12-15 from input-section.tsx inline styles)


    - .input-section border and background styles

6. input.css


    - .input-wrapper (lines 50-56 from input.tsx inline styles)
    - .input-button (lines 76-84 from input.tsx inline styles)
    - Related .chat-textarea styles

7. token-usage.css (lines 18-21 from token-usage.tsx inline styles)


    - .token-usage text styles

8. settings/ (new CSS files)


    - Extract inline styles from settings components (line 102 from settings.tsx)
    - .settings-dropdown-content
    - .chat-textarea-settings (lines 196-204 from global.css)

Remaining in global.css:

- Body reset (lines 1-4)
- .no-hover utility (lines 6-9)
- Radix UI overrides (lines 129-140)

Migration Strategy

For each component:

1. Create component folder
2. Move .tsx file into folder
3. Create .css file in same folder
4. Extract relevant styles from global.css
5. Convert inline styles to CSS classes
6. Update imports in component file
7. Import CSS file in component

Example for input.tsx:
/_ input/input.css _/
.input-wrapper {
position: relative;
flex-grow: 1;
background: var(--color-surface);
border-radius: var(--radius-3);
border: 1px solid var(--gray-7);
padding: 8px;
padding-right: 48px;
}

.input-button {
position: absolute;
right: 8px;
bottom: 8px;
min-width: 32px;
height: 32px;
padding: 0;
}

.chat-textarea {
width: 100%;
border: none;
background: transparent;
/_ ... rest of styles _/
}

Benefits of Proposed Architecture

1. Colocation: Each component's logic and styles live together
2. Discoverability: Easy to find all files related to a component
3. Maintainability: Changes to a component are isolated to its folder
4. Scalability: Easy to add new sub-components or assets
5. Clear hierarchy: Nested components (like message inside messages) have clear parent-child relationship
6. Reduced global scope: Only true global styles remain in global.css
