const fs = require('fs');
const path = require('path');
const os = require('os');

const defaultSubjects = require('./data/subjects.json');
const defaultHomework = require('./data/homework.json');

// Determine data directory (use /tmp on Vercel / serverless environments for persistent writable storage)
function resolveDataDir() {
  const localDir = path.join(__dirname, 'data');
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpDir = path.join(os.tmpdir(), 'homework-manager-data');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    return tmpDir;
  }
  if (!fs.existsSync(localDir)) {
    fs.mkdirSync(localDir, { recursive: true });
  }
  return localDir;
}

const DATA_DIR = resolveDataDir();
const SUBJECTS_FILE = path.join(DATA_DIR, 'subjects.json');
const HOMEWORK_FILE = path.join(DATA_DIR, 'homework.json');
const CUSTOM_TASKS_FILE = path.join(DATA_DIR, 'custom_tasks.json');

function readJSON(filePath, defaultValue) {
  try {
    if (!fs.existsSync(filePath)) {
      writeJSON(filePath, defaultValue);
      return defaultValue;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return defaultValue;
  }
}

function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
    return false;
  }
}

class Storage {
  constructor() {
    this.init();
  }

  init() {
    if (!fs.existsSync(SUBJECTS_FILE)) {
      writeJSON(SUBJECTS_FILE, defaultSubjects);
    }
    if (!fs.existsSync(HOMEWORK_FILE)) {
      writeJSON(HOMEWORK_FILE, defaultHomework);
    }
    if (!fs.existsSync(CUSTOM_TASKS_FILE)) {
      writeJSON(CUSTOM_TASKS_FILE, []);
    }
  }

  getSubjects() {
    return readJSON(SUBJECTS_FILE, defaultSubjects);
  }

  initHomework() {
    const subjects = this.getSubjects();
    const homework = {};
    subjects.forEach((sub) => {
      homework[sub.id] = {
        completed: false,
        assignment: '',
        note: '',
        deadline: '',
        updatedAt: new Date().toISOString()
      };
    });
    writeJSON(HOMEWORK_FILE, homework);
    return homework;
  }

  getHomework() {
    const homework = readJSON(HOMEWORK_FILE, defaultHomework);
    const subjects = this.getSubjects();
    let updated = false;

    // Ensure all subjects exist
    subjects.forEach((sub) => {
      if (!homework[sub.id]) {
        homework[sub.id] = {
          completed: false,
          assignment: '',
          note: '',
          deadline: '',
          updatedAt: new Date().toISOString()
        };
        updated = true;
      }
    });

    if (updated) {
      writeJSON(HOMEWORK_FILE, homework);
    }

    return homework;
  }

  mergeHomework(incomingData) {
    if (!incomingData || typeof incomingData !== 'object') {
      return this.getHomework();
    }
    const current = this.getHomework();
    let updated = false;

    Object.keys(incomingData).forEach((id) => {
      const inc = incomingData[id];
      if (!inc) return;

      const curr = current[id];
      if (!curr) {
        current[id] = inc;
        updated = true;
        return;
      }

      const incTime = inc.updatedAt ? new Date(inc.updatedAt).getTime() : 0;
      const currTime = curr.updatedAt ? new Date(curr.updatedAt).getTime() : 0;

      if (incTime > currTime) {
        current[id] = { ...curr, ...inc };
        updated = true;
      } else if (incTime === currTime && inc.completed !== curr.completed) {
        current[id] = { ...curr, ...inc };
        updated = true;
      }
    });

    if (updated) {
      writeJSON(HOMEWORK_FILE, current);
    }
    return current;
  }

  toggleSubject(subjectId, forcedState = null) {
    const homework = this.getHomework();
    if (!homework[subjectId]) {
      homework[subjectId] = {
        completed: false,
        assignment: '',
        note: '',
        deadline: '',
        updatedAt: new Date().toISOString()
      };
    }

    const current = Boolean(homework[subjectId].completed);
    const newState = forcedState !== null ? Boolean(forcedState) : !current;

    homework[subjectId].completed = newState;
    homework[subjectId].updatedAt = new Date().toISOString();

    writeJSON(HOMEWORK_FILE, homework);
    return { subjectId, status: homework[subjectId] };
  }

  updateSubjectDetails(subjectId, { assignment, note, deadline }) {
    const homework = this.getHomework();
    if (!homework[subjectId]) {
      homework[subjectId] = {
        completed: false,
        assignment: '',
        note: '',
        deadline: '',
        updatedAt: new Date().toISOString()
      };
    }

    const item = homework[subjectId];
    if (assignment !== undefined) item.assignment = assignment;
    if (note !== undefined) item.note = note;
    if (deadline !== undefined) item.deadline = deadline;
    item.updatedAt = new Date().toISOString();

    writeJSON(HOMEWORK_FILE, homework);
    return item;
  }

