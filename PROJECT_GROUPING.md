# Project Grouping Feature

## Overview
DevDock now automatically detects and groups nested projects! When you add a folder that contains multiple sub-projects (like a folder with `client` and `server` subdirectories), DevDock will:

1. **Auto-detect** nested projects within the folder
2. **Create a group** to organize them together
3. **Display them hierarchically** in a collapsible structure

## How It Works

### Adding a Grouped Project
When you click "Add Project" and select a folder like `miss-venda/`:
```
miss-venda/
├── client/     (React/Vite project)
└── server/     (Node.js project)
```

DevDock will:
- Detect both `client` and `server` as separate projects
- Create a parent group called "miss-venda"
- Nest both projects under this group

### Visual Structure
```
📁 miss-venda (Group)
  ├── 📦 client (Vite Project)
  └── 📦 server (Node.js Project)
```

## Technical Implementation

### 1. Type Updates (`shared/types.ts`)
Added two new optional fields to `ProjectConfig`:
- `parentId?: string` - Links child projects to their parent group
- `isGroup?: boolean` - Marks a project as a folder group (non-runnable)

### 2. Smart Detection (`main/ipc/project-handlers.ts`)
Enhanced the `PROJECT_ADD` handler to:
- Scan subdirectories for project markers
- Detect valid projects (package.json, requirements.txt, etc.)
- Create group structure if 2+ nested projects are found
- Fall back to single project if no nesting detected

### 3. UI Components
**ProjectGroup Component** (`renderer/src/components/project/ProjectGroup.tsx`)
- Collapsible group header with folder icon
- Shows project count
- Displays nested projects with indentation
- Visual hierarchy with border line

**Updated ProjectListPage** (`renderer/src/pages/ProjectListPage.tsx`)
- Organizes projects into groups and standalone projects
- Renders groups first, then standalone projects
- Maintains search functionality across all projects

## Features

### ✅ Automatic Detection
- No manual configuration needed
- Detects common project structures
- Works with any project type combination

### ✅ Visual Hierarchy
- Collapsible groups
- Clear parent-child relationship
- Indented nested projects
- Border line for visual grouping

### ✅ Individual Control
- Each nested project can be started/stopped independently
- Full access to project details
- Separate runtime status for each project

### ✅ Backward Compatible
- Existing single projects work as before
- No migration needed
- Groups are created only for new additions

## Usage Example

### Before (Without Grouping)
```
Projects List:
- client
- server
- another-app
```

### After (With Grouping)
```
Projects List:
📁 miss-venda (collapsed/expanded)
  - client (Vite)
  - server (Node.js)
- another-app
```

## Benefits

1. **Better Organization** - Related projects stay together
2. **Cleaner UI** - Less clutter with collapsible groups
3. **Easier Management** - Find related projects quickly
4. **Scalability** - Handle monorepos and multi-service apps

## Next Steps

To test the feature:
1. Run `npm run dev` in the DevDock directory
2. Click "Add Project"
3. Select a folder containing multiple sub-projects
4. Watch DevDock automatically create the group structure!
