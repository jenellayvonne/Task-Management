const taskForm = document.getElementById('taskForm');
const taskList = document.getElementById('taskList');

// Fetch tasks from backend
async function fetchTasks() {
  try {
    const res = await fetch('/tasks');
    if (!res.ok) throw new Error('Failed to fetch tasks');
    const tasks = await res.json();

    taskList.innerHTML = '';

    tasks.forEach(task => {
      const li = document.createElement('li');

      li.innerHTML = `
        <div class="task-details">
          <strong>${task.name}</strong> - ${task.description || ''}<br>
          Status: ${task.status} | Start: ${task.startDate ? new Date(task.startDate).toLocaleDateString() : '-'} | Due: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
        </div>
        <div class="task-actions">
          <button onclick="updateStatus('${task._id}', '${task.status === 'pending' ? 'done' : 'pending'}')">
            Mark as ${task.status === 'pending' ? 'Done' : 'Pending'}
          </button>
          <button onclick="deleteTask('${task._id}')">Delete</button>
        </div>
      `;

      taskList.appendChild(li);
    });
  } catch (error) {
    alert(error.message);
  }
}

// Add new task
taskForm.addEventListener('submit', async e => {
  e.preventDefault();

  const formData = new FormData(taskForm);
  const taskData = {
    name: formData.get('name'),
    description: formData.get('description'),
    status: formData.get('status'),
    startDate: formData.get('startDate') || null,
    dueDate: formData.get('dueDate') || null,
  };

  try {
    const res = await fetch('/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData),
    });
    if (!res.ok) throw new Error('Failed to add task');
    taskForm.reset();
    fetchTasks();
  } catch (error) {
    alert(error.message);
  }
});

// Update task status
async function updateStatus(taskId, newStatus) {
  try {
    const res = await fetch(`/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) throw new Error('Failed to update status');
    fetchTasks();
  } catch (error) {
    alert(error.message);
  }
}

// Delete task
async function deleteTask(taskId) {
  if (!confirm('Are you sure you want to delete this task?')) return;

  try {
    const res = await fetch(`/tasks/${taskId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete task');
    fetchTasks();
  } catch (error) {
    alert(error.message);
  }
}

// Initial load
fetchTasks();