  resetHomework() {
    const subjects = this.getSubjects();
    const homework = {};
    const now = new Date().toISOString();
    subjects.forEach((sub) => {
      homework[sub.id] = {
        completed: false,
        assignment: '',
        note: '',
        deadline: '',
        updatedAt: now
      };
    });
    writeJSON(HOMEWORK_FILE, homework);
    return homework;
  }

  markAllHomework(completed = true) {
    const homework = this.getHomework();
    const now = new Date().toISOString();
    Object.keys(homework).forEach((id) => {
      homework[id].completed = Boolean(completed);
      homework[id].updatedAt = now;
    });
    writeJSON(HOMEWORK_FILE, homework);
    return homework;
  }

  // Custom tasks management
  getCustomTasks() {
    return readJSON(CUSTOM_TASKS_FILE, []);
  }

  addCustomTask({ title, category, description, dueDate, priority }) {
    const tasks = this.getCustomTasks();
    const newTask = {
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title: title.trim(),
      category: category ? category.trim() : 'Umumiy',
      description: description ? description.trim() : '',
      dueDate: dueDate || null,
      priority: ['high', 'medium', 'low'].includes(priority) ? priority : 'medium',
      completed: false,
      createdAt: new Date().toISOString(),
      completedAt: null
    };

    tasks.unshift(newTask);
    writeJSON(CUSTOM_TASKS_FILE, tasks);
    return newTask;
  }

  updateCustomTask(id, updates) {
    const tasks = this.getCustomTasks();
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) return null;

    const task = tasks[index];
    if (updates.title !== undefined) task.title = updates.title.trim();
    if (updates.category !== undefined) task.category = updates.category.trim();
    if (updates.description !== undefined) task.description = updates.description.trim();
    if (updates.dueDate !== undefined) task.dueDate = updates.dueDate;
    if (updates.priority !== undefined) task.priority = updates.priority;
    if (updates.completed !== undefined) {
      task.completed = Boolean(updates.completed);
      task.completedAt = task.completed ? new Date().toISOString() : null;
    }
    task.updatedAt = new Date().toISOString();

    tasks[index] = task;
    writeJSON(CUSTOM_TASKS_FILE, tasks);
    return task;
  }

  deleteCustomTask(id) {
    let tasks = this.getCustomTasks();
    const prevLen = tasks.length;
    tasks = tasks.filter((t) => t.id !== id);
    writeJSON(CUSTOM_TASKS_FILE, tasks);
    return tasks.length < prevLen;
  }

  // Obsidian Markdown format generator
  getObsidianMarkdown() {
    const subjects = this.getSubjects();
    const homework = this.getHomework();
    const customTasks = this.getCustomTasks();

    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;

    let md = `# 📝 8-A Sinf Uy Ishlari (${dateStr})\n\n`;
    md += `## 📚 Maktab Fanlari\n`;

    subjects.forEach((sub) => {
      const item = homework[sub.id] || {};
      const check = item.completed ? '[x]' : '[ ]';
      const detail = item.assignment ? ` — *${item.assignment}*` : '';
      const deadline = item.deadline ? ` (Muddat: ${item.deadline})` : '';
      const note = item.note ? ` [Izoh: ${item.note}]` : '';
      md += `- ${check} **${sub.name}**${detail}${deadline}${note}\n`;
    });

    if (customTasks.length > 0) {
      md += `\n## ⚡ Qo'shimcha Shaxsiy Topshiriqlar\n`;
      customTasks.forEach((t) => {
        const check = t.completed ? '[x]' : '[ ]';
        const due = t.dueDate ? ` (Muddat: ${t.dueDate})` : '';
        md += `- ${check} ${t.title}${due}\n`;
      });
    }

    return md;
  }

  getOverview() {
    const subjects = this.getSubjects();
    const homework = this.getHomework();
    const customTasks = this.getCustomTasks();

    let completedSubjects = 0;
    subjects.forEach((sub) => {
      if (homework[sub.id] && homework[sub.id].completed) {
        completedSubjects++;
      }
    });

    const totalSubjects = subjects.length;
    const percent = totalSubjects > 0 ? Math.round((completedSubjects / totalSubjects) * 100) : 0;

    return {
      totalSubjects,
      completedSubjects,
      pendingSubjects: totalSubjects - completedSubjects,
      completionRate: percent,
      customTasksTotal: customTasks.length,
      customTasksCompleted: customTasks.filter((t) => t.completed).length,
      customTasksPending: customTasks.filter((t) => !t.completed).length
    };
  }
}

module.exports = {
  Storage: new Storage()
};
