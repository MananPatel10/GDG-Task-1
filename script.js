// --- State Management ---
let tasks = JSON.parse(localStorage.getItem('kanban-tasks')) || [];
let currentTheme = localStorage.getItem('kanban-theme') || 'light';

// --- DOM Elements ---
const modal = document.getElementById('taskModal');
const taskForm = document.getElementById('taskForm');
const searchInput = document.getElementById('searchInput');
const themeToggle = document.getElementById('themeToggle');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(currentTheme);
  renderTasks();
});

// --- Theme Toggle ---
themeToggle.addEventListener('click', () => {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  applyTheme(currentTheme);
});

function applyTheme(theme) {
  const icon = themeToggle.querySelector('i');
  if (theme === 'dark') {
    document.body.classList.add('dark-mode');
    icon.classList.remove('fa-moon');
    icon.classList.add('fa-sun');
  } else {
    document.body.classList.remove('dark-mode');
    icon.classList.remove('fa-sun');
    icon.classList.add('fa-moon');
  }
  localStorage.setItem('kanban-theme', theme);
}

// --- Render Tasks ---
function updateCounts() {
    const counts = { 'Todo': 0, 'In Progress': 0, 'Done': 0 };
    tasks.forEach(t => {
        if(counts[t.status] !== undefined) counts[t.status]++;
    });
    
    document.getElementById('todo-count').textContent = counts['Todo'];
    document.getElementById('inprogress-count').textContent = counts['In Progress'];
    document.getElementById('done-count').textContent = counts['Done'];
}

function renderTasks(filterText = '') {
  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(filterText.toLowerCase()) || 
    task.description.toLowerCase().includes(filterText.toLowerCase())
  );

  // Group and render tasks per column, handling Empty States
  const statuses = ['Todo', 'In Progress', 'Done'];
  
  statuses.forEach(status => {
    const listId = status.replace(/\s+/g, '') + '-list';
    const listElement = document.getElementById(listId);
    
    if (listElement) {
        listElement.innerHTML = ''; // Clear current tasks
        
        const tasksForStatus = filteredTasks.filter(t => t.status === status);
        
        if (tasksForStatus.length === 0) {
            // Display empty state if no tasks exist in this column
            listElement.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-inbox"></i><br>
                    No tasks yet
                </div>`;
        } else {
            tasksForStatus.forEach(task => {
                listElement.appendChild(createTaskElement(task));
            });
        }
    }
  });
  
  updateCounts();
}

function createTaskElement(task) {
  const div = document.createElement('div');
  div.classList.add('task-card');
  div.setAttribute('draggable', 'true');
  div.setAttribute('data-id', task.id);

  // Format the description to preserve line breaks if needed, or truncate
  const desc = task.description ? `<p>${task.description}</p>` : '';

  div.innerHTML = `
    <div class="task-header">
      <span class="priority ${task.priority.toLowerCase()}">${task.priority}</span>
      <div class="task-actions">
        <button class="btn-edit" onclick="editTask('${task.id}')" title="Edit Task"><i class="fa-solid fa-pen"></i></button>
        <button class="btn-delete" onclick="deleteTask('${task.id}')" title="Delete Task"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>
    <h3>${task.title}</h3>
    ${desc}
  `;

  // HTML5 Drag and Drop Events for the Task
  div.addEventListener('dragstart', (e) => {
    // Timeout keeps the original element looking normal while the dragged ghost looks like the card
    setTimeout(() => div.classList.add('dragging'), 0);
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  });

  div.addEventListener('dragend', () => {
    div.classList.remove('dragging');
  });

  return div;
}

// --- Drag and Drop for Columns ---
document.querySelectorAll('.column').forEach(column => {
  const taskList = column.querySelector('.task-list');

  column.addEventListener('dragover', (e) => {
    e.preventDefault(); // Required to allow dropping
    e.dataTransfer.dropEffect = 'move';
    taskList.classList.add('drag-over');
  });

  column.addEventListener('dragleave', () => {
    taskList.classList.remove('drag-over');
  });

  column.addEventListener('drop', (e) => {
    e.preventDefault();
    taskList.classList.remove('drag-over');
    
    const taskId = e.dataTransfer.getData('text/plain');
    const newStatus = column.getAttribute('data-status');
    
    // Update task status and save
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex > -1 && tasks[taskIndex].status !== newStatus) {
      tasks[taskIndex].status = newStatus;
      saveAndRender();
    }
  });
});

// --- Task CRUD Operations ---
document.getElementById('addTaskBtn').addEventListener('click', () => openModal());
document.getElementById('closeModalBtn').addEventListener('click', closeModal);

// Close modal when clicking outside
modal.addEventListener('click', (e) => {
    if(e.target === modal) closeModal();
});

function openModal(taskId = null) {
  modal.classList.remove('hidden');
  const titleEl = document.getElementById('modalTitle');
  
  if (taskId) {
    titleEl.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit Task';
    const task = tasks.find(t => t.id === taskId);
    document.getElementById('taskId').value = task.id;
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDesc').value = task.description;
    document.getElementById('taskPriority').value = task.priority;
    document.getElementById('taskStatus').value = task.status;
  } else {
    titleEl.innerHTML = '<i class="fa-solid fa-tasks"></i> New Task';
    taskForm.reset();
    document.getElementById('taskId').value = '';
    document.getElementById('taskStatus').value = 'Todo';
    document.getElementById('taskPriority').value = 'Medium';
  }
  
  // Focus title input
  setTimeout(() => document.getElementById('taskTitle').focus(), 100);
}

function closeModal() {
  modal.classList.add('hidden');
}

taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const id = document.getElementById('taskId').value;
  const newTask = {
    id: id ? id : 'task-' + Date.now().toString(), // Improved ID generator
    title: document.getElementById('taskTitle').value.trim(),
    description: document.getElementById('taskDesc').value.trim(),
    priority: document.getElementById('taskPriority').value,
    status: document.getElementById('taskStatus').value
  };

  if(!newTask.title) return; // Basic validation

  if (id) {
    tasks = tasks.map(t => t.id === id ? newTask : t);
  } else {
    tasks.push(newTask);
  }

  saveAndRender();
  closeModal();
});

// Need to attach to window object so inline HTML onclick handlers can find them
window.editTask = openModal;
window.deleteTask = (id) => {
  if (confirm('Are you sure you want to delete this task?')) {
    tasks = tasks.filter(t => t.id !== id);
    saveAndRender();
  }
};

// --- Helper Functions ---
function saveAndRender() {
  localStorage.setItem('kanban-tasks', JSON.stringify(tasks));
  renderTasks(searchInput.value);
}

// --- Filtering ---
searchInput.addEventListener('input', (e) => {
  renderTasks(e.target.value);
});