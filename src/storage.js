const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const SUBJECTS_FILE = path.join(DATA_DIR, 'subjects.json');
const HOMEWORK_FILE = path.join(DATA_DIR, 'homework.json');
const CUSTOM_TASKS_FILE = path.join(DATA_DIR, 'custom_tasks.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJSON(filePath, defaultValue) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf-8');
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
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (innerErr) {
      console.error(`Fallback write failed for ${filePath}:`, innerErr);
      return false;
    }
  }
}

class Storage {
  constructor() {
    this.init();
  }

  init() {
    if (!fs.existsSync(HOMEWORK_FILE)) {
      this.initHomework();
    }
    if (!fs.existsSync(CUSTOM_TASKS_FILE)) {
      writeJSON(CUSTOM_TASKS_FILE, []);
    }
  }

  getSubjects() {
    return readJSON(SUBJECTS_FILE, []);
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
    const homework = readJSON(HOMEWORK_FILE, {});
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

  markAllHomework(completed = true) {
    const homework = this.getHomework();
    Object.keys(homework).forEach((id) => {
      homework[id].completed = Boolean(completed);
      homework[id].updatedAt = new Date().toISOString();
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
